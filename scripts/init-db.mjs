// Script d'initialisation complète de la base de données
import { createConnection } from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL manquant'); process.exit(1); }

const conn = await createConnection(dbUrl);
console.log('✅ Connecté à la base de données');

// Exécute un statement SQL en ignorant les erreurs "already exists"
async function exec(sql) {
  const stmt = sql.trim();
  if (!stmt || stmt.startsWith('--') || stmt === '\\n') return;
  try {
    await conn.execute(stmt);
  } catch (e) {
    const ignored = ['ER_TABLE_EXISTS_ERROR','ER_DUP_FIELDNAME','ER_DUP_KEYNAME','ER_MULTIPLE_PRI_KEY'];
    if (!ignored.includes(e.code)) {
      console.warn(`  ⚠ ${e.code}: ${e.message.substring(0, 80)}`);
    }
  }
}

// 1. Appliquer tous les fichiers SQL Drizzle dans l'ordre
const drizzleDir = join(ROOT, 'drizzle');
const sqlFiles = readdirSync(drizzleDir)
  .filter(f => f.endsWith('.sql') && !f.includes('add_salary'))
  .sort();

console.log(`\n📦 Application des migrations SQL (${sqlFiles.length} fichiers)...`);
for (const file of sqlFiles) {
  const content = readFileSync(join(drizzleDir, file), 'utf8');
  const statements = content.split('--> statement-breakpoint').flatMap(s => s.split(';')).map(s => s.trim()).filter(Boolean);
  process.stdout.write(`  ${file}... `);
  for (const stmt of statements) await exec(stmt);
  console.log('✓');
}

// 2. Corrections spécifiques (colonnes ajoutées après coup)
console.log('\n🔧 Vérification des colonnes supplémentaires...');
const extras = [
  "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterName` varchar(256)",
  "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterEmail` varchar(256)",
  "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterPhone` varchar(20)",
  "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `durationSeconds` int DEFAULT 0",
  "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `synopsis` text",
  "ALTER TABLE `characters` ADD COLUMN IF NOT EXISTS `gender` enum('male','female','unknown') DEFAULT 'unknown'",
  "ALTER TABLE `characters` ADD COLUMN IF NOT EXISTS `age` enum('adult','child','unknown') DEFAULT 'adult'",
];
for (const sql of extras) {
  try { await conn.execute(sql); process.stdout.write('.'); }
  catch(e) { process.stdout.write('.'); }
}
console.log(' ✓');

await conn.end();
console.log('\n✅ Base de données prête !');
