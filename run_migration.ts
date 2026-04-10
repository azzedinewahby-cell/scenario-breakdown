import { getDb } from "./server/db";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

// Execute the migration SQL
const sql = `
ALTER TABLE \`scenarios\` ADD \`screenwriterName\` varchar(256);
ALTER TABLE \`scenarios\` ADD \`screenwriterEmail\` varchar(256);
ALTER TABLE \`scenarios\` ADD \`screenwriterPhone\` varchar(20);
`;

try {
  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    console.log("Executing:", statement.trim());
    await db.execute(statement);
  }
  console.log("✅ Migration completed successfully");
} catch (error: any) {
  if (error.message?.includes("Duplicate column")) {
    console.log("⚠️  Columns already exist, skipping");
  } else {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

process.exit(0);
