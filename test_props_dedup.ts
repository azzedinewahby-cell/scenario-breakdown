import { getDb } from "./server/db";
import { sequences, sequenceScenes, scenes, props } from "./drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

// Get sequence 4 (LABORATOIRE)
const seqList = await db
  .select()
  .from(sequences)
  .where(eq(sequences.scenarioId, 60001))
  .limit(10);

// Find the LABORATOIRE sequence
const labSeq = seqList.find(s => s.name?.includes("LABORATOIRE"));
if (!labSeq) {
  console.error("LABORATOIRE sequence not found");
  process.exit(1);
}

const sequenceId = labSeq.id;
console.log("Testing with sequenceId:", sequenceId, "name:", labSeq.name);

// Get scene IDs for this sequence
const sceneLinks = await db
  .select({ sceneId: sequenceScenes.sceneId })
  .from(sequenceScenes)
  .where(eq(sequenceScenes.sequenceId, sequenceId));

const sceneIds = sceneLinks.map((s) => s.sceneId);

// Get all scenes for this sequence
const sequenceSceneList = await db
  .select({ description: scenes.description })
  .from(scenes)
  .where(inArray(scenes.id, sceneIds));

// Get all props
const allProps = await db.select().from(props);

// Find props that appear in any scene description
const matchingProps = new Map<number, string>();

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
    matchingProps.set(prop.id, prop.name);
  }
});

// Convert to array and sort by name
const result = Array.from(matchingProps.entries())
  .map(([propId, propName]) => ({ propId, propName }))
  .sort((a, b) => a.propName.localeCompare(b.propName));

console.log("\nMatching props:", result.length);
result.forEach(prop => {
  console.log(`- ${prop.propName} (ID: ${prop.propId})`);
});

// Check for duplicates by propName
const propNames = result.map(p => p.propName);
const duplicates = propNames.filter((name, index) => propNames.indexOf(name) !== index);
if (duplicates.length > 0) {
  console.log("\n⚠️ Duplicates found:", duplicates);
} else {
  console.log("\n✅ No duplicates found");
}

process.exit(0);
