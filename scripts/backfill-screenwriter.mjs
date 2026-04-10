/**
 * Script de backfill : extrait le nom du scénariste pour les scénarios existants via LLM
 * Usage: node scripts/backfill-screenwriter.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function extractScreenwriterFromFile(fileUrl, fileName) {
  if (!FORGE_API_URL || !FORGE_API_KEY) {
    console.warn('LLM API not available, skipping LLM extraction');
    return null;
  }

  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  
  const messages = [
    {
      role: 'system',
      content: `Tu es un assistant qui extrait uniquement le nom du scénariste/auteur d'un scénario de cinéma.
Cherche le nom sur la page de titre, après "Écrit par", "Written by", "De", "Par", ou en bas de la page de titre.
Réponds UNIQUEMENT en JSON valide : {"screenwriterName": "Prénom Nom", "screenwriterEmail": null, "screenwriterPhone": null}
Si tu ne trouves pas le nom, réponds : {"screenwriterName": null, "screenwriterEmail": null, "screenwriterPhone": null}`
    },
    {
      role: 'user',
      content: isPdf
        ? [
            { type: 'text', text: `Trouve le nom du scénariste dans ce scénario. Fichier: "${fileName}"` },
            { type: 'file_url', file_url: { url: fileUrl, mime_type: 'application/pdf' } }
          ]
        : [{ type: 'text', text: `Trouve le nom du scénariste dans ce scénario. Fichier: "${fileName}". URL: ${fileUrl}` }]
    }
  ];

  const response = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FORGE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'screenwriter_info',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              screenwriterName: { type: ['string', 'null'] },
              screenwriterEmail: { type: ['string', 'null'] },
              screenwriterPhone: { type: ['string', 'null'] }
            },
            required: ['screenwriterName', 'screenwriterEmail', 'screenwriterPhone'],
            additionalProperties: false
          }
        }
      }
    })
  });

  if (!response.ok) {
    console.warn(`LLM API error: ${response.status}`);
    return null;
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  const [scenarios] = await conn.execute(
    'SELECT id, title, fileName, fileUrl FROM scenarios WHERE status = "completed" AND (screenwriterName IS NULL OR screenwriterName = "")'
  );
  
  console.log(`Found ${scenarios.length} scenarios without screenwriter info`);
  
  for (const scenario of scenarios) {
    console.log(`\nProcessing: ${scenario.title} (${scenario.fileName})`);
    
    const info = await extractScreenwriterFromFile(scenario.fileUrl, scenario.fileName);
    
    if (info && info.screenwriterName) {
      await conn.execute(
        'UPDATE scenarios SET screenwriterName = ?, screenwriterEmail = ?, screenwriterPhone = ? WHERE id = ?',
        [info.screenwriterName, info.screenwriterEmail, info.screenwriterPhone, scenario.id]
      );
      console.log(`  ✓ Scénariste: ${info.screenwriterName}`);
      if (info.screenwriterEmail) console.log(`  ✓ Email: ${info.screenwriterEmail}`);
      if (info.screenwriterPhone) console.log(`  ✓ Tél: ${info.screenwriterPhone}`);
    } else {
      console.log(`  ⚠ Nom du scénariste non trouvé`);
    }
  }
  
  await conn.end();
  console.log('\nBackfill terminé !');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
