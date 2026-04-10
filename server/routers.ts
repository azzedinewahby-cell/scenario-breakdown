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
  updateSequenceSummary,
  getSequencesForProp,
  getSequencesForCharacter,
  updateScenarioSynopsis,
  getCharactersForSequence,
  getPropsForSequence,
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
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        await deleteScenario(input.scenarioId);
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
        
        // Return existing props
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
              // Generate summary in background (non-blocking)
              (async () => {
                try {
                  const sceneText = scene.description || "";
                  if (sceneText.trim().length > 10) {
                    const { invokeLLM } = await import("./_core/llm");
                    const summaryResp = await invokeLLM({
                      messages: [
                        { role: "system", content: "Tu es un assistant de production cinema. Resume la scene suivante en 1 ou 2 phrases courtes et precises, en francais, de maniere factuelle (qui fait quoi, ou)." },
                        { role: "user", content: sceneText.slice(0, 1500) },
                      ],
                    });
                    const rawContent = summaryResp?.choices?.[0]?.message?.content;
                    const summary = typeof rawContent === "string" ? rawContent.trim() : "";
                    if (summary) await updateSequenceSummary(seq.id, summary);
                  }
                } catch (e) {
                  console.error("[Summary generation failed]", e);
                }
              })().catch(() => {})
            }
          }
          return getSequences(input.scenarioId);
        }
        
        return existing;
      }),

    // Get sequences for a specific prop
    getSequencesForProp: protectedProcedure
      .input(z.object({ propId: z.number() }))
      .query(async ({ input }) => {
        // Trigger automatic backfill if needed (non-blocking)
        backfillScenePropsForProp(input.propId).catch(console.error);
        return getSequencesForProp(input.propId);
      }),

    // Get sequences for a specific character
    getSequencesForCharacter: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => {
        return getSequencesForCharacter(input.characterId);
      }),

    // Get characters for a specific sequence
    getCharactersForSequence: protectedProcedure
      .input(z.object({ sequenceId: z.number() }))
      .query(async ({ input }) => {
        return getCharactersForSequence(input.sequenceId);
      }),

    // Get props for a specific sequence
    getPropsForSequence: protectedProcedure
      .input(z.object({ sequenceId: z.number() }))
      .query(async ({ input }) => {
        return getPropsForSequence(input.sequenceId);
      }),

    // Generate or get synopsis for a scenario
    getSynopsis: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scénario introuvable" });
        }
        // Return cached synopsis if available
        if (scenario.synopsis) {
          return { synopsis: scenario.synopsis, generating: false };
        }
        // Trigger async generation
        generateSynopsis(input.scenarioId).catch(console.error);
        return { synopsis: null, generating: true };
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
    const propNameToId = new Map<string, number>();
    if (parsed.props && parsed.props.length > 0) {
      const propIds = await insertProps(
        parsed.props.map((p) => ({ scenarioId, name: p }))
      );
      parsed.props.forEach((p, i) => {
        propNameToId.set(p.toUpperCase(), propIds[i]);
      });
    }

    // Create sequences for each scene with LLM-generated summary
    const scenes = await getScenesByScenarioId(scenarioId);

    // Associate props to scenes using LLM
    if (parsed.props.length > 0 && scenes.length > 0) {
      const { invokeLLM } = await import("./_core/llm");
      const propsStr = parsed.props.join(", ");
      
      for (const scene of scenes) {
        const sceneText = scene.description || "";
        if (sceneText.trim().length > 10) {
          try {
            const resp = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `Tu es un assistant de production cinéma. Analyse la description de scène et identifie quels accessoires de la liste fournie sont utilisés dans cette scène. Réponds UNIQUEMENT avec un JSON valide: {"props": ["accessoire1", "accessoire2"]}`
                },
                {
                  role: "user",
                  content: `Scène: ${sceneText.slice(0, 1000)}\n\nAccessoires disponibles: ${propsStr}`
                }
              ]
            });
            
            const content = resp?.choices?.[0]?.message?.content;
            if (content && typeof content === "string") {
              try {
                const parsed_props = JSON.parse(content);
                if (parsed_props.props && Array.isArray(parsed_props.props)) {
                  const sceneProps: { sceneId: number; propId: number }[] = [];
                  for (const propName of parsed_props.props) {
                    const propId = propNameToId.get(propName.toUpperCase());
                    if (propId) {
                      sceneProps.push({ sceneId: scene.id, propId });
                    }
                  }
                  if (sceneProps.length > 0) {
                    await insertSceneProps(sceneProps);
                  }
                }
              } catch (e) {
                // Non-blocking: skip if JSON parsing fails
              }
            }
          } catch (e) {
            // Non-blocking: skip if LLM fails
          }
        }
      }
    }
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sequenceName = `${scene.intExt ? scene.intExt + ". " : ""}${scene.location || "Sc\u00e8ne " + scene.sceneNumber}`;
      await insertSequences([{
        scenarioId,
        name: sequenceName,
        orderIndex: i,
      }]);
    }
    
    // Link scenes to sequences and generate summaries
    const updatedSequences = await getSequences(scenarioId);
    for (let i = 0; i < scenes.length && i < updatedSequences.length; i++) {
      const scene = scenes[i];
      const sequence = updatedSequences[i];
      if (sequence && sequence.id) {
        await insertSequenceScenes([{ sequenceId: sequence.id, sceneId: scene.id }]);
        // Generate a short summary for this scene/sequence
        try {
          const sceneText = scene.description || "";
          if (sceneText.trim().length > 10) {
            const { invokeLLM } = await import("./_core/llm");
            const summaryResp = await invokeLLM({
              messages: [
                { role: "system", content: "Tu es un assistant de production cin\u00e9ma. R\u00e9sume la sc\u00e8ne suivante en 1 ou 2 phrases courtes et pr\u00e9cises, en fran\u00e7ais, de mani\u00e8re factuelle (qui fait quoi, o\u00f9)." },
                { role: "user", content: sceneText.slice(0, 1500) },
              ],
            });
            const rawContent = summaryResp?.choices?.[0]?.message?.content;
            const summary = typeof rawContent === "string" ? rawContent.trim() : "";
            if (summary) await updateSequenceSummary(sequence.id, summary);
          }
        } catch (e) {
          // Non-blocking: skip summary if LLM fails
        }
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

// ─── Synopsis generation ─────────────────────────────────────────────────────

async function generateSynopsis(scenarioId: number) {
  try {
    const scenario = await getScenarioById(scenarioId);
    if (!scenario) return;

    // Get all scenes to build a full picture
    const scenes = await getScenesByScenarioId(scenarioId);
    if (scenes.length === 0) return;

    // Build a text summary of all scenes
    const scenesText = scenes
      .map((s, i) => `Scène ${i + 1} (${s.intExt || ""} ${s.location || ""} - ${s.dayNight || ""}): ${s.description || ""}`)
      .join("\n\n");

    const { invokeLLM } = await import("./_core/llm");
    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Tu es un assistant de production cinéma. À partir de la liste des scènes d'un scénario, rédige un synopsis complet et détaillé en français. 
Le synopsis doit:
- Présenter les personnages principaux et leurs enjeux
- Raconter l'histoire de manière chronologique
- Mettre en valeur les moments clés et les retournements de situation
- Être rédigé dans un style narratif fluide et professionnel
- Faire entre 300 et 600 mots`,
        },
        {
          role: "user",
          content: `Titre: ${scenario.title}\n\nScènes du scénario:\n\n${scenesText.slice(0, 8000)}`,
        },
      ],
    });

    const rawContent = resp?.choices?.[0]?.message?.content;
    const synopsis = typeof rawContent === "string" ? rawContent.trim() : "";
    if (synopsis) {
      await updateScenarioSynopsis(scenarioId, synopsis);
    }
  } catch (err) {
    console.error(`[Synopsis] Generation failed for scenario ${scenarioId}:`, err);
  }
}


// Backfill scene_props for a prop if not already done
async function backfillScenePropsForProp(propId: number) {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return;

    const schema = await import("../drizzle/schema");
    const sceneProps = schema.sceneProps;
    const props = schema.props;
    const scenes = schema.scenes;
    const { eq, count } = await import("drizzle-orm");

    // Check if this prop already has scene associations
    const existing = await db.select({ count: count() }).from(sceneProps).where(eq(sceneProps.propId, propId));
    if (existing[0]?.count > 0) return; // Already backfilled

    // Get the prop details
    const prop = await db.select().from(props).where(eq(props.id, propId)).limit(1);
    if (!prop || prop.length === 0) return;

    const propName = prop[0].name;
    const scenarioId = prop[0].scenarioId;

    // Get all scenes for this scenario
    const allScenes = await db.select().from(scenes).where(eq(scenes.scenarioId, scenarioId));
    if (allScenes.length === 0) return;

    // Use LLM to associate prop to scenes
    const { invokeLLM } = await import("./_core/llm");
    const scenePropsToInsert: { sceneId: number; propId: number }[] = [];

    for (const scene of allScenes) {
      const sceneText = scene.description || "";
      if (sceneText.trim().length > 10) {
        try {
          const resp = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Tu es un assistant de production cinéma. Analyse la description de scène et détermine si l'accessoire "${propName}" est utilisé dans cette scène. Réponds UNIQUEMENT avec un JSON valide: {"used": true} ou {"used": false}`
              },
              {
                role: "user",
                content: `Accessoire: ${propName}\n\nDescription de scène: ${sceneText.slice(0, 1000)}`
              }
            ]
          });

          const content = resp?.choices?.[0]?.message?.content;
          if (content && typeof content === "string") {
            try {
              const result = JSON.parse(content);
              if (result.used === true) {
                scenePropsToInsert.push({ sceneId: scene.id, propId });
              }
            } catch (e) {
              // Skip if JSON parsing fails
            }
          }
        } catch (e) {
          // Skip if LLM fails
        }
      }
    }

    // Insert all scene_props at once
    if (scenePropsToInsert.length > 0) {
      await db.insert(sceneProps).values(scenePropsToInsert);
    }
  } catch (e) {
    console.error("[Backfill scene_props failed]", e);
  }
}
