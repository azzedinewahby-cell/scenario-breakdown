import { getDb } from "./server/db";
import { scenes } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

// Get scenes for scenario 60001
const sceneList = await db
  .select()
  .from(scenes)
  .where(eq(scenes.scenarioId, 60001))
  .limit(10);

console.log("Scenes for scenario 60001:");
sceneList.forEach(scene => {
  console.log(`\nScene ${scene.id}:`);
  console.log(`Description: ${scene.description?.substring(0, 200) || "NULL"}`);
});

process.exit(0);
