import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { getUserByEmail, createUserWithPassword, getPasswordHash } from "./db";
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
  calculateAndSaveScenarioDuration,
  getScenarioDuration,
} from "./db";
import { parseScenarioWithLLM } from "./scenarioParser";
import { generateBreakdownHtml } from "./pdfGenerator";
import { invokeLLM } from "./_core/llm";
import { searchBySiret, searchBySiren, formatAddress } from "./siretService";
import { getDb } from "./db";
import { budgets, props } from "../drizzle/schema";
import { eq } from "drizzle-orm";
// ─── Budget helpers ───────────────────────────────────────────────────────────
async function getBudgetForScenario(scenarioId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(budgets)
    .where(eq(budgets.scenarioId, scenarioId))
    .limit(1);
  return rows[0] ?? null;
}

async function saveBudget(
  scenarioId: number,
  content: string,
  shootingDays: number,
  pagesPerDay: number,
  totalEco: number,
  totalConfort: number
) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getBudgetForScenario(scenarioId);
  if (existing) {
    await db
      .update(budgets)
      .set({
        content,
        shootingDays,
        pagesPerDay,
        totalBudgetEco: totalEco,
        totalBudgetConfort: totalConfort,
      })
      .where(eq(budgets.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db.insert(budgets).values({
      scenarioId,
      content,
      shootingDays,
      pagesPerDay,
      totalBudgetEco: totalEco,
      totalBudgetConfort: totalConfort,
    });
    return (result as any).insertId;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createHash } = await import("crypto");
        const user = await getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou mot de passe incorrect" });
        const hash = await getPasswordHash(user.openId);
        const inputHash = createHash("sha256").update(input.password).digest("hex");
        if (!hash || hash !== inputHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou mot de passe incorrect" });
        const { signJWT } = await import("./_core/jwt");
        const { ENV } = await import("./_core/env");
        const token = signJWT({ openId: user.openId, name: user.name ?? "" }, ENV.cookieSecret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createHash } = await import("crypto");
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Cet email est déjà utilisé" });
        const passwordHash = createHash("sha256").update(input.password).digest("hex");
        const user = await createUserWithPassword(input.email, input.name, passwordHash);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erreur lors de la création du compte" });
        const { signJWT } = await import("./_core/jwt");
        const { ENV } = await import("./_core/env");
        const token = signJWT({ openId: user.openId, name: user.name ?? "" }, ENV.cookieSecret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

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
        const { url: fileUrl } = await storagePut(
          fileKey,
          buffer,
          input.contentType
        );

        // Create scenario record
        const title = input.fileName
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]/g, " ");
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
        processScenario(scenarioId, fileUrl, input.fileName).catch(err => {
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        return scenario;
      }),

    // Get full breakdown data for a scenario
    breakdown: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }

        const scenesData = await getScenesByScenarioId(input.scenarioId);
        const charactersData = await getCharactersByScenarioId(
          input.scenarioId
        );
        const sceneIds = scenesData.map(s => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        // Build scene → characters map
        const charMap = new Map(charactersData.map(c => [c.id, c.name]));
        const sceneCharMap = new Map<number, string[]>();
        for (const sc of sceneChars) {
          const arr = sceneCharMap.get(sc.sceneId) ?? [];
          const name = charMap.get(sc.characterId);
          if (name) arr.push(name);
          sceneCharMap.set(sc.sceneId, arr);
        }

        // Build dialogues per scene
        const dialoguesMap = new Map<
          number,
          { character: string; text: string }[]
        >();
        for (const scene of scenesData) {
          const dials = await getDialoguesBySceneId(scene.id);
          dialoguesMap.set(
            scene.id,
            dials.map(d => ({
              character: charMap.get(d.characterId ?? 0) ?? "Inconnu",
              text: d.text ?? "",
            }))
          );
        }

        const scenesWithDetails = scenesData.map(scene => ({
          ...scene,
          characters: sceneCharMap.get(scene.id) ?? [],
          dialogues: dialoguesMap.get(scene.id) ?? [],
        }));

        return {
          scenario,
          scenes: scenesWithDetails,
          characters: charactersData,
          uniqueLocations: Array.from(
            new Set(
              scenesData
                .map(s => s.location)
                .filter((l): l is string => l !== null)
            )
          ),
        };
      }),

    // Delete a scenario and all related data
    delete: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }

        const scenesData = await getScenesByScenarioId(input.scenarioId);
        const charactersData = await getCharactersByScenarioId(
          input.scenarioId
        );
        const sceneIds = scenesData.map(s => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        const charMap = new Map(charactersData.map(c => [c.id, c.name]));
        const sceneCharMap = new Map<number, string[]>();
        for (const sc of sceneChars) {
          const arr = sceneCharMap.get(sc.sceneId) ?? [];
          const name = charMap.get(sc.characterId);
          if (name) arr.push(name);
          sceneCharMap.set(sc.sceneId, arr);
        }

        // Build CSV
        const header =
          "Séquence;INT/EXT;Lieu;Jour/Nuit;Description;Personnages";
        const rows = scenesData.map(scene => {
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

        return {
          csv: [header, ...rows].join("\n"),
          fileName: `${scenario.title}-depouillement.csv`,
        };
      }),

    // Export breakdown as styled HTML for PDF generation (client-side print)
    exportPdfHtml: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sc\u00e9nario introuvable",
          });
        }

        const scenesData = await getScenesByScenarioId(input.scenarioId);
        const charactersData = await getCharactersByScenarioId(
          input.scenarioId
        );
        const sceneIds = scenesData.map(s => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        const charMap = new Map(charactersData.map(c => [c.id, c.name]));
        const sceneCharMap = new Map<number, string[]>();
        for (const sc of sceneChars) {
          const arr = sceneCharMap.get(sc.sceneId) ?? [];
          const name = charMap.get(sc.characterId);
          if (name) arr.push(name);
          sceneCharMap.set(sc.sceneId, arr);
        }

        const dialoguesMap = new Map<
          number,
          { character: string; text: string }[]
        >();
        for (const scene of scenesData) {
          const dials = await getDialoguesBySceneId(scene.id);
          dialoguesMap.set(
            scene.id,
            dials.map(d => ({
              character: charMap.get(d.characterId ?? 0) ?? "Inconnu",
              text: d.text ?? "",
            }))
          );
        }

        const pdfScenes = scenesData.map(scene => ({
          sceneNumber: scene.sceneNumber,
          intExt: scene.intExt,
          location: scene.location,
          dayNight: scene.dayNight,
          description: scene.description,
          characters: sceneCharMap.get(scene.id) ?? [],
          dialogues: dialoguesMap.get(scene.id) ?? [],
        }));

        const uniqueLocations = Array.from(
          new Set(
            scenesData
              .map(s => s.location)
              .filter((l): l is string => l !== null)
          )
        );

        // Get props (accessories) for this scenario
        const db = await getDb();
        if (!db) return { html: "", fileName: "" };
        const propsData = await db
          .select()
          .from(props)
          .where(eq(props.scenarioId, input.scenarioId));
        const uniqueProps = Array.from(
          new Set(propsData.map((p: any) => p.name as string).filter((n: string): n is string => n !== null))
        );

        const totalDialogues = pdfScenes.reduce(
          (sum, s) => sum + s.dialogues.length,
          0
        );

        const durationSec = scenario.durationSeconds ?? 0;
        const durationLabel =
          durationSec > 0
            ? `${Math.floor(durationSec / 60)}min ${durationSec % 60 > 0 ? `${durationSec % 60}s` : ""}`.trim()
            : null;
        const html = generateBreakdownHtml({
          title: scenario.title,
          fileName: scenario.fileName,
          date: new Date(scenario.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          screenwriterName: scenario.screenwriterName ?? null,
          durationLabel,
          scenes: pdfScenes,
          characters: charactersData.map(c => c.name ?? ""),
          uniqueLocations,
          props: uniqueProps as string[],
          stats: {
            totalScenes: pdfScenes.length,
            totalCharacters: charactersData.length,
            totalLocations: uniqueLocations.length,
            totalDialogues,
            totalProps: uniqueProps.length,
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const characters = await getCharactersByScenarioId(input.scenarioId);
        const scenes = await getScenesByScenarioId(input.scenarioId);
        const sceneIds = scenes.map(s => s.id);
        const sceneChars = await getSceneCharactersBySceneIds(sceneIds);

        const charSceneCount = new Map<number, number>();
        for (const sc of sceneChars) {
          charSceneCount.set(
            sc.characterId,
            (charSceneCount.get(sc.characterId) ?? 0) + 1
          );
        }

        return characters.map(c => ({
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const scenes = await getScenesByScenarioId(input.scenarioId);

        const locationMap = new Map<
          string,
          { count: number; dayNight: Set<string> }
        >();
        for (const scene of scenes) {
          if (scene.location) {
            const entry = locationMap.get(scene.location) ?? {
              count: 0,
              dayNight: new Set(),
            };
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }

        // Auto-create sequences from scenes if none exist yet (migration for old scenarios)
        const existing = await getSequences(input.scenarioId);
        if (existing.length === 0 && scenario.status === "completed") {
          const scenes = await getScenesByScenarioId(input.scenarioId);
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sequenceName = `${scene.intExt ? scene.intExt + ". " : ""}${scene.location || "Scène " + scene.sceneNumber}`;
            await insertSequences([
              {
                scenarioId: input.scenarioId,
                name: sequenceName,
                orderIndex: i,
              },
            ]);
          }
          const created = await getSequences(input.scenarioId);
          for (let i = 0; i < scenes.length && i < created.length; i++) {
            const seq = created[i];
            const scene = scenes[i];
            if (seq && scene) {
              await insertSequenceScenes([
                { sequenceId: seq.id, sceneId: scene.id },
              ]);
              // Generate summary in background (non-blocking)
              (async () => {
                try {
                  const sceneText = scene.description || "";
                  if (sceneText.trim().length > 10) {
                    const { invokeLLM } = await import("./_core/llm");
                    const summaryResp = await invokeLLM({
                      messages: [
                        {
                          role: "system",
                          content:
                            "Tu es un assistant de production cinema. Resume la scene suivante en 1 ou 2 phrases courtes et precises, en francais, de maniere factuelle (qui fait quoi, ou).",
                        },
                        { role: "user", content: sceneText.slice(0, 1500) },
                      ],
                    });
                    const rawContent =
                      summaryResp?.choices?.[0]?.message?.content;
                    const summary =
                      typeof rawContent === "string" ? rawContent.trim() : "";
                    if (summary) await updateSequenceSummary(seq.id, summary);
                  }
                } catch (e) {
                  console.error("[Summary generation failed]", e);
                }
              })().catch(() => {});
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
        // Trigger automatic backfill if needed (non-blocking, in background)
        backfillScenePropsForProp(input.propId).catch(e =>
          console.error("[Backfill failed]", e)
        );
        // Return immediately with whatever sequences are already in the database
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

    // Calculate and save scenario duration
    calculateDuration: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scenario not found",
          });
        }
        const durationSeconds = await calculateAndSaveScenarioDuration(
          input.scenarioId
        );
        return {
          durationSeconds,
          totalMinutes: Math.floor(durationSeconds / 60),
          totalSeconds_remainder: durationSeconds % 60,
        };
      }),

    // Get scenario duration
    getDuration: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scenario not found",
          });
        }
        const duration = await getScenarioDuration(input.scenarioId);
        return (
          duration || {
            totalSeconds: 0,
            totalMinutes: 0,
            totalSeconds_remainder: 0,
          }
        );
      }),

    // Generate or get synopsis for a scenario
    getSynopsis: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const sequences = await getSequences(input.scenarioId);
        const orderIndex = sequences.length;
        await insertSequences([
          { scenarioId: input.scenarioId, name: input.name, orderIndex },
        ]);
        return { success: true };
      }),
    // Generate technical breakdown (découpage technique) for a scenario
    generateTechnicalBreakdown: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const scenes = await getScenesByScenarioId(input.scenarioId);
        const characters = await getCharactersByScenarioId(input.scenarioId);
        if (scenes.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucune scène trouvée pour ce scénario",
          });
        }
        const scenesText = scenes
          .map((s, i) => {
            const dialogues = (s as any).dialogueCount || 0;
            return `SCÈNE ${i + 1}: ${s.intExt || "?"} ${s.location || "lieu inconnu"} - ${s.dayNight || "JOUR"}
Description: ${s.description?.substring(0, 300) || ""}
Personnages: ${(s as any).characters?.join(", ") || ""}`;
          })
          .join("\n\n");
        const prompt = `Tu es un expert en direction de production cinéma en France. Analyse ce découpage scène par scène et propose un découpage technique professionnel.

TITRE: ${scenario.title}
NOMBRE DE SCÈNES: ${scenes.length}
NOMBRE DE PERSONNAGES: ${characters.length}
NOMBRE DE DÉCORS: ${scenario.locationCount || 0}

SCÈNES:
${scenesText}

Génère un découpage technique complet en JSON avec cette structure:
{
  "summary": {
    "totalShootingDays": <nombre total de jours>,
    "averagePagesPerDay": <moyenne pages/jour>,
    "heavyDays": <journées lourdes>,
    "lightDays": <journées légères>,
    "totalScenes": ${scenes.length},
    "intScenes": <nombre INT>,
    "extScenes": <nombre EXT>,
    "dayScenes": <nombre JOUR>,
    "nightScenes": <nombre NUIT>,
    "complexScenes": <nombre scènes complexes>,
    "simpleScenes": <nombre scènes simples>
  },
  "scenes": [
    {
      "sceneNumber": <numéro>,
      "intExt": "INT" ou "EXT",
      "location": "<lieu>",
      "dayNight": "JOUR" ou "NUIT",
      "complexity": "simple" ou "moyenne" ou "lourde",
      "estimatedPlans": <nombre de plans estimé>,
      "estimatedHours": <heures de tournage estimées>,
      "hasDialogue": true/false,
      "hasAction": true/false,
      "hasFX": true/false,
      "hasCascade": true/false,
      "hasFiguration": true/false,
      "notes": "<notes de production>"
    }
  ],
  "shootingDays": [
    {
      "dayNumber": <numéro du jour>,
      "type": "légère" ou "standard" ou "lourde",
      "scenes": [<numéros de scènes>],
      "location": "<décor principal>",
      "estimatedPages": <pages estimées>,
      "notes": "<notes>"
    }
  ],
  "productionNotes": {
    "feasibility": "<analyse de faisabilité>",
    "mainRisks": ["<risque 1>", "<risque 2>"],
    "optimizations": ["<optimisation 1>", "<optimisation 2>"],
    "specialRequirements": ["<besoin spécial 1>"]
  }
}
Règles:
- 5-8 pages/jour pour dialogues simples
- 2-4 pages/jour pour mise en scène complexe
- 1-2 pages/jour pour action/nuit/FX
- Ajuste selon nombre de décors, déplacements, nuit vs jour
- Réponds UNIQUEMENT avec le JSON valide`;
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Tu es un expert en production cinématographique française. Réponds uniquement en JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const rawContent = response?.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : null;
        if (!raw)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erreur LLM",
          });
        let parsedBreakdown: any;
        try {
          parsedBreakdown = JSON.parse(raw);
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Réponse LLM invalide",
          });
        }
        return { success: true, data: parsedBreakdown };
      }),

    // Analyze structure (3 acts, obstacles, climax, denouement, recommendations)
    analyzeStructure: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const scenes = await getScenesByScenarioId(input.scenarioId);
        if (scenes.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucune scène trouvée pour ce scénario",
          });
        }

        // Build detailed scenes text for LLM analysis
        const scenesText = scenes
          .map((s, i) => {
            return `Scène ${i + 1}: ${s.intExt || "?"} ${s.location || "lieu inconnu"} - ${s.dayNight || "JOUR"}\nDescription: ${s.description || ""}`;
          })
          .join("\n\n");

        const prompt = `Tu es un expert en dramaturgie et en analyse de scénarios. Analyse la structure narrative de ce scénario selon le modèle classique en 3 actes.

TITRE: ${scenario.title}
NOMBRE DE SCÈNES: ${scenes.length}

SCÈNES:
${scenesText.slice(0, 12000)}

Génère une analyse structurelle complète en JSON avec cette structure:
{
  "acte1": {
    "titre": "Exposition",
    "scenesRange": "scènes X à Y",
    "situationInitiale": "description de la situation de départ",
    "protagoniste": "description du protagoniste et ses enjeux",
    "incidentPerturbateur": "description de l'élément déclencheur",
    "analyse": "analyse détaillée de cet acte"
  },
  "acte2": {
    "titre": "Confrontation",
    "scenesRange": "scènes X à Y",
    "developpement": "description du développement de l'action",
    "monteeEnTension": "description de la montée en tension",
    "pointMilieu": "description du point de retournement au milieu",
    "analyse": "analyse détaillée de cet acte"
  },
  "acte3": {
    "titre": "Résolution",
    "scenesRange": "scènes X à Y",
    "climax": "description du climax",
    "denouement": "description du dénouement",
    "analyse": "analyse détaillée de cet acte"
  },
  "obstacles": [
    {
      "scene": "numéro de scène",
      "nature": "obstacle externe/interne",
      "description": "description de l'obstacle",
      "impactDramatique": "impact sur la narration"
    }
  ],
  "climax": {
    "scene": "numéro de scène",
    "description": "description du moment de tension maximale",
    "pourquoiPointBascule": "explication de pourquoi c'est le point de bascule"
  },
  "denouement": {
    "scene": "numéro de scène",
    "description": "description de la résolution finale",
    "coherenceAvecActe1": "évaluation de la cohérence avec les enjeux posés en Acte I"
  },
  "recommandations": {
    "desequilibres": ["déséquilibre 1", "déséquilibre 2"],
    "pistes": ["piste de correction 1", "piste de correction 2"],
    "forcesNarratives": ["force narrative 1", "force narrative 2"],
    "faiblesses": ["faiblesse 1", "faiblesse 2"]
  }
}

Règles:
- Sois précis dans les numéros de scènes
- Identifie au minimum 3-5 obstacles majeurs
- Évalue la longueur relative de chaque acte (Acte I: ~25%, Acte II: ~50%, Acte III: ~25%)
- Détecte les déséquilibres structurels (acte trop court, climax mal positionné, etc.)
- Propose des corrections concrètes et réalisables
- Réponds UNIQUEMENT avec le JSON valide`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Tu es un expert en dramaturgie et en analyse de scénarios. Réponds uniquement en JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : null;
        if (!raw)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erreur LLM",
          });

        let parsedAnalysis: any;
        try {
          parsedAnalysis = JSON.parse(raw);
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Réponse LLM invalide",
          });
        }
        return { success: true, data: parsedAnalysis };
      }),
  }),
  budget: router({
    // Get existing budget for a scenario
    get: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        return getBudgetForScenario(input.scenarioId);
      }),
    // Generate budget using LLM
    generate: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const scenes = await getScenesByScenarioId(input.scenarioId);
        const characters = await getCharactersByScenarioId(input.scenarioId);
        const sequences = await getSequences(input.scenarioId);

        const scenesText = scenes
          .map(
            (s, i) =>
              `Séquence ${i + 1}: ${s.intExt || ""} ${s.location || ""} - ${s.dayNight || ""} | ${s.description?.substring(0, 200) || ""}`
          )
          .join("\n");

        const prompt = `Tu es un expert en direction de production cinéma en France. Analyse ce scénario et génère un plan de production complet.

TITRE DU SCÉNARIO: ${scenario.title}
NOMBRE DE SÉQUENCES: ${scenes.length}
NOMBRE DE PERSONNAGES: ${characters.length}
NOMBRE DE DÉCORS: ${scenario.locationCount || 0}

LISTE DES SÉQUENCES:
${scenesText}

Génère une analyse complète au format JSON avec cette structure exacte:
{
  "shootingDays": <nombre total de jours de tournage>,
  "pagesPerDay": <moyenne pages par jour>,
  "heavyDays": <nombre de journées lourdes>,
  "lightDays": <nombre de journées légères>,
  "analysis": "<analyse narrative de la faisabilité>",
  "risks": ["<risque 1>", "<risque 2>"],
  "optimizations": ["<optimisation 1>", "<optimisation 2>"],
  "team": [
    { "department": "Réalisation", "role": "Réalisateur", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Réalisation", "role": "1er assistant réal", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Réalisation", "role": "2e assistant réal", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Réalisation", "role": "Scripte", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Image", "role": "Chef opérateur (DP)", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Image", "role": "Cadreur", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Image", "role": "1er assistant caméra", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Image", "role": "2e assistant caméra", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Électricité", "role": "Chef électricien", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Électricité", "role": "Électricien", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Machinerie", "role": "Chef machiniste", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Machinerie", "role": "Machiniste", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Son", "role": "Chef opérateur son", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Son", "role": "Perchman", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Artistique", "role": "Chef déco", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Artistique", "role": "Accessoiriste", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Artistique", "role": "Costumière", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Artistique", "role": "Maquilleuse", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Production", "role": "Directeur de production", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Production", "role": "Régisseur général", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> },
    { "department": "Production", "role": "Assistant régie", "daysEco": <jours>, "rateEco": <tarif/j>, "daysConfort": <jours>, "rateConfort": <tarif/j> }
  ]
}

Règles importantes:
- Utilise les minimas syndicaux français (convention collective cinéma)
- Version éco: tarifs minimums (250-350€/j technicien, 400-500€/j chef de poste)
- Version confort: tarifs standard marché (350-450€/j technicien, 500-700€/j chef de poste)
- Adapte le nombre de jours selon la complexité du scénario
- Base-toi sur 5-8 pages/jour pour dialogue simple, 2-4 pages/jour pour scènes complexes
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Tu es un expert en production cinématographique française. Réponds uniquement en JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : null;
        if (!raw)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erreur LLM",
          });
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Réponse LLM invalide",
          });
        }

        // Calculate totals
        const team = parsed.team || [];
        const totalEco = team.reduce(
          (sum: number, m: any) => sum + (m.daysEco || 0) * (m.rateEco || 0),
          0
        );
        const totalConfort = team.reduce(
          (sum: number, m: any) =>
            sum + (m.daysConfort || 0) * (m.rateConfort || 0),
          0
        );

        await saveBudget(
          input.scenarioId,
          JSON.stringify(parsed),
          parsed.shootingDays || 0,
          parsed.pagesPerDay || 0,
          totalEco,
          totalConfort
        );

        return { success: true, data: parsed, totalEco, totalConfort };
      }),
    exportExcel: protectedProcedure
      .input(
        z.object({
          scenarioId: z.number(),
          version: z.enum(["eco", "confort"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scenario = await getScenarioById(input.scenarioId);
        if (!scenario || scenario.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scénario introuvable",
          });
        }
        const budget = await getBudgetForScenario(input.scenarioId);
        if (!budget)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Budget not found",
          });

        const parsed = JSON.parse(budget.content || "{}");
        const team = parsed.team || [];

        // Créer un objet Excel simple avec les données du budget
        const excelData = {
          title: scenario.title,
          screenwriterName: scenario.screenwriterName ?? "N/A",
          durationLabel: scenario.durationSeconds
            ? `${Math.floor(scenario.durationSeconds / 60)}min ${scenario.durationSeconds % 60}s`
            : "N/A",
          shootingDays: parsed.shootingDays || 0,
          pagesPerDay: parsed.pagesPerDay || 0,
          version: input.version,
          team: team,
        };

        // Convertir en CSV simple pour l'export
        let csv = "BUDGET DE PRODUCTION\n\n";
        csv += `Titre,${excelData.title}\n`;
        csv += `Scénariste,${excelData.screenwriterName ?? "N/A"}\n`;
        csv += `Durée,${excelData.durationLabel}\n`;
        csv += `Jours de tournage,${excelData.shootingDays}\n`;
        csv += `Pages/jour,${excelData.pagesPerDay}\n`;
        csv += `Version,${excelData.version}\n\n`;

        csv += "ÉQUIPE\n";
        csv += "Département,Fonction,Jours,Tarif/jour,Coût total\n";

        let totalCost = 0;
        for (const member of team) {
          const days =
            input.version === "eco" ? member.daysEco : member.daysConfort;
          const rate =
            input.version === "eco" ? member.rateEco : member.rateConfort;
          const cost = days * rate;
          totalCost += cost;
          csv += `${member.department},${member.role},${days},${rate},${cost}\n`;
        }

        csv += `\nTOTAL,,,${totalCost}\n`;

        return {
          csv,
          filename: `${scenario.title}-Budget-${input.version}.csv`,
        };
      }),
  }),

  // ─── Commercial Module (Gestion Commerciale) ──────────────────────────────────
  commercial: router({
    // Clients
    clients: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getClientsByUserId } = await import("./db");
        return await getClientsByUserId(ctx.user.id);
      }),
      create: protectedProcedure
        .input(
          z.object({
            type: z.enum(["particulier", "entreprise"]),
            name: z.string(),
            address: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            siret: z.string().optional(),
            vatNumber: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createClient } = await import("./db");
          return await createClient({
            userId: ctx.user.id,
            ...input,
          });
        }),
      get: protectedProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }) => {
          const { getClientById } = await import("./db");
          return await getClientById(input.clientId);
        }),
      update: protectedProcedure
        .input(
          z.object({
            clientId: z.number(),
            data: z.object({
              type: z.enum(["particulier", "entreprise"]).optional(),
              name: z.string().optional(),
              address: z.string().optional(),
              email: z.string().email().optional(),
              phone: z.string().optional(),
              siret: z.string().optional(),
              vatNumber: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          const { updateClient } = await import("./db");
          return await updateClient(input.clientId, input.data);
        }),
      delete: protectedProcedure
        .input(z.object({ clientId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteClient } = await import("./db");
          return await deleteClient(input.clientId);
        }),
      searchBySiret: publicProcedure
        .input(z.object({ siret: z.string() }))
        .query(async ({ input }) => {
          try {
            const result = await searchBySiret(input.siret);
            if (!result) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "SIRET non trouve dans la base INSEE",
              });
            }
            return result;
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la recherche SIRET",
            });
          }
        }),
      searchBySiren: publicProcedure
        .input(z.object({ siren: z.string() }))
        .query(async ({ input }) => {
          try {
            const result = await searchBySiren(input.siren);
            if (!result) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "SIREN non trouve dans la base INSEE",
              });
            }
            return result;
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la recherche SIREN",
            });
          }
        }),
    }),

    // Settings
    settings: router({
      get: protectedProcedure.query(async ({ ctx }) => {
        const { getCompanySettingsByUserId } = await import("./db");
        return await getCompanySettingsByUserId(ctx.user.id);
      }),
      update: protectedProcedure
        .input(
          z.object({
            companyName: z.string(),
            siret: z.string().optional(),
            vatNumber: z.string().optional(),
            address: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().email().optional(),
            website: z.string().optional(),
            legalMentions: z.string().optional(),
            paymentTerms: z.string().optional(),
            paymentConditions: z.string().optional(),
            bankDetails: z.string().optional(),
            defaultVatRate: z.number().optional(),
            invoicePrefix: z.string().optional(),
            quotePrefix: z.string().optional(),
            creditPrefix: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createOrUpdateCompanySettings } = await import("./db");
          return await createOrUpdateCompanySettings(ctx.user.id, input);
        }),
    }),

    // Products
    products: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getProductsByUserId } = await import("./db");
        return await getProductsByUserId(ctx.user.id);
      }),
      create: protectedProcedure
        .input(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            priceHT: z.number(),
            vatRate: z.number().default(20),
            unit: z.enum(["heure", "jour", "forfait"]),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createProduct } = await import("./db");
          return await createProduct({
            userId: ctx.user.id,
            ...input,
          });
        }),
      get: protectedProcedure
        .input(z.object({ productId: z.number() }))
        .query(async ({ input }) => {
          const { getProductById } = await import("./db");
          return await getProductById(input.productId);
        }),
      update: protectedProcedure
        .input(
          z.object({
            productId: z.number(),
            data: z.object({
              name: z.string().optional(),
              description: z.string().optional(),
              priceHT: z.number().optional(),
              vatRate: z.number().optional(),
              unit: z.enum(["heure", "jour", "forfait"]).optional(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          const { updateProduct } = await import("./db");
          return await updateProduct(input.productId, input.data);
        }),
      delete: protectedProcedure
        .input(z.object({ productId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteProduct } = await import("./db");
          return await deleteProduct(input.productId);
        }),
    }),

    // Quotes (Devis)
    quotes: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getQuotesByUserId } = await import("./db");
        return await getQuotesByUserId(ctx.user.id);
      }),
      create: protectedProcedure
        .input(
          z.object({
            clientId: z.number(),
            validityDate: z.date().optional(),
            paymentTerms: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createQuote, generateNextNumber } = await import("./db");
          const number = await generateNextNumber("DV", ctx.user.id);
          return await createQuote({
            userId: ctx.user.id,
            clientId: input.clientId,
            number,
            validityDate: input.validityDate,
            paymentTerms: input.paymentTerms,
          });
        }),
      get: protectedProcedure
        .input(z.object({ quoteId: z.number() }))
        .query(async ({ input }) => {
          const { getQuoteById, getQuoteLines } = await import("./db");
          const quote = await getQuoteById(input.quoteId);
          if (!quote) return null;
          const lines = await getQuoteLines(input.quoteId);
          return { ...quote, lines };
        }),
      update: protectedProcedure
        .input(
          z.object({
            quoteId: z.number(),
            data: z.object({
              status: z
                .enum(["brouillon", "envoyé", "accepté", "refusé"])
                .optional(),
              totalHT: z.number().optional(),
              totalVAT: z.number().optional(),
              totalTTC: z.number().optional(),
              paymentTerms: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          const { updateQuote } = await import("./db");
          return await updateQuote(input.quoteId, input.data);
        }),
      delete: protectedProcedure
        .input(z.object({ quoteId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteQuote } = await import("./db");
          return await deleteQuote(input.quoteId);
        }),
      addLine: protectedProcedure
        .input(
          z.object({
            quoteId: z.number(),
            productId: z.number(),
            quantity: z.number(),
            unitPriceHT: z.number(),
            vatRate: z.number(),
          })
        )
        .mutation(async ({ input }) => {
          const { createQuoteLine } = await import("./db");
          const lineTotal = input.quantity * input.unitPriceHT;
          return await createQuoteLine({
            quoteId: input.quoteId,
            productId: input.productId,
            quantity: input.quantity,
            unitPriceHT: input.unitPriceHT,
            vatRate: input.vatRate,
            lineTotal,
          });
        }),
      removeLine: protectedProcedure
        .input(z.object({ lineId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteQuoteLine } = await import("./db");
          return await deleteQuoteLine(input.lineId);
        }),
    }),

    // Invoices (Factures)
    invoices: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getInvoicesByUserId } = await import("./db");
        return await getInvoicesByUserId(ctx.user.id);
      }),
      create: protectedProcedure
        .input(
          z.object({
            clientId: z.number(),
            quoteId: z.number().optional(),
            dueDate: z.date().optional(),
            paymentMethod: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createInvoice, generateNextNumber } = await import("./db");
          const number = await generateNextNumber("FA", ctx.user.id);
          return await createInvoice({
            userId: ctx.user.id,
            clientId: input.clientId,
            quoteId: input.quoteId,
            number,
            dueDate: input.dueDate,
            paymentMethod: input.paymentMethod,
          });
        }),
      get: protectedProcedure
        .input(z.object({ invoiceId: z.number() }))
        .query(async ({ input }) => {
          const { getInvoiceById, getInvoiceLines } = await import("./db");
          const invoice = await getInvoiceById(input.invoiceId);
          if (!invoice) return null;
          const lines = await getInvoiceLines(input.invoiceId);
          return { ...invoice, lines };
        }),
      update: protectedProcedure
        .input(
          z.object({
            invoiceId: z.number(),
            data: z.object({
              status: z
                .enum(["brouillon", "envoyée", "payée", "en retard"])
                .optional(),
              totalHT: z.number().optional(),
              totalVAT: z.number().optional(),
              totalTTC: z.number().optional(),
              paymentMethod: z.string().optional(),
              paymentDate: z.date().optional(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          const { updateInvoice } = await import("./db");
          return await updateInvoice(input.invoiceId, input.data);
        }),
      delete: protectedProcedure
        .input(z.object({ invoiceId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteInvoice } = await import("./db");
          return await deleteInvoice(input.invoiceId);
        }),
      addLine: protectedProcedure
        .input(
          z.object({
            invoiceId: z.number(),
            productId: z.number(),
            quantity: z.number(),
            unitPriceHT: z.number(),
            vatRate: z.number(),
          })
        )
        .mutation(async ({ input }) => {
          const { createInvoiceLine } = await import("./db");
          const lineTotal = input.quantity * input.unitPriceHT;
          return await createInvoiceLine({
            invoiceId: input.invoiceId,
            productId: input.productId,
            quantity: input.quantity,
            unitPriceHT: input.unitPriceHT,
            vatRate: input.vatRate,
            lineTotal,
          });
        }),
      removeLine: protectedProcedure
        .input(z.object({ lineId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteInvoiceLine } = await import("./db");
          return await deleteInvoiceLine(input.lineId);
        }),
    }),

    // Credits (Avoirs)
    credits: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getCreditsByUserId } = await import("./db");
        return await getCreditsByUserId(ctx.user.id);
      }),
      create: protectedProcedure
        .input(
          z.object({
            invoiceId: z.number(),
            amount: z.number(),
            reason: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createCredit, generateNextNumber } = await import("./db");
          const number = await generateNextNumber("AV", ctx.user.id);
          return await createCredit({
            userId: ctx.user.id,
            invoiceId: input.invoiceId,
            number,
            amount: input.amount,
            reason: input.reason,
          });
        }),
      get: protectedProcedure
        .input(z.object({ creditId: z.number() }))
        .query(async ({ input }) => {
          const { getCreditById } = await import("./db");
          return await getCreditById(input.creditId);
        }),
      delete: protectedProcedure
        .input(z.object({ creditId: z.number() }))
        .mutation(async ({ input }) => {
          const { deleteCredit } = await import("./db");
          return await deleteCredit(input.creditId);
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Background processing ───────────────────────────────────────────────────
async function processScenario(
  scenarioId: number,
  fileUrl: string,
  fileName: string
) {
  try {
    await updateScenarioStatus(scenarioId, "processing");

    const parsed = await parseScenarioWithLLM(fileUrl, fileName);

    // Update scenario title and screenwriter info if LLM found them
    if (
      parsed.title ||
      parsed.screenwriterName ||
      parsed.screenwriterEmail ||
      parsed.screenwriterPhone
    ) {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (db) {
        const { scenarios } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updateData: Record<string, string | null> = {};
        if (parsed.title) updateData.title = parsed.title;
        if (parsed.screenwriterName !== undefined)
          updateData.screenwriterName = parsed.screenwriterName;
        if (parsed.screenwriterEmail !== undefined)
          updateData.screenwriterEmail = parsed.screenwriterEmail;
        if (parsed.screenwriterPhone !== undefined)
          updateData.screenwriterPhone = parsed.screenwriterPhone;
        await db
          .update(scenarios)
          .set(updateData)
          .where(eq(scenarios.id, scenarioId));
      }
    }

    // Insert characters
    const charNameToId = new Map<string, number>();
    if (parsed.characters.length > 0) {
      const charIds = await insertCharacters(
        parsed.characters.map(c => ({
          scenarioId,
          name: c.name,
          gender: c.gender,
          age: c.age,
        }))
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
        parsed.props.map(p => ({ scenarioId, name: p }))
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
                  content: `Tu es un assistant de production cinéma. Analyse la description de scène et identifie quels accessoires de la liste fournie sont utilisés dans cette scène. Réponds UNIQUEMENT avec un JSON valide: {"props": ["accessoire1", "accessoire2"]}`,
                },
                {
                  role: "user",
                  content: `Scène: ${sceneText.slice(0, 1000)}\n\nAccessoires disponibles: ${propsStr}`,
                },
              ],
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
      await insertSequences([
        {
          scenarioId,
          name: sequenceName,
          orderIndex: i,
        },
      ]);
    }

    // Link scenes to sequences and generate summaries
    const updatedSequences = await getSequences(scenarioId);
    for (let i = 0; i < scenes.length && i < updatedSequences.length; i++) {
      const scene = scenes[i];
      const sequence = updatedSequences[i];
      if (sequence && sequence.id) {
        await insertSequenceScenes([
          { sequenceId: sequence.id, sceneId: scene.id },
        ]);
        // Generate a short summary for this scene/sequence
        try {
          const sceneText = scene.description || "";
          if (sceneText.trim().length > 10) {
            const { invokeLLM } = await import("./_core/llm");
            const summaryResp = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "Tu es un assistant de production cin\u00e9ma. R\u00e9sume la sc\u00e8ne suivante en 1 ou 2 phrases courtes et pr\u00e9cises, en fran\u00e7ais, de mani\u00e8re factuelle (qui fait quoi, o\u00f9).",
                },
                { role: "user", content: sceneText.slice(0, 1500) },
              ],
            });
            const rawContent = summaryResp?.choices?.[0]?.message?.content;
            const summary =
              typeof rawContent === "string" ? rawContent.trim() : "";
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
    // Calculate and save duration automatically after processing
    try {
      await calculateAndSaveScenarioDuration(scenarioId);
    } catch (e) {
      // Non-blocking: skip duration calculation if it fails
      console.warn(
        `[Scenario] Duration calculation failed for ${scenarioId}:`,
        e
      );
    }
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
      .map(
        (s, i) =>
          `Scène ${i + 1} (${s.intExt || ""} ${s.location || ""} - ${s.dayNight || ""}): ${s.description || ""}`
      )
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
    console.error(
      `[Synopsis] Generation failed for scenario ${scenarioId}:`,
      err
    );
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
    const existing = await db
      .select({ count: count() })
      .from(sceneProps)
      .where(eq(sceneProps.propId, propId));
    if (existing[0]?.count > 0) return; // Already backfilled

    // Get the prop details
    const prop = await db
      .select()
      .from(props)
      .where(eq(props.id, propId))
      .limit(1);
    if (!prop || prop.length === 0) return;

    const propName = prop[0].name;
    const scenarioId = prop[0].scenarioId;

    // Get all scenes for this scenario
    const allScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.scenarioId, scenarioId));
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
                content: `Tu es un assistant de production cinéma. Analyse la description de scène et détermine si l'accessoire "${propName}" est utilisé dans cette scène. Réponds UNIQUEMENT avec un JSON valide: {"used": true} ou {"used": false}`,
              },
              {
                role: "user",
                content: `Accessoire: ${propName}\n\nDescription de scène: ${sceneText.slice(0, 1000)}`,
              },
            ],
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
