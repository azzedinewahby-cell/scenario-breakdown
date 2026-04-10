import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load env
config({ path: '.env' });
config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const connection = await createConnection(dbUrl);

console.log('Connected to database');

// Apply migrations that might be missing
const migrations = [
  {
    name: '0007 - Add screenwriter columns',
    sql: [
      "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterName` varchar(256)",
      "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterEmail` varchar(256)",
      "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterPhone` varchar(20)",
    ]
  },
  {
    name: '0010 - Add durationSeconds column',
    sql: [
      "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `durationSeconds` int DEFAULT 0",
    ]
  },
  {
    name: '0011 - Create budgets table',
    sql: [
      `CREATE TABLE IF NOT EXISTS \`budgets\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`scenarioId\` int NOT NULL,
        \`version\` enum('eco','confort') NOT NULL DEFAULT 'eco',
        \`shootingDays\` int DEFAULT 0,
        \`pagesPerDay\` int DEFAULT 0,
        \`totalBudgetEco\` int DEFAULT 0,
        \`totalBudgetConfort\` int DEFAULT 0,
        \`content\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`budgets_id\` PRIMARY KEY(\`id\`)
      )`
    ]
  }
];

for (const migration of migrations) {
  console.log(`\nApplying: ${migration.name}`);
  for (const stmt of migration.sql) {
    try {
      await connection.execute(stmt);
      console.log(`  ✓ ${stmt.substring(0, 60)}...`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`  ⚠ Already exists (skipped)`);
      } else {
        console.error(`  ✗ Error: ${err.message}`);
      }
    }
  }
}

// Verify columns exist
console.log('\nVerifying columns in scenarios table...');
const [cols] = await connection.execute("SHOW COLUMNS FROM `scenarios`");
const colNames = cols.map(c => c.Field);
console.log('Columns:', colNames.join(', '));

const required = ['screenwriterName', 'screenwriterEmail', 'screenwriterPhone', 'durationSeconds'];
for (const col of required) {
  if (colNames.includes(col)) {
    console.log(`  ✓ ${col} exists`);
  } else {
    console.error(`  ✗ ${col} MISSING!`);
  }
}

await connection.end();
console.log('\nDone!');
