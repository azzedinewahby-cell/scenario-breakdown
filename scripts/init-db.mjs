import { createConnection } from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TIMEOUT_MS = 30000; // 30 secondes max

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn('[DB] DATABASE_URL manquant - démarrage sans init DB');
  process.exit(0); // exit 0 pour ne pas bloquer le serveur
}

let conn;
try {
  conn = await Promise.race([
    createConnection(dbUrl),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), TIMEOUT_MS))
  ]);
  console.log('[DB] ✅ Connecté');
} catch (e) {
  console.warn('[DB] ⚠ Connexion échouée:', e.message, '- démarrage sans init DB');
  process.exit(0); // exit 0 = ne pas bloquer le serveur
}

async function exec(sql) {
  const stmt = sql.trim();
  if (!stmt || stmt.startsWith('--')) return;
  try {
    await conn.execute(stmt);
  } catch (e) {
    const ignored = ['ER_TABLE_EXISTS_ERROR','ER_DUP_FIELDNAME','ER_DUP_KEYNAME','ER_MULTIPLE_PRI_KEY','ER_FK_DUP_NAME'];
    if (!ignored.includes(e.code)) {
      console.warn(`  [DB] ⚠ ${e.code}: ${e.message.substring(0, 80)}`);
    }
  }
}

try {
  const drizzleDir = join(ROOT, 'drizzle');
  const sqlFiles = readdirSync(drizzleDir)
    .filter(f => f.endsWith('.sql') && !f.includes('add_salary'))
    .sort();

  console.log(`[DB] Application de ${sqlFiles.length} migrations...`);
  for (const file of sqlFiles) {
    const content = readFileSync(join(drizzleDir, file), 'utf8');
    const statements = content
      .split('--> statement-breakpoint')
      .flatMap(s => s.split(';'))
      .map(s => s.trim())
      .filter(Boolean);
    for (const stmt of statements) await exec(stmt);
    process.stdout.write('.');
  }
  console.log('\n[DB] ✅ Migrations OK');

  // Colonnes supplémentaires
  const extras = [
    "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterName` varchar(256)",
    "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterEmail` varchar(256)",
    "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `screenwriterPhone` varchar(20)",
    "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `durationSeconds` int DEFAULT 0",
    "ALTER TABLE `scenarios` ADD COLUMN IF NOT EXISTS `synopsis` text",
    "ALTER TABLE `characters` ADD COLUMN IF NOT EXISTS `gender` enum('male','female','unknown') DEFAULT 'unknown'",
    "ALTER TABLE `characters` ADD COLUMN IF NOT EXISTS `age` enum('adult','child','unknown') DEFAULT 'adult'",
    "ALTER TABLE `company_settings` ADD COLUMN IF NOT EXISTS `tradeName` varchar(256)",
  ];
  for (const sql of extras) {
    try { await conn.execute(sql); } catch {}
  }
  console.log('[DB] ✅ Colonnes vérifiées');
} catch (e) {
  console.warn('[DB] ⚠ Erreur migrations:', e.message);
} finally {
  try { await conn.end(); } catch {}
}

console.log('[DB] Init terminée');
