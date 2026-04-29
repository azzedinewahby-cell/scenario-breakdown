import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  scenarios,
  scenes,
  characters,
  sceneCharacters,
  dialogues,
  props,
  sceneProps,
  sequences,
  sequenceScenes,
  budgets,
  clients,
  products,
  quotes,
  quoteLines,
  invoices,
  invoiceLines,
  credits,
  companySettings,
  type InsertScenario,
  type InsertScene,
  type InsertCharacter,
  type InsertSceneCharacter,
  type InsertDialogue,
  type InsertProp,
  type InsertSceneProp,
  type InsertSequence,
  type InsertSequenceScene,
  type InsertClient,
  type InsertProduct,
  type InsertQuote,
  type InsertQuoteLine,
  type InsertInvoice,
  type InsertInvoiceLine,
  type InsertCredit,
  type InsertSalaryScale,
  type InsertCompanySettings,
  type InsertUser,
  salaryScales,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

export async function createScenario(data: InsertScenario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scenarios).values(data);
  return result[0].insertId;
}

export async function getScenarioById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getScenariosByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(scenarios)
    .where(eq(scenarios.userId, userId))
    .orderBy(desc(scenarios.createdAt));
}

export async function updateScenarioStatus(
  id: number,
  status: "uploading" | "processing" | "completed" | "error",
  extra?: {
    errorMessage?: string;
    sceneCount?: number;
    characterCount?: number;
    locationCount?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { status };
  if (extra?.errorMessage !== undefined) set.errorMessage = extra.errorMessage;
  if (extra?.sceneCount !== undefined) set.sceneCount = extra.sceneCount;
  if (extra?.characterCount !== undefined)
    set.characterCount = extra.characterCount;
  if (extra?.locationCount !== undefined)
    set.locationCount = extra.locationCount;
  await db.update(scenarios).set(set).where(eq(scenarios.id, id));
}

export async function deleteScenario(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete in order: dialogues → scene_characters → scenes → characters → scenario
  const sceneRows = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(eq(scenes.scenarioId, id));
  const sceneIds = sceneRows.map(s => s.id);
  if (sceneIds.length > 0) {
    for (const sid of sceneIds) {
      await db.delete(dialogues).where(eq(dialogues.sceneId, sid));
      await db.delete(sceneCharacters).where(eq(sceneCharacters.sceneId, sid));
    }
  }
  await db.delete(scenes).where(eq(scenes.scenarioId, id));
  await db.delete(characters).where(eq(characters.scenarioId, id));
  await db.delete(scenarios).where(eq(scenarios.id, id));
}

// ─── Scenes ──────────────────────────────────────────────────────────────────

export async function insertScenes(data: InsertScene[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  const ids: number[] = [];
  for (const scene of data) {
    const result = await db.insert(scenes).values(scene);
    ids.push(result[0].insertId);
  }
  return ids;
}

export async function getScenesByScenarioId(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(scenes)
    .where(eq(scenes.scenarioId, scenarioId))
    .orderBy(scenes.sceneNumber);
}

// ─── Characters ──────────────────────────────────────────────────────────────

export async function insertCharacters(data: InsertCharacter[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  const ids: number[] = [];
  for (const char of data) {
    const result = await db.insert(characters).values(char);
    ids.push(result[0].insertId);
  }
  return ids;
}

export async function getCharactersByScenarioId(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(characters)
    .where(eq(characters.scenarioId, scenarioId));
}

// ─── Scene–Characters ────────────────────────────────────────────────────────

export async function insertSceneCharacters(data: InsertSceneCharacter[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const sc of data) {
    await db.insert(sceneCharacters).values(sc);
  }
}

export async function getSceneCharactersBySceneIds(sceneIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (sceneIds.length === 0) return [];
  const results = [];
  for (const sid of sceneIds) {
    const rows = await db
      .select()
      .from(sceneCharacters)
      .where(eq(sceneCharacters.sceneId, sid));
    results.push(...rows);
  }
  return results;
}

// ─── Dialogues ───────────────────────────────────────────────────────────────

export async function insertDialogues(data: InsertDialogue[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const d of data) {
    await db.insert(dialogues).values(d);
  }
}

export async function getDialoguesBySceneId(sceneId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(dialogues)
    .where(eq(dialogues.sceneId, sceneId))
    .orderBy(dialogues.orderIndex);
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────

// ─── Props (Accessoires) ─────────────────────────────────────────────────────

export async function insertProps(data: InsertProp[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  const propIds: number[] = [];
  for (const p of data) {
    const result = await db.insert(props).values(p);
    // Get the inserted prop by querying back
    const inserted = await db
      .select()
      .from(props)
      .where(eq(props.scenarioId, p.scenarioId))
      .orderBy(desc(props.id))
      .limit(1);
    if (inserted.length > 0) {
      propIds.push(inserted[0].id);
    }
  }
  return propIds;
}

export async function getProps(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(props).where(eq(props.scenarioId, scenarioId));
}

// ─── Scene Props ───────────────────────────────────────────────────────────────

export async function insertSceneProps(data: InsertSceneProp[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const sp of data) {
    await db.insert(sceneProps).values(sp);
  }
}

// ─── Sequences ────────────────────────────────────────────────────────────────

export async function insertSequences(data: InsertSequence[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const seq of data) {
    await db.insert(sequences).values(seq);
  }
}

export async function getSequences(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(sequences)
    .where(eq(sequences.scenarioId, scenarioId))
    .orderBy(sequences.orderIndex);
}

// ─── Sequence Scenes ────────────────────────────────────────────────────────

export async function insertSequenceScenes(data: InsertSequenceScene[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const ss of data) {
    await db.insert(sequenceScenes).values(ss);
  }
}

export async function updateSequenceSummary(
  sequenceId: number,
  summary: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sequences)
    .set({ summary })
    .where(eq(sequences.id, sequenceId));
}

export async function getSequenceScenes(sequenceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(sequenceScenes)
    .where(eq(sequenceScenes.sequenceId, sequenceId))
    .orderBy(sequenceScenes.orderIndex);
}

// ─── Dashboard stats ───────────────────────────────────────────────────────────────

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userScenarios = await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.userId, userId));

  const totalScenarios = userScenarios.length;
  const completedScenarios = userScenarios.filter(
    s => s.status === "completed"
  ).length;
  const totalScenes = userScenarios.reduce(
    (sum, s) => sum + (s.sceneCount ?? 0),
    0
  );
  const totalCharacters = userScenarios.reduce(
    (sum, s) => sum + (s.characterCount ?? 0),
    0
  );
  const totalLocations = userScenarios.reduce(
    (sum, s) => sum + (s.locationCount ?? 0),
    0
  );

  return {
    totalScenarios,
    completedScenarios,
    totalScenes,
    totalCharacters,
    totalLocations,
  };
}

// ─── Props Sequences (Accessoires par séquence) ──────────────────────────────
export async function getSequencesForProp(propId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the prop
  const prop = await db
    .select()
    .from(props)
    .where(eq(props.id, propId))
    .limit(1);
  if (prop.length === 0) return [];

  const propName = prop[0].name.toLowerCase();

  // Extract key words from prop name (split by spaces and filter short words)
  const keywords = propName
    .split(/[\s\-,()]+/)
    .filter(word => word.length > 2)
    .map(word => word.toLowerCase());

  // Search for prop name or keywords in scene descriptions
  const allScenes = await db.select().from(scenes);
  const matchingSceneIds = allScenes
    .filter(scene => {
      if (!scene.description) return false;
      const desc = scene.description.toLowerCase();

      // First try exact match
      if (desc.includes(propName)) return true;

      // Then try matching at least 2 keywords
      const matchedKeywords = keywords.filter(kw => desc.includes(kw));
      return matchedKeywords.length >= 2;
    })
    .map(scene => scene.id);

  if (matchingSceneIds.length === 0) return [];

  // Get unique sequences for these scenes
  const result = await db
    .selectDistinct({
      sequenceId: sequenceScenes.sequenceId,
      sequenceName: sequences.name,
      sequenceSummary: sequences.summary,
      orderIndex: sequences.orderIndex,
    })
    .from(sequenceScenes)
    .innerJoin(sequences, eq(sequenceScenes.sequenceId, sequences.id))
    .where(inArray(sequenceScenes.sceneId, matchingSceneIds))
    .orderBy(sequences.orderIndex);

  return result;
}

// ─── Character Sequences (Personnages par séquence) ────────────────────────
export async function getSequencesForCharacter(characterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get scenes for this character
  const sceneIds = await db
    .select({ sceneId: sceneCharacters.sceneId })
    .from(sceneCharacters)
    .where(eq(sceneCharacters.characterId, characterId));

  if (sceneIds.length === 0) return [];

  // Get unique sequences for these scenes
  const result = await db
    .selectDistinct({
      sequenceId: sequenceScenes.sequenceId,
      sequenceName: sequences.name,
      sequenceSummary: sequences.summary,
      orderIndex: sequences.orderIndex,
    })
    .from(sequenceScenes)
    .innerJoin(sequences, eq(sequenceScenes.sequenceId, sequences.id))
    .where(
      inArray(
        sequenceScenes.sceneId,
        sceneIds.map(s => s.sceneId)
      )
    )
    .orderBy(sequences.orderIndex);

  return result;
}

// ─── Synopsis ─────────────────────────────────────────────────────────────────
export async function updateScenarioSynopsis(
  scenarioId: number,
  synopsis: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(scenarios)
    .set({ synopsis })
    .where(eq(scenarios.id, scenarioId));
}

// ─── Characters for a Sequence ────────────────────────────────────────────────
export async function getCharactersForSequence(sequenceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get scene IDs for this sequence
  const sceneLinks = await db
    .select({ sceneId: sequenceScenes.sceneId })
    .from(sequenceScenes)
    .where(eq(sequenceScenes.sequenceId, sequenceId));

  if (sceneLinks.length === 0) return [];

  const sceneIds = sceneLinks.map(s => s.sceneId);

  // Get distinct characters for these scenes
  const result = await db
    .selectDistinct({
      characterId: characters.id,
      characterName: characters.name,
      gender: characters.gender,
      age: characters.age,
    })
    .from(sceneCharacters)
    .innerJoin(characters, eq(sceneCharacters.characterId, characters.id))
    .where(inArray(sceneCharacters.sceneId, sceneIds))
    .orderBy(characters.name);

  return result;
}

// ─── Props for a Sequence ─────────────────────────────────────────────────────
export async function getPropsForSequence(sequenceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get scene IDs for this sequence
  const sceneLinks = await db
    .select({ sceneId: sequenceScenes.sceneId })
    .from(sequenceScenes)
    .where(eq(sequenceScenes.sequenceId, sequenceId));

  if (sceneLinks.length === 0) return [];

  const sceneIds = sceneLinks.map(s => s.sceneId);

  // Get all scenes for this sequence
  const sequenceSceneList = await db
    .select({ description: scenes.description })
    .from(scenes)
    .where(inArray(scenes.id, sceneIds));

  // Get all props
  const allProps = await db.select().from(props);

  // Find props that appear in any scene description
  // Use propName as key to deduplicate by name (not by ID)
  const matchingProps = new Map<string, { propId: number; propName: string }>();

  allProps.forEach(prop => {
    const propName = prop.name.toLowerCase();
    const keywords = propName
      .split(/[\s\-,()]+/)
      .filter(word => word.length > 2)
      .map(word => word.toLowerCase());

    // Check if prop appears in any scene description
    const isInSequence = sequenceSceneList.some(scene => {
      if (!scene.description) return false;
      const desc = scene.description.toLowerCase();

      // First try exact match
      if (desc.includes(propName)) return true;

      // Then try matching at least 2 keywords
      const matchedKeywords = keywords.filter(kw => desc.includes(kw));
      return matchedKeywords.length >= 2;
    });

    if (isInSequence) {
      // Deduplicate by propName: only keep the first occurrence
      if (!matchingProps.has(prop.name)) {
        matchingProps.set(prop.name, { propId: prop.id, propName: prop.name });
      }
    }
  });

  // Convert to array and sort by name
  const result = Array.from(matchingProps.values()).sort((a, b) =>
    a.propName.localeCompare(b.propName)
  );

  return result;
}

// ─── Duration Calculation ─────────────────────────────────────────────────────

export async function calculateAndSaveScenarioDuration(
  scenarioId: number
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot calculate duration: database not available"
    );
    return 0;
  }

  // Get all scenes for this scenario
  const scenarioScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.scenarioId, scenarioId));

  if (scenarioScenes.length === 0) {
    return 0;
  }

  // Calculate duration based on scenes
  let totalSeconds = 0;

  for (const scene of scenarioScenes) {
    if (!scene.description) continue;

    const lines = scene.description.split("\n").length;
    const words = scene.description.split(/\s+/).length;

    // Estimation de pages (250 mots ≈ 1 page)
    const estimatedPages = Math.max(1, Math.round(words / 250));

    // Durée de base : 1 page = 60 secondes
    let duration = estimatedPages * 60;

    // Ajustement selon le type de scène
    const description = scene.description.toLowerCase();

    // Détecter les mots-clés d'action
    const actionKeywords = [
      "court",
      "saute",
      "tire",
      "explose",
      "crash",
      "poursuit",
      "combat",
      "chute",
      "fuit",
      "attaque",
      "frappe",
      "course",
      "explosion",
      "poursuite",
    ];
    const hasActionKeywords = actionKeywords.some(keyword =>
      description.includes(keyword)
    );

    // Détecter les scènes contemplatives
    const contemplativeKeywords = [
      "silence",
      "contemple",
      "regarde",
      "pense",
      "rêve",
      "souvenir",
      "flashback",
      "montage",
      "musique",
      "poétique",
      "lent",
    ];
    const hasContemplativeKeywords = contemplativeKeywords.some(keyword =>
      description.includes(keyword)
    );

    // Compter les lignes de dialogue
    const dialogueMatches = scene.description.match(/^[A-Z\s]+:/gm) || [];
    const dialogueRatio = dialogueMatches.length / (lines || 1);

    if (hasContemplativeKeywords && !hasActionKeywords) {
      // Scènes contemplatives : plus longues
      duration = Math.round(duration * 1.4);
    } else if (hasActionKeywords) {
      // Scènes d'action : plus lentes
      duration = Math.round(duration * 1.2);
    } else if (dialogueRatio > 0.4) {
      // Scènes dialoguées : plus rapides
      duration = Math.round(duration * 0.8);
    }

    // Durée minimale : 3 secondes
    totalSeconds += Math.max(3, duration);
  }

  // Sauvegarder la durée en base de données
  await db
    .update(scenarios)
    .set({ durationSeconds: totalSeconds })
    .where(eq(scenarios.id, scenarioId));

  return totalSeconds;
}

