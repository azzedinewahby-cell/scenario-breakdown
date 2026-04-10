import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import {
  createScenario,
  getScenarioById,
  getScenariosByUserId,
  updateScenarioStatus,
  deleteScenario,
  insertScenes,
  insertCharacters,
  insertSceneCharacters,
  insertDialogues,
  getScenesByScenarioId,
  getCharactersByScenarioId,
  getSceneCharactersBySceneIds,
  getDialoguesBySceneId,
  getDashboardStats,
  insertProps,
  getProps,
  insertSceneProps,
  insertSequences,
  getSequences,
  insertSequenceScenes,
  getSequenceScenes,
} from "./db";
import { parseScenarioWithLLM } from "./scenarioParser";
import { generateBreakdownHtml } from "./pdfGenerator";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  scenario: router({
    // Upload a scenario file (base64 encoded) and trigger parsing
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileBase64: z.string(),
          contentType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
        const allowed = ["pdf", "fdx", "docx"];
        if (!allowed.includes(ext)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Format non supporté. Formats acceptés : ${allowed.join(", ")}`,
          });
        }

        // Upload to S3
        const fileKey = `scenarios/${userId}/${nanoid()}-${input.fileName}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url: fileUrl } = await storagePut(fileKey, buffer, input.contentType);

        // Create scenario record
        const title = input.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        const scenarioId = await createScenario({
          userId,
          title,
          fileName: input.fileName,
          fileUrl,
          fileKey,
          fileSize: buffer.length,
          status: "processing",
        });

        // Parse asynchronously (don't block the response)
        processScenario(scenarioId, fileUrl, input.fileName).catch((err) => {
          console.error(`[Scenario] Parse error for ${scenarioId}:`, err);
        });

        return { scenarioId, status: "processing" };
      }),

    // List all scenarios for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return getScenariosByUserId(ctx.user.id);
    }),

    // Get a single scenario with full breakdown
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.id);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        return scenario;
      }),

    // Get full breakdown data for a scenario
    breakdown: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }

        const scenesData = await getScenesByScenarioId(input.scenarioId);
        const charactersData = await getCharactersByScenarioId(input.scenarioId);
        const sceneIds = scenesData.map((s) => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        // Build scene → characters map
        const charMap = new Map(charactersData.map((c) => [c.id, c.name]));
        const sceneCharMap = new Map<number, string[]>();
        for (const sc of sceneChars) {
          const arr = sceneCharMap.get(sc.sceneId) ?? [];
          const name = charMap.get(sc.characterId);
          if (name) arr.push(name);
          sceneCharMap.set(sc.sceneId, arr);
        }

        // Build dialogues per scene
        const dialoguesMap = new Map<number, { character: string; text: string }[]>();
        for (const scene of scenesData) {
          const dials = await getDialoguesBySceneId(scene.id);
          dialoguesMap.set(
            scene.id,
            dials.map((d) => ({
              character: charMap.get(d.characterId ?? 0) ?? "Inconnu",
              text: d.text ?? "",
            }))
          );
        }

        const scenesWithDetails = scenesData.map((scene) => ({
          ...scene,
          characters: sceneCharMap.get(scene.id) ?? [],
          dialogues: dialoguesMap.get(scene.id) ?? [],
        }));

        return {
          scenario,
          scenes: scenesWithDetails,
          characters: charactersData,
          uniqueLocations: Array.from(new Set(scenesData.map((s) => s.location).filter((l): l is string => l !== null))),
        };
      }),

    // Delete a scenario and all related data
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.id);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        await deleteScenario(input.id);
        return { success: true };
      }),

    // Export breakdown as CSV text
    exportCsv: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }

        const scenesData = await getScenesByScenarioId(input.scenarioId);
        const charactersData = await getCharactersByScenarioId(input.scenarioId);
        const sceneIds = scenesData.map((s) => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        const charMap = new Map(charactersData.map((c) => [c.id, c.name]));
        const sceneCharMap = new Map<number, string[]>();
        for (const sc of sceneChars) {
          const arr = sceneCharMap.get(sc.sceneId) ?? [];
          const name = charMap.get(sc.characterId);
          if (name) arr.push(name);
          sceneCharMap.set(sc.sceneId, arr);
        }

        // Build CSV
        const header = "Séquence;INT/EXT;Lieu;Jour/Nuit;Description;Personnages";
        const rows = scenesData.map((scene) => {
          const chars = (sceneCharMap.get(scene.id) ?? []).join(", ");
          const escapeCsv = (val: string | null) => {
            if (!val) return "";
            const escaped = val.replace(/"/g, '""');
            return `"${escaped}"`;
          };
          return [
            scene.sceneNumber,
            escapeCsv(scene.intExt),
            escapeCsv(scene.location),
            escapeCsv(scene.dayNight),
            escapeCsv(scene.description),
            escapeCsv(chars),
          ].join(";");
        });

        return { csv: [header, ...rows].join("\n"), fileName: `${scenario.title}-depouillement.csv` };
      }),

    // Export breakdown as styled HTML for PDF generation (client-side print)
    exportPdfHtml: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sc\u00e9nario introuvable" });
        }

        const scenesData = await getScenesByScenarioId(input.scenarioId);
        const charactersData = await getCharactersByScenarioId(input.scenarioId);
        const sceneIds = scenesData.map((s) => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        const charMap = new Map(charactersData.map((c) => [c.id, c.name]));
        const sceneCharMap = new Map<number, string[]>();
        for (const sc of sceneChars) {
          const arr = sceneCharMap.get(sc.sceneId) ?? [];
          const name = charMap.get(sc.characterId);
          if (name) arr.push(name);
          sceneCharMap.set(sc.sceneId, arr);
        }

        const dialoguesMap = new Map<number, { character: string; text: string }[]>();
        for (const scene of scenesData) {
          const dials = await getDialoguesBySceneId(scene.id);
          dialoguesMap.set(
            scene.id,
            dials.map((d) => ({
              character: charMap.get(d.characterId ?? 0) ?? "Inconnu",
              text: d.text ?? "",
            }))
          );
        }

        const pdfScenes = scenesData.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          intExt: scene.intExt,
          location: scene.location,
          dayNight: scene.dayNight,
          description: scene.description,
          characters: sceneCharMap.get(scene.id) ?? [],
          dialogues: dialoguesMap.get(scene.id) ?? [],
        }));

        const uniqueLocations = Array.from(
          new Set(scenesData.map((s) => s.location).filter((l): l is string => l !== null))
        );

        const totalDialogues = pdfScenes.reduce((sum, s) => sum + s.dialogues.length, 0);

        const html = generateBreakdownHtml({
          title: scenario.title,
          fileName: scenario.fileName,
          date: new Date(scenario.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          scenes: pdfScenes,
          characters: charactersData.map((c) => c.name ?? ""),
          uniqueLocations,
          stats: {
            totalScenes: pdfScenes.length,
            totalCharacters: charactersData.length,
            totalLocations: uniqueLocations.length,
            totalDialogues,
          },
        });

        return { html, fileName: `${scenario.title}-depouillement.pdf` };
      }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),
  }),

  breakdown: router({
    // Get all characters with scene counts
    getCharacters: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        const characters = await getCharactersByScenarioId(input.scenarioId);
        const scenes = await getScenesByScenarioId(input.scenarioId);
        const sceneIds = scenes.map((s) => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);
        
        const charSceneCount = new Map<number, number>();
        for (const sc of sceneChars) {
          charSceneCount.set(sc.characterId, (charSceneCount.get(sc.characterId) ?? 0) + 1);
        }
        
        return characters.map((c) => ({
          ...c,
          sceneCount: charSceneCount.get(c.id) ?? 0,
        }));
      }),

    // Get all locations with scene counts
    getLocations: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        const scenes = await getScenesByScenarioId(input.scenarioId);
        
        const locationMap = new Map<string, { count: number; dayNight: Set<string> }>();
        for (const scene of scenes) {
          if (scene.location) {
            const entry = locationMap.get(scene.location) ?? { count: 0, dayNight: new Set() };
            entry.count++;
            if (scene.dayNight) entry.dayNight.add(scene.dayNight);
            locationMap.set(scene.location, entry);
          }
        }
        
        return Array.from(locationMap.entries()).map(([name, data]) => ({
          name,
          sceneCount: data.count,
          dayNightOptions: Array.from(data.dayNight),
        }));
      }),

    // Get all props
    getProps: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        return getProps(input.scenarioId);
      }),

    // Get all sequences (auto-create from scenes if none exist yet)
    getSequences: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        
        // Auto-create sequences from scenes if none exist yet (migration for old scenarios)
        const existing = await getSequences(input.scenarioId);
        if (existing.length === 0 && scenario.status === "completed") {
          const scenes = await getScenesByScenarioId(input.scenarioId);
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sequenceName = `${scene.intExt ? scene.intExt + ". " : ""}${scene.location || "Scène " + scene.sceneNumber}`;
            await insertSequences([{ scenarioId: input.scenarioId, name: sequenceName, orderIndex: i }]);
          }
          const created = await getSequences(input.scenarioId);
          for (let i = 0; i < scenes.length && i < created.length; i++) {
            const seq = created[i];
            const scene = scenes[i];
            if (seq && scene) {
              await insertSequenceScenes([{ sequenceId: seq.id, sceneId: scene.id }]);
            }
          }
          return getSequences(input.scenarioId);
        }
        
        return existing;
      }),

    // Create a new sequence
    createSequence: protectedProcedure
      .input(z.object({ scenarioId: z.number(), name: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        const sequences = await getSequences(input.scenarioId);
        const orderIndex = sequences.length;
        await insertSequences([{ scenarioId: input.scenarioId, name: input.name, orderIndex }]);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Background processing ───────────────────────────────────────────────────

async function processScenario(scenarioId: number, fileUrl: string, fileName: string) {
  try {
    await updateScenarioStatus(scenarioId, "processing");

    const parsed = await parseScenarioWithLLM(fileUrl, fileName);

    // Update scenario title if LLM found a better one
    if (parsed.title) {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (db) {
        const { scenarios } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(scenarios).set({ title: parsed.title }).where(eq(scenarios.id, scenarioId));
      }
    }

    // Insert characters
    const charNameToId = new Map<string, number>();
    if (parsed.characters.length > 0) {
      const charIds = await insertCharacters(
        parsed.characters.map((c) => ({ scenarioId, name: c.name, gender: c.gender, age: c.age }))
      );
      parsed.characters.forEach((c, i) => {
        charNameToId.set(c.name.toUpperCase(), charIds[i]);
      });
    }

    // Insert scenes, scene-characters, and dialogues
    const uniqueLocations = new Set<string>();
    for (const scene of parsed.scenes) {
      const sceneIds = await insertScenes([
        {
          scenarioId,
          sceneNumber: scene.sceneNumber,
          intExt: scene.intExt,
          location: scene.location,
          dayNight: scene.dayNight,
          description: scene.description,
        },
      ]);
      const sceneId = sceneIds[0];

      if (scene.location) uniqueLocations.add(scene.location);

      // Link characters to scene
      const scLinks: { sceneId: number; characterId: number }[] = [];
      for (const charName of scene.characters) {
        const charId = charNameToId.get(charName.toUpperCase());
        if (charId) {
          scLinks.push({ sceneId, characterId: charId });
        }
      }
      if (scLinks.length > 0) {
        await insertSceneCharacters(scLinks);
      }

      // Insert dialogues
      if (scene.dialogues.length > 0) {
        await insertDialogues(
          scene.dialogues.map((d, idx) => ({
            sceneId,
            characterId: charNameToId.get(d.character.toUpperCase()) ?? null,
            text: d.text,
            orderIndex: idx,
          }))
        );
      }
    }

    // Insert props
    if (parsed.props && parsed.props.length > 0) {
      const propIds = await insertProps(
        parsed.props.map((p) => ({ scenarioId, name: p }))
      );
    }

    // Create sequences for each scene
    const scenes = await getScenesByScenarioId(scenarioId);
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sequenceName = `${scene.intExt ? scene.intExt + ". " : ""}${scene.location || "Scène " + scene.sceneNumber}`;
      await insertSequences([{
        scenarioId,
        name: sequenceName,
        orderIndex: i,
      }]);
    }
    
    // Link scenes to sequences
    const updatedSequences = await getSequences(scenarioId);
    for (let i = 0; i < scenes.length && i < updatedSequences.length; i++) {
      const scene = scenes[i];
      const sequence = updatedSequences[i];
      if (sequence && sequence.id) {
        await insertSequenceScenes([{ sequenceId: sequence.id, sceneId: scene.id }]);
      }
    }

    await updateScenarioStatus(scenarioId, "completed", {
      sceneCount: parsed.scenes.length,
      characterCount: parsed.characters.length,
      locationCount: uniqueLocations.size,
    });
  } catch (err: any) {
    console.error(`[Scenario] Processing failed for ${scenarioId}:`, err);
    await updateScenarioStatus(scenarioId, "error", {
      errorMessage: err?.message ?? "Erreur inconnue lors du traitement",
    });
  }
}
