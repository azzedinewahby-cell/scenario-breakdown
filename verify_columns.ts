import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

try {
  // Check if columns exist and their types
  const result = await db.execute(
    sql`SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'scenarios' AND COLUMN_NAME IN ('screenwriterName', 'screenwriterEmail', 'screenwriterPhone')
        ORDER BY COLUMN_NAME`
  );
  
  console.log("✅ Screenwriter columns in database:");
  result[0].forEach((col: any) => {
    console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE})`);
  });
  
  // Test that we can select these columns
  const testQuery = await db.execute(
    sql`SELECT id, screenwriterName, screenwriterEmail, screenwriterPhone FROM scenarios LIMIT 1`
  );
  
  console.log("\n✅ Query test successful - columns are accessible");
  if (testQuery[0].length > 0) {
    console.log("  Sample row:", testQuery[0][0]);
  }
  
} catch (error: any) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}

process.exit(0);
