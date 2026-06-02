import type { Replay } from "@/engine/replay-types";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { Reticles } from "@/components/Hud";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ReplayList({
  replays,
  onWatch,
  onClose,
}: {
  replays: Replay[];
  onWatch: (r: Replay) => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(520px,90vw)] max-h-[80vh] overflow-hidden flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-bold text-foreground">Replays</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xs">
              Fechar
            </button>
          </div>

          {replays.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest text-center">
                Nenhum replay salvo. Complete uma partida para salvar.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {replays.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onWatch(r)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors text-left"
                >
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">
                      {fmtDate(r.date)} · Gridshot {r.duration}s
                    </p>
                    <div className="flex gap-4">
                      <span className="font-mono text-sm font-bold text-foreground tabular-nums">{r.score}</span>
                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums self-end mb-0.5">{r.acc}% acc</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">▶</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