export async function getScenarioDuration(scenarioId: number): Promise<{
  totalSeconds: number;
  totalMinutes: number;
  totalSeconds_remainder: number;
} | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get duration: database not available");
    return null;
  }

  const scenario = await db
    .select({ durationSeconds: scenarios.durationSeconds })
    .from(scenarios)
    .where(eq(scenarios.id, scenarioId))
    .limit(1);

  if (scenario.length === 0) {
    return null;
  }

  const totalSeconds = scenario[0].durationSeconds || 0;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalSeconds_remainder = totalSeconds % 60;

  return {
    totalSeconds,
    totalMinutes,
    totalSeconds_remainder,
  };
}

// ─── Clients (Gestion Commerciale) ────────────────────────────────────────────

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result;
}

export async function getClientsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(eq(clients.userId, userId));
}

export async function getClientById(clientId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateClient(
  clientId: number,
  data: Partial<InsertClient>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(clients).set(data).where(eq(clients.id, clientId));
}

export async function deleteClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(clients).where(eq(clients.id, clientId));
}

// ─── Products (Gestion Commerciale) ──────────────────────────────────────────

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  return result;
}

export async function getProductsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.userId, userId));
}

export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProduct(
  productId: number,
  data: Partial<InsertProduct>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(products).set(data).where(eq(products.id, productId));
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(products).where(eq(products.id, productId));
}

