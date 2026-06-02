import type { Settings } from "@/store";
import { Badge } from "@/components/ui/8bit/badge";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { parseCrosshairCode } from "@/lib/crosshair";
import { CrosshairRenderer } from "@/components/CrosshairRenderer";
import { Reticles } from "@/components/Hud";

const LOCKED_MODES = [
  { idx: "02", tag: "Reflex",   name: "Spidershot",   desc: "Flicks largos para alvos em pontos fixos." },
  { idx: "03", tag: "Tracking", name: "Motion Track",  desc: "Mantenha a mira em um alvo em movimento." },
];

export function Menu({
  best,
  settings,
  onPlay,
  onSettings,
  onCrosshairs,
  onReplays,
}: {
  best: number | null;
  settings: Settings;
  onPlay: () => void;
  onSettings: () => void;
  onCrosshairs: () => void;
  onReplays: () => void;
}) {
  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(500px,90vw)]">
        <CardContent className="p-0">
          <div className="flex items-start justify-between px-6 pt-6 pb-5">
            <div>
              <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-3">Treino de mira</p>
              <h1 className="retro text-lg text-foreground leading-snug">AIM RANGE</h1>
            </div>
            <button onClick={onSettings} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Configurações">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <div className="border-t border-border">
            <button onClick={onPlay} className="group w-full flex items-center gap-5 px-6 py-5 text-left hover:bg-primary/5 transition-colors border-b border-border">
              <span className="font-mono text-3xl font-bold text-muted-foreground/40 group-hover:text-primary/60 transition-colors tabular-nums leading-none">01</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Clicking · 60s · 3 alvos</p>
                <p className="text-sm font-semibold text-foreground">Gridshot</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Flick e click clássico. Alvos aleatórios, acerte para o próximo aparecer.</p>
              </div>
              <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0">▶</span>
            </button>

            {LOCKED_MODES.map((p) => (
              <div key={p.idx} className="flex items-center gap-5 px-6 py-5 opacity-35 border-b border-border last:border-0">
                <span className="font-mono text-3xl font-bold text-muted-foreground tabular-nums leading-none">{p.idx}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{p.tag}</p>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider flex-shrink-0">Em breve</Badge>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 px-6 py-3 border-t border-border bg-muted/10">
            <button onClick={onCrosshairs} className="flex items-center gap-3 group hover:opacity-80 transition-opacity flex-shrink-0" title="Trocar crosshair">
              <div className="w-8 h-8 bg-[#0a121a] border border-border flex items-center justify-center group-hover:border-foreground/40 transition-colors">
                <CrosshairRenderer params={parseCrosshairCode(settings.crosshairCode)} size={28} />
              </div>
            </button>
            <button onClick={onReplays} className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors flex-shrink-0">
              Replays
            </button>
            <div className="w-px h-4 bg-border flex-shrink-0" />
            <div className="flex gap-5 flex-1 min-w-0">
              {[
                { k: "Recorde", v: best == null ? "—" : String(best) },
                { k: "Sens",    v: Number(settings.sens).toFixed(2) },
                { k: "DPI",     v: String(settings.dpi) },
              ].map((s) => (
                <div key={s.k} className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  {s.k} <span className="text-foreground font-bold">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
