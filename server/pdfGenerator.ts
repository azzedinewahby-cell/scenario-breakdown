/**
 * Generate an HTML string for the scenario breakdown, suitable for client-side PDF rendering.
 * Condensed layout, professional cinema style.
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
  props: string[];
  stats: {
    totalScenes: number;
    totalCharacters: number;
    totalLocations: number;
    totalProps: number;
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
      const heading = [scene.intExt, scene.location, scene.dayNight ? `— ${scene.dayNight}` : null]
        .filter(Boolean)
        .join(" ");
      return `<tr>
        <td class="seq-num">${String(scene.sceneNumber).padStart(3, "0")}</td>
        <td class="seq-heading">${escapeHtml(heading)}</td>
        <td class="seq-summary">${scene.description ? escapeHtml(scene.description) : "<span class='empty'>—</span>"}</td>
      </tr>`;
    })
    .join("");

  const charactersHtml = data.characters.length > 0
    ? data.characters.map((c) => `<span class="badge">${escapeHtml(c)}</span>`).join("")
    : "<span class='empty'>Aucun personnage</span>";

  const locationsHtml = data.uniqueLocations.length > 0
    ? data.uniqueLocations.map((l) => `<span class="badge loc">${escapeHtml(l)}</span>`).join("")
    : "<span class='empty'>Aucun lieu</span>";

  const propsHtml = data.props.length > 0
    ? data.props.map((p) => `<span class="badge prop">${escapeHtml(p)}</span>`).join("")
    : "<span class='empty'>Aucun accessoire</span>";

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
      font-size: 9pt;
      color: #111;
      line-height: 1.4;
      background: #fff;
      padding: 28px 36px;
    }

    /* ── Header ── */
    .doc-header {
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .doc-header h1 {
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: -0.3px;
      line-height: 1.1;
      margin-bottom: 6px;
    }
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 8.5pt;
      color: #444;
    }
    .header-meta .item { display: flex; gap: 5px; align-items: baseline; }
    .header-meta .lbl { font-weight: 600; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.8px; color: #888; }
    .header-meta .val { color: #111; font-weight: 500; }

    /* ── Stats bar ── */
    .stats-bar {
      display: flex;
      gap: 0;
      margin-bottom: 14px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .stat {
      flex: 1;
      text-align: center;
      padding: 6px 4px;
      border-right: 1px solid #e0e0e0;
    }
    .stat:last-child { border-right: none; }
    .stat .val { font-size: 13pt; font-weight: 700; display: block; color: #111; }
    .stat .lbl { font-size: 7pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Sections ── */
    .section { margin-bottom: 14px; }
    .section-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #888;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e8e8e8;
    }

    /* Badges */
    .badges { display: flex; flex-wrap: wrap; gap: 4px; }
    .badge {
      font-size: 8pt;
      background: #f4f4f4;
      color: #333;
      padding: 2px 8px;
      border-radius: 3px;
      border: 1px solid #e0e0e0;
    }
    .badge.loc { background: #f0f4ff; border-color: #c8d8f0; color: #2a4a80; }
    .badge.prop { background: #fff8f0; border-color: #f0d8b0; color: #7a4a10; }

    /* Sequences table */
    .seq-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    .seq-table thead tr {
      background: #f8f8f8;
      border-bottom: 1px solid #ddd;
    }
    .seq-table thead th {
      text-align: left;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #888;
      padding: 4px 6px;
    }
    .seq-table tbody tr {
      border-bottom: 1px solid #f0f0f0;
      page-break-inside: avoid;
    }
    .seq-table tbody tr:last-child { border-bottom: none; }
    .seq-num {
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      color: #aaa;
      padding: 4px 6px;
      white-space: nowrap;
      vertical-align: top;
      width: 36px;
    }
    .seq-heading {
      font-weight: 600;
      font-size: 8.5pt;
      color: #111;
      padding: 4px 8px 4px 0;
      vertical-align: top;
      width: 32%;
      white-space: nowrap;
    }
    .seq-summary {
      font-size: 8.5pt;
      color: #444;
      padding: 4px 6px 4px 0;
      vertical-align: top;
      line-height: 1.4;
    }
    .empty { color: #ccc; font-style: italic; }

    /* Footer */
    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e8e8e8;
      font-size: 7.5pt;
      color: #bbb;
      text-align: center;
    }

    @media print {
      body { padding: 16px 24px; }
      .seq-table tbody tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="doc-header">
    <h1>${escapeHtml(data.title)}</h1>
    <div class="header-meta">
      ${data.screenwriterName ? `<div class="item"><span class="lbl">Scénariste</span><span class="val">${escapeHtml(data.screenwriterName)}</span></div>` : ""}
      ${data.durationLabel ? `<div class="item"><span class="lbl">Durée</span><span class="val">${escapeHtml(data.durationLabel)}</span></div>` : ""}
      <div class="item"><span class="lbl">Date</span><span class="val">${escapeHtml(data.date)}</span></div>
      <div class="item"><span class="lbl">Fichier</span><span class="val">${escapeHtml(data.fileName)}</span></div>
    </div>
  </div>

  <!-- STATS BAR -->
    <div class="stats-bar">
    <div class="stat"><span class="val">${data.stats.totalScenes}</span><span class="lbl">Séquences</span></div>
    <div class="stat"><span class="val">${data.stats.totalCharacters}</span><span class="lbl">Personnages</span></div>
    <div class="stat"><span class="val">${data.stats.totalLocations}</span><span class="lbl">Lieux</span></div>
    <div class="stat"><span class="val">${data.stats.totalProps}</span><span class="lbl">Accessoires</span></div>
  </div>

  <!-- PERSONNAGES -->
  <div class="section">
    <div class="section-title">Personnages (${data.characters.length})</div>
    <div class="badges">${charactersHtml}</div>
  </div>

  <!-- LIEUX -->
  <div class="section">
    <div class="section-title">Lieux &amp; Décors (${data.uniqueLocations.length})</div>
    <div class="badges">${locationsHtml}</div>
  </div>

  <!-- ACCESSOIRES -->
  <div class="section">
    <div class="section-title">Accessoires (${data.props.length})</div>
    <div class="badges">${propsHtml}</div>
  </div>

  <!-- SÉQUENCES -->
  <div class="section">
    <div class="section-title">Séquences (${data.stats.totalScenes})</div>
    <table class="seq-table">
      <thead>
        <tr>
          <th>N°</th>
          <th>Intitulé</th>
          <th>Résumé</th>
        </tr>
      </thead>
      <tbody>
        ${sequencesHtml}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Dépouillement — ${escapeHtml(data.title)}${data.screenwriterName ? ` — ${escapeHtml(data.screenwriterName)}` : ""} — ${escapeHtml(data.date)}
  </div>

</body>
</html>`;
}