// ─── Quotes (Devis) ──────────────────────────────────────────────────────────

export async function createQuote(data: InsertQuote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(data);
  return result;
}

export async function getQuotesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.createdAt));
}

export async function getQuoteById(quoteId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateQuote(quoteId: number, data: Partial<InsertQuote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(quotes).set(data).where(eq(quotes.id, quoteId));
}

export async function deleteQuote(quoteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(quotes).where(eq(quotes.id, quoteId));
}

export async function getQuoteLines(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(quoteLines.orderIndex);
}

export async function createQuoteLine(data: InsertQuoteLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(quoteLines).values(data);
}

export async function deleteQuoteLine(lineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(quoteLines).where(eq(quoteLines.id, lineId));
}

// ─── Invoices (Factures) ─────────────────────────────────────────────────────

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data);
  return result;
}

export async function getInvoicesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(invoiceId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateInvoice(
  invoiceId: number,
  data: Partial<InsertInvoice>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(invoices).set(data).where(eq(invoices.id, invoiceId));
}

export async function deleteInvoice(invoiceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(invoices).where(eq(invoices.id, invoiceId));
}

export async function getInvoiceLines(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId))
    .orderBy(invoiceLines.orderIndex);
}

export async function createInvoiceLine(data: InsertInvoiceLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(invoiceLines).values(data);
}

