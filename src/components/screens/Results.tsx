import type { ResultsData } from "@/engine/AimEngine";
import { Button } from "@/components/ui/8bit/button";
import { Badge } from "@/components/ui/8bit/badge";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { Reticles } from "@/components/Hud";

export function Results({
  r,
  onAgain,
  onMenu,
}: {
  r: ResultsData;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const stats = [
    { v: `${r.acc}%`, k: "Precisão" },
    { v: `${r.rt}ms`, k: "Reação" },
    { v: r.tps, k: "Alvos/s" },
  ];

  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(480px,92vw)]">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-border">
            <div>
              <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Gridshot</p>
              <p className="text-sm font-medium text-foreground">Resultado</p>
            </div>
            {r.isRecord && <Badge variant="default" className="text-[9px] uppercase tracking-wider">Novo recorde</Badge>}
          </div>

          <div className="px-6 py-7 text-center border-b border-border">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Score</p>
            <p className="retro text-4xl text-primary tabular-nums leading-none">{r.score}</p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {stats.map((s) => (
              <div key={s.k} className="px-4 py-4 text-center">
                <p className="font-mono text-lg font-bold text-foreground tabular-nums leading-none">{s.v}</p>
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-2">{s.k}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <p className="text-[10px] font-mono text-muted-foreground">
              {r.hits}/{r.shots} acertos · {r.sens} sens @ {r.dpi} DPI
            </p>
            <div className="flex gap-3">
              <Button onClick={onAgain}>De novo</Button>
              <Button variant="outline" onClick={onMenu}>Menu</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
