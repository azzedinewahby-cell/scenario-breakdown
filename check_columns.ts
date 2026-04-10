import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

try {
  // Check if columns exist
  const result = await db.execute(
    sql`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'scenarios' AND COLUMN_NAME IN ('screenwriterName', 'screenwriterEmail', 'screenwriterPhone')`
  );
  
  console.log("Existing columns:", result);
  
  if (result.length === 0) {
    console.log("Columns don't exist yet, need to add them");
  } else {
    console.log("Columns already exist");
  }
} catch (error: any) {
  console.error("Error:", error.message);
}

process.exit(0);