export async function deleteInvoiceLine(lineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(invoiceLines).where(eq(invoiceLines.id, lineId));
}

// ─── Credits (Avoirs) ────────────────────────────────────────────────────────

export async function createCredit(data: InsertCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(credits).values(data);
  return result;
}

export async function getCreditsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .orderBy(desc(credits.createdAt));
}

export async function getCreditById(creditId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(credits)
    .where(eq(credits.id, creditId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateCredit(
  creditId: number,
  data: Partial<InsertCredit>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(credits).set(data).where(eq(credits.id, creditId));
}

export async function deleteCredit(creditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(credits).where(eq(credits.id, creditId));
}

// ─── Salary Scales (PCINE) ───────────────────────────────────────────────────

export async function getSalaryScales() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(salaryScales);
}

export async function getSalaryScaleByRole(role: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(salaryScales)
    .where(eq(salaryScales.role, role))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Utility: Generate next number for quotes/invoices/credits ────────────────

export async function generateNextNumber(
  prefix: "DV" | "FA" | "AV",
  userId: number
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const baseNumber = `${prefix}-${year}-`;

  let table: any;
  let numberField: any;

  if (prefix === "DV") {
    table = quotes;
    numberField = quotes.number;
  } else if (prefix === "FA") {
    table = invoices;
    numberField = invoices.number;
  } else {
    table = credits;
    numberField = credits.number;
  }

  // Get the highest number for this year and prefix
  const result = await db
    .select({ number: numberField })
    .from(table)
    .where(
      and(
        eq(table.userId, userId),
        sql`${numberField} LIKE ${baseNumber + "%"}`
      )
    )
    .orderBy(desc(numberField))
    .limit(1);

  let nextSequence = 1;
  if (result.length > 0) {
    const lastNumber = result[0].number;
    const parts = lastNumber.split("-");
    const currentSequence = parseInt(parts[2], 10);
    nextSequence = currentSequence + 1;
  }

  return `${baseNumber}${String(nextSequence).padStart(4, "0")}`;
}

/**
 * Company Settings Management
 */

export async function getCompanySettingsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createOrUpdateCompanySettings(userId: number, data: any) {
  const db = await getDb();
  if (!db) return null;

  const existing = await getCompanySettingsByUserId(userId);

  if (existing) {
    return await db
      .update(companySettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companySettings.userId, userId));
  } else {
    return await db.insert(companySettings).values({
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function deleteCompanySettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return await db
    .delete(companySettings)
    .where(eq(companySettings.userId, userId));
}
