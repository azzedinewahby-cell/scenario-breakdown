import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, RefreshCw } from "lucide-react";

const STORAGE_KEY = (id: number) => `schema_${id}`;

const ACTS_COLORS = [
  { bg: "#EBF4FD", border: "#90C3E8", title: "#1A5F9E", sqBg: "#F4F9FE", sqBorder: "#C0DAF0" },
  { bg: "#FEF3DC", border: "#F0C060", title: "#8A5A00", sqBg: "#FFFBF2", sqBorder: "#F0D898" },
  { bg: "#FDECEA", border: "#F0A090", title: "#9E2A1A", sqBg: "#FFF6F5", sqBorder: "#F0B8B0" },
  { bg: "#E6F5EE", border: "#80C8A0", title: "#1A6E40", sqBg: "#F2FAF5", sqBorder: "#A0D8B8" },
];

type SchemaData = {
  title: string;
  totalScenes: number;
  acts: {
    number: number;
    title: string;
    subtitle: string;
    scenes: {
      num: string;
      title: string;
      beat?: string;
      isKey?: boolean;
    }[];
  }[];
  tensionPoints: { x: number; tension: number; label?: string }[];
};

export function SchemaTab({ scenarioId }: { scenarioId: number }) {
  const [schema, setSchema] = useState<SchemaData | null>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY(scenarioId));
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const mutation = trpc.breakdown.generateSchema.useMutation({
    onSuccess: (data) => {
      setSchema(data);
      try { localStorage.setItem(STORAGE_KEY(scenarioId), JSON.stringify(data)); } catch {}
    },
  });

  const handleReset = () => {
    setSchema(null);
    try { localStorage.removeItem(STORAGE_KEY(scenarioId)); } catch {}
  };

  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <BarChart2 className="w-12 h-12 text-slate-300" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-slate-800">Schéma narratif</h3>
          <p className="text-slate-500 max-w-md text-sm">
            Génère un schéma visuel complet de ton scénario : arc de tension dramatique, découpage en actes, beats clés et séquences.
          </p>
        </div>
        <Button onClick={() => mutation.mutate({ scenarioId })} disabled={mutation.isPending} size="lg" className="gap-2">
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</> : <><BarChart2 className="w-4 h-4" /> Générer le schéma</>}
        </Button>
        {mutation.isError && <p className="text-sm text-red-500">{mutation.error?.message}</p>}
      </div>
    );
  }

  // Courbe de tension SVG
  const W = 680, H = 140;
  const pts = schema.tensionPoints;
  const pathD = pts.length > 1
    ? pts.map((p, i) => {
        const x = 40 + (p.x / 100) * (W - 50);
        const y = H - 20 - (p.tension / 100) * (H - 40);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ")
    : "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{schema.title} — Schéma narratif</h3>
          <p className="text-sm text-slate-400">{schema.totalScenes} scènes · {schema.acts.length} actes</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RefreshCw className="w-3 h-3" /> Régénérer
        </Button>
      </div>

      {/* ARC DE TENSION */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 16px 12px", border: "1px solid #e5e4e0" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display: "block" }}>
          {/* Bandes actes */}
          {schema.acts.map((act, i) => {
            const c = ACTS_COLORS[i % ACTS_COLORS.length];
            const totalScenes = schema.acts.reduce((s, a) => s + a.scenes.length, 0);
            const prevScenes = schema.acts.slice(0, i).reduce((s, a) => s + a.scenes.length, 0);
            const x = 40 + (prevScenes / totalScenes) * (W - 50);
            const w = (act.scenes.length / totalScenes) * (W - 50);
            const midX = x + w / 2;
            return (
              <g key={i}>
                <rect x={x} y={10} width={w} height={55} rx={4} fill={c.bg} stroke={c.border} strokeWidth={0.5} />
                <text x={midX} y={26} textAnchor="middle" fontSize={11} fontWeight={600} fill={c.title}>Acte {act.number}</text>
                <text x={midX} y={48} textAnchor="middle" fontSize={8} fill="#999">Séq. {act.scenes[0]?.num}–{act.scenes[act.scenes.length-1]?.num}</text>
              </g>
            );
          })}

          {/* Courbe tension */}
          {pathD && <path d={pathD} fill="none" stroke="#555" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

          {/* Labels beats clés — en dessous de la courbe */}
          {pts.filter(p => p.label).map((p, idx) => {
            const x = 40 + (p.x / 100) * (W - 50);
            const y = H - 20 - (p.tension / 100) * (H - 40);
            return (
              <g key={idx}>
                <line x1={x} y1={y + 3} x2={x} y2={H + 8} stroke="#9E2A1A" strokeWidth={0.8} strokeDasharray="2 2" />
                <text x={x} y={H + 22} textAnchor="middle" fontSize={8} fontWeight={600} fill="#9E2A1A">{p.label}</text>
              </g>
            );
          })}
        </svg>

        {/* Légende */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#666", marginTop: 8, alignItems: "center" }}>
          {schema.acts.map((act, i) => (
            <span key={i}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: ACTS_COLORS[i % ACTS_COLORS.length].title, display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
              Acte {act.number}
            </span>
          ))}
          <span style={{ border: "2px solid #999", borderRadius: 3, padding: "0 4px", fontSize: 10 }}>cadre épais</span>
          <span>= beat clé</span>
        </div>
      </div>

      {/* GRILLES PAR ACTE */}
      {schema.acts.map((act, i) => {
        const c = ACTS_COLORS[i % ACTS_COLORS.length];
        return (
          <div key={i} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.title }}>Acte {act.number} — {act.title}</span>
              <span style={{ fontSize: 11, color: "#888" }}>({act.scenes.length} scènes)</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {act.scenes.map((scene, j) => (
                <div key={j} style={{
                  width: 128, minHeight: 54, padding: "7px 9px", borderRadius: 7,
                  border: `${scene.isKey ? 2 : 1}px solid ${c.sqBorder}`,
                  background: c.sqBg,
                  display: "flex", flexDirection: "column",
                  transition: "transform .12s, box-shadow .12s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, marginBottom: 3, color: c.title }}>{scene.num}</span>
                  <span style={{ fontSize: 11, lineHeight: 1.35, color: "#333" }}>{scene.title}</span>
                  {scene.beat && <span style={{ fontSize: 9, fontWeight: 600, marginTop: 4, color: c.title }}>{scene.beat}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
