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
  console.log("Available sequences:", seqList.map(s => s.name));
  process.exit(1);
}

const sequenceId = labSeq.id;
console.log("Testing with sequenceId:", sequenceId, "name:", labSeq.name);

// Get scene IDs for this sequence
const sceneLinks = await db
  .select({ sceneId: sequenceScenes.sceneId })
  .from(sequenceScenes)
  .where(eq(sequenceScenes.sequenceId, sequenceId));

console.log("Scene links found:", sceneLinks.length);
console.log("Scene IDs:", sceneLinks.map(s => s.sceneId));

const sceneIds = sceneLinks.map((s) => s.sceneId);

// Get all scenes for this sequence
const sequenceSceneList = await db
  .select({ description: scenes.description })
  .from(scenes)
  .where(inArray(scenes.id, sceneIds));

console.log("Scenes found:", sequenceSceneList.length);
sequenceSceneList.forEach((s, i) => {
  console.log(`\nScene ${i}: ${s.description?.substring(0, 150)}...`);
});

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

console.log("\nMatching props:", matchingProps.size);
Array.from(matchingProps.entries())
  .sort((a, b) => a[1].localeCompare(b[1]))
  .forEach(([id, name]) => {
    console.log(`- ${name}`);
  });

process.exit(0);
