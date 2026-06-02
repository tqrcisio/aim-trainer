import type { Settings } from "@/store";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Card, CardContent } from "@/components/ui/8bit/card";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/8bit/select";
import { Reticles } from "@/components/Hud";

const DPI_PRESETS = [400, 800, 1600] as const;

const fmtSens = (v: number) =>
  Number(v).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") || "0";

const cm360 = (sens: number, dpi: number) => (360 / (sens * 0.07) / dpi) * 2.54;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const isCustomDpi = !DPI_PRESETS.includes(settings.dpi as (typeof DPI_PRESETS)[number]);

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    let val: string | number = raw;
    if (key === "sens") val = Math.max(0.01, parseFloat(raw) || 0.01);
    else if (key === "dpi") val = Math.max(50, parseInt(raw) || 800);
    else if (key === "fov" || key === "invert") val = parseInt(raw);
    onChange({ [key]: val } as Partial<Settings>);
  };

  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(560px,90vw)]">
        <CardContent className="p-0">
          <div className="px-6 pt-6 pb-5 border-b border-border">
            <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-3">Config</p>
            <h2 className="text-base font-semibold text-foreground">Configurações</h2>
          </div>

          <div className="px-6 py-5 border-b border-border">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Sensibilidade</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Sens Valorant — {fmtSens(settings.sens)}</FieldLabel>
                <Input type="number" min="0.05" max="5" step="0.001" value={settings.sens} onChange={set("sens")} />
              </div>
              <div>
                <FieldLabel>DPI — {settings.dpi}</FieldLabel>
                <Select
                  value={isCustomDpi ? "custom" : String(settings.dpi)}
                  onValueChange={(v) => onChange({ dpi: v !== "custom" ? Number(v) : settings.dpi })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DPI_PRESETS.map((d) => <SelectItem key={d} value={String(d)}>{d} DPI</SelectItem>)}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {isCustomDpi && (
                  <Input type="number" min="100" max="6400" step="50" value={settings.dpi} onChange={set("dpi")} className="mt-2" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px mt-4 border border-border bg-border">
              {[
                { v: Math.round(settings.sens * settings.dpi), k: "eDPI" },
                { v: `~${cm360(settings.sens, settings.dpi).toFixed(1)} cm`, k: "cm / 360°" },
                { v: `${(settings.sens * 0.07).toFixed(3)}°`, k: "graus / ct" },
              ].map((s) => (
                <div key={s.k} className="bg-card px-3 py-3">
                  <p className="font-mono text-base font-bold text-foreground tabular-nums leading-none">{s.v}</p>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-1.5">{s.k}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-5 border-b border-border">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Range</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>FOV — {settings.fov} (Valorant: 103)</FieldLabel>
                <input type="range" min="80" max="120" step="1" value={settings.fov} onChange={set("fov")} />
              </div>
              <div>
                <FieldLabel>Tamanho do alvo</FieldLabel>
                <select value={settings.size} onChange={(e) => onChange({ size: e.target.value as Settings["size"] })}>
                  <option value="small">Pequeno — difícil</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande — fácil</option>
                </select>
              </div>
              <div>
                <FieldLabel>Inverter eixo Y</FieldLabel>
                <select value={settings.invert} onChange={set("invert")}>
                  <option value={0}>Não</option>
                  <option value={1}>Sim</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <p className="text-xs text-muted-foreground max-w-[32ch] leading-relaxed">Ponteiro Windows 6/11, aceleração desligada.</p>
            <Button onClick={onClose}>Salvar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
