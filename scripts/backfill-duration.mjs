/**
 * Script de backfill : calcule et sauvegarde la durée pour tous les scénarios existants
 * Usage: node scripts/backfill-duration.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function calculateDurationForScenario(conn, scenarioId) {
  const [sceneRows] = await conn.execute(
    'SELECT description FROM scenes WHERE scenarioId = ?',
    [scenarioId]
  );
  
  if (sceneRows.length === 0) return 0;

  let totalSeconds = 0;
  for (const scene of sceneRows) {
    if (!scene.description) continue;
    const lines = scene.description.split('\n').length;
    const words = scene.description.split(/\s+/).length;
    const estimatedPages = Math.max(1, Math.round(words / 250));
    let duration = estimatedPages * 60;

    const description = scene.description.toLowerCase();
    const actionKeywords = ['court', 'saute', 'tire', 'explose', 'crash', 'poursuit', 'combat', 'chute', 'fuit', 'attaque', 'frappe', 'course', 'explosion', 'poursuite'];
    const contemplativeKeywords = ['silence', 'contemple', 'regarde', 'pense', 'rêve', 'souvenir', 'flashback', 'montage', 'musique', 'poétique', 'lent'];
    const hasActionKeywords = actionKeywords.some(k => description.includes(k));
    const hasContemplativeKeywords = contemplativeKeywords.some(k => description.includes(k));
    const dialogueMatches = scene.description.match(/^[A-Z\s]+:/gm) || [];
    const dialogueRatio = dialogueMatches.length / (lines || 1);

    if (hasContemplativeKeywords && !hasActionKeywords) {
      duration = Math.round(duration * 1.4);
    } else if (hasActionKeywords) {
      duration = Math.round(duration * 1.2);
    } else if (dialogueRatio > 0.4) {
      duration = Math.round(duration * 0.8);
    }
    totalSeconds += Math.max(3, duration);
  }
  return totalSeconds;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  const [scenarios] = await conn.execute(
    'SELECT id, title FROM scenarios WHERE status = "completed"'
  );
  
  console.log(`Found ${scenarios.length} completed scenarios to process`);
  
  for (const scenario of scenarios) {
    const duration = await calculateDurationForScenario(conn, scenario.id);
    await conn.execute(
      'UPDATE scenarios SET durationSeconds = ? WHERE id = ?',
      [duration, scenario.id]
    );
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    console.log(`✓ ${scenario.title}: ${minutes}min ${seconds}s (${duration}s total)`);
  }
  
  await conn.end();
  console.log('\nBackfill terminé !');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
