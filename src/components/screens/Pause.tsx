import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { Reticles } from "@/components/Hud";

export function Pause({
  onResume,
  onSettings,
  onMenu,
}: {
  onResume: () => void;
  onSettings: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(360px,90vw)]">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <div>
            <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-3">Pausado</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Clique na tela para continuar. O cronômetro está parado.</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={onResume}>Continuar</Button>
            <Button variant="outline" onClick={onSettings}>Config</Button>
            <Button variant="outline" onClick={onMenu}>Menu</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
