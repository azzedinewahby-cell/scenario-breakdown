/**
 * Generate an HTML string for the scenario breakdown, suitable for client-side PDF rendering.
 * Returns styled HTML that can be converted to PDF via the browser's print-to-PDF or a library.
 */

interface PdfScene {
  sceneNumber: number;
  intExt: string | null;
  location: string | null;
  dayNight: string | null;
  description: string | null;
  characters: string[];
  dialogues: { character: string; text: string }[];
}

interface PdfBreakdownData {
  title: string;
  fileName: string;
  date: string;
  scenes: PdfScene[];
  characters: string[];
  uniqueLocations: string[];
  stats: {
    totalScenes: number;
    totalCharacters: number;
    totalLocations: number;
    totalDialogues: number;
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateBreakdownHtml(data: PdfBreakdownData): string {
  const scenesHtml = data.scenes
    .map((scene) => {
      const charsHtml =
        scene.characters.length > 0
          ? `<div class="scene-chars"><span class="label">Personnages :</span> ${scene.characters.map((c) => escapeHtml(c)).join(", ")}</div>`
          : "";

      const dialoguesHtml =
        scene.dialogues.length > 0
          ? `<div class="dialogues">${scene.dialogues
              .map(
                (d) =>
                  `<div class="dialogue"><span class="dial-char">${escapeHtml(d.character)}</span><span class="dial-text">${escapeHtml(d.text)}</span></div>`
              )
              .join("")}</div>`
          : "";

      const heading = [
        scene.intExt,
        scene.location,
        scene.dayNight ? `— ${scene.dayNight}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <div class="scene">
          <div class="scene-header">
            <span class="scene-num">${String(scene.sceneNumber).padStart(3, "0")}</span>
            <span class="scene-heading">${escapeHtml(heading)}</span>
          </div>
          ${scene.description ? `<div class="scene-desc">${escapeHtml(scene.description)}</div>` : ""}
          ${charsHtml}
          ${dialoguesHtml}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dépouillement — ${escapeHtml(data.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      line-height: 1.5;
      padding: 40px;
    }

    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 22pt;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header .meta {
      font-size: 9pt;
      color: #666;
    }

    .stats {
      display: flex;
      gap: 24px;
      margin-bottom: 28px;
      padding: 12px 16px;
      background: #f8f8f8;
      border-radius: 6px;
    }
    .stat { text-align: center; }
    .stat .val { font-size: 18pt; font-weight: 600; display: block; }
    .stat .lbl { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }

    .section-title {
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      margin-top: 24px;
      color: #333;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 6px;
    }

    .locations-list {
      list-style: none;
      columns: 2;
      column-gap: 24px;
      margin-bottom: 8px;
    }
    .locations-list li {
      font-size: 9.5pt;
      padding: 2px 0;
      break-inside: avoid;
    }
    .locations-list li::before {
      content: "\\2022";
      color: #999;
      margin-right: 6px;
    }

    .chars-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    .char-badge {
      font-size: 8.5pt;
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 3px;
    }

    .scene {
      margin-bottom: 16px;
      page-break-inside: avoid;
      border-left: 3px solid #e0e0e0;
      padding-left: 12px;
    }
    .scene-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }
    .scene-num {
      font-family: monospace;
      font-size: 9pt;
      color: #999;
      background: #f5f5f5;
      padding: 1px 6px;
      border-radius: 3px;
    }
    .scene-heading {
      font-weight: 600;
      font-size: 10pt;
    }
    .scene-desc {
      font-size: 9.5pt;
      color: #555;
      margin-bottom: 4px;
    }
    .scene-chars {
      font-size: 9pt;
      margin-bottom: 4px;
    }
    .scene-chars .label {
      font-weight: 500;
      color: #666;
    }

    .dialogues { margin-top: 6px; }
    .dialogue {
      margin-bottom: 4px;
      padding-left: 12px;
    }
    .dial-char {
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      display: block;
      color: #444;
    }
    .dial-text {
      font-size: 9pt;
      color: #333;
    }

    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
      font-size: 8pt;
      color: #999;
      text-align: center;
    }

    @media print {
      body { padding: 20px; }
      .scene { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.title)}</h1>
    <div class="meta">${escapeHtml(data.fileName)} &mdash; ${escapeHtml(data.date)}</div>
  </div>

  <div class="stats">
    <div class="stat"><span class="val">${data.stats.totalScenes}</span><span class="lbl">Scènes</span></div>
    <div class="stat"><span class="val">${data.stats.totalCharacters}</span><span class="lbl">Personnages</span></div>
    <div class="stat"><span class="val">${data.stats.totalLocations}</span><span class="lbl">Lieux</span></div>
    <div class="stat"><span class="val">${data.stats.totalDialogues}</span><span class="lbl">Dialogues</span></div>
  </div>

  <div class="section-title">Personnages</div>
  <div class="chars-list">
    ${data.characters.map((c) => `<span class="char-badge">${escapeHtml(c)}</span>`).join("")}
  </div>

  <div class="section-title">Lieux</div>
  <ul class="locations-list">
    ${data.uniqueLocations.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
  </ul>

  <div class="section-title">Dépouillement des scènes</div>
  ${scenesHtml}

  <div class="footer">
    Dépouillement généré automatiquement &mdash; ${escapeHtml(data.title)}
  </div>
</body>
</html>`;
}
