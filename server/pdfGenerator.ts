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
  screenwriterName?: string | null;
  durationLabel?: string | null;
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
  const sequencesHtml = data.scenes
    .map((scene) => {
      const heading = [
        scene.intExt,
        scene.location,
        scene.dayNight ? `— ${scene.dayNight}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <div class="sequence">
          <div class="seq-header">
            <span class="seq-num">${String(scene.sceneNumber).padStart(3, "0")}</span>
            <span class="seq-heading">${escapeHtml(heading)}</span>
          </div>
          ${scene.description ? `<div class="seq-summary">${escapeHtml(scene.description)}</div>` : ""}
        </div>`;
    })
    .join("");

  const screenwriterLine = data.screenwriterName
    ? `<div class="meta-item"><span class="meta-label">Scénariste</span><span class="meta-value">${escapeHtml(data.screenwriterName)}</span></div>`
    : "";

  const durationLine = data.durationLabel
    ? `<div class="meta-item"><span class="meta-label">Durée estimée</span><span class="meta-value">${escapeHtml(data.durationLabel)}</span></div>`
    : "";

  const charactersHtml = data.characters.length > 0
    ? data.characters.map((c) => `<span class="badge">${escapeHtml(c)}</span>`).join("")
    : "<span class=\"empty\">Aucun personnage</span>";

  const locationsHtml = data.uniqueLocations.length > 0
    ? `<ul class="locations-list">${data.uniqueLocations.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
    : "<span class=\"empty\">Aucun lieu</span>";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dépouillement — ${escapeHtml(data.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      line-height: 1.55;
      background: #fff;
    }

    /* ── Cover page ── */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px 56px;
      border-bottom: 3px solid #1a1a1a;
      page-break-after: always;
    }
    .cover-label {
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 20px;
    }
    .cover-title {
      font-size: 36pt;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 32px;
      color: #1a1a1a;
    }
    .cover-meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 40px;
    }
    .meta-item {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }
    .meta-label {
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      min-width: 110px;
    }
    .meta-value {
      font-size: 10.5pt;
      color: #1a1a1a;
    }
    .cover-stats {
      display: flex;
      gap: 32px;
      padding-top: 32px;
      border-top: 1px solid #e0e0e0;
      margin-top: auto;
    }
    .stat { }
    .stat .val {
      font-size: 22pt;
      font-weight: 700;
      display: block;
      color: #1a1a1a;
    }
    .stat .lbl {
      font-size: 8pt;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Content pages ── */
    .content {
      padding: 48px 56px;
    }

    .section {
      margin-bottom: 36px;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #888;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }

    /* Characters */
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .badge {
      font-size: 9pt;
      background: #f4f4f4;
      color: #333;
      padding: 3px 10px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    /* Locations */
    .locations-list {
      list-style: none;
      columns: 2;
      column-gap: 32px;
    }
    .locations-list li {
      font-size: 9.5pt;
      padding: 3px 0;
      break-inside: avoid;
      color: #333;
    }
    .locations-list li::before {
      content: "—";
      color: #bbb;
      margin-right: 8px;
    }

    /* Sequences */
    .sequence {
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      page-break-inside: avoid;
    }
    .sequence:last-child { border-bottom: none; }
    .seq-header {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 4px;
    }
    .seq-num {
      font-family: 'Courier New', monospace;
      font-size: 8.5pt;
      color: #aaa;
      background: #f8f8f8;
      padding: 1px 6px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .seq-heading {
      font-weight: 600;
      font-size: 10pt;
      color: #1a1a1a;
    }
    .seq-summary {
      font-size: 9.5pt;
      color: #555;
      padding-left: 36px;
      line-height: 1.5;
    }

    .empty { font-size: 9pt; color: #bbb; font-style: italic; }

    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 12px;
      border-top: 1px solid #e8e8e8;
      font-size: 8pt;
      color: #bbb;
      text-align: center;
    }

    @media print {
      .cover { min-height: 100vh; }
      .sequence { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-label">Dépouillement</div>
    <div class="cover-title">${escapeHtml(data.title)}</div>

    <div class="cover-meta">
      ${screenwriterLine}
      ${durationLine}
      <div class="meta-item">
        <span class="meta-label">Date</span>
        <span class="meta-value">${escapeHtml(data.date)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Fichier</span>
        <span class="meta-value">${escapeHtml(data.fileName)}</span>
      </div>
    </div>

    <div class="cover-stats">
      <div class="stat">
        <span class="val">${data.stats.totalScenes}</span>
        <span class="lbl">Séquences</span>
      </div>
      <div class="stat">
        <span class="val">${data.stats.totalCharacters}</span>
        <span class="lbl">Personnages</span>
      </div>
      <div class="stat">
        <span class="val">${data.stats.totalLocations}</span>
        <span class="lbl">Décors</span>
      </div>
    </div>
  </div>

  <!-- CONTENT PAGES -->
  <div class="content">

    <!-- Personnages -->
    <div class="section">
      <div class="section-title">Personnages (${data.characters.length})</div>
      <div class="badges">${charactersHtml}</div>
    </div>

    <!-- Lieux / Décors -->
    <div class="section">
      <div class="section-title">Lieux &amp; Décors (${data.uniqueLocations.length})</div>
      ${locationsHtml}
    </div>

    <!-- Séquences -->
    <div class="section">
      <div class="section-title">Séquences (${data.stats.totalScenes})</div>
      ${sequencesHtml}
    </div>

    <div class="footer">
      Dépouillement généré automatiquement &mdash; ${escapeHtml(data.title)}
    </div>

  </div>

</body>
</html>`;
}
