import { useState } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { parseCrosshairCode, type CrosshairParams } from "@/lib/crosshair";
import { PRO_CROSSHAIRS } from "@/data/pro-crosshairs";
import { CrosshairRenderer } from "./CrosshairRenderer";
import { Reticles } from "./Hud";

export function CrosshairPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"presets" | "import">("presets");
  const [importCode, setImportCode] = useState("");
  const [importError, setImportError] = useState("");
  const [preview, setPreview] = useState<CrosshairParams | null>(null);

  const handleImportChange = (code: string) => {
    setImportCode(code);
    setImportError("");
    setPreview(code.trim() ? parseCrosshairCode(code.trim()) : null);
  };

  const handleImport = () => {
    const code = importCode.trim();
    if (!code) { setImportError("Cole um código válido."); return; }
    onSelect(code);
    onClose();
  };

  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(640px,92vw)] max-h-[85vh] overflow-hidden flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-bold text-foreground">Crosshair</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xs">
              Fechar
            </button>
          </div>

          <div className="flex border-b border-border flex-shrink-0">
            {(["presets", "import"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 text-[9px] uppercase tracking-widest transition-colors ${
                  tab === t ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "presets" ? "Pro Players" : "Importar código"}
              </button>
            ))}
          </div>

          {tab === "presets" && (
            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-3 gap-3">
                {PRO_CROSSHAIRS.map((p) => {
                  const params = parseCrosshairCode(p.code);
                  const active = current === p.code;
                  return (
                    <button
                      key={p.name}
                      onClick={() => { onSelect(p.code); onClose(); }}
                      className={`flex flex-col items-center gap-3 p-4 border transition-colors text-center ${
                        active ? "border-foreground bg-foreground/10" : "border-border hover:border-foreground/40 hover:bg-muted/20"
                      }`}
                    >
                      <div className="w-16 h-16 bg-[#0a121a] flex items-center justify-center flex-shrink-0">
                        <CrosshairRenderer params={params} size={56} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-foreground leading-tight">{p.name}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">{p.team}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "import" && (
            <div className="flex-1 p-6 flex flex-col gap-5">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Código Valorant</p>
                <Input
                  placeholder="0;P;h;0;0l;5;0o;2;0a;1;0f;0;1b;0"
                  value={importCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImportChange(e.target.value)}
                  className="font-mono text-xs"
                />
                {importError && <p className="text-[9px] text-destructive mt-2">{importError}</p>}
              </div>
              {preview && (
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#0a121a] border border-border flex items-center justify-center">
                    <CrosshairRenderer params={preview} size={56} />
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider space-y-1">
                    <p>Cor: <span style={{ color: preview.color }}>{preview.color}</span></p>
                    <p>Inner: {preview.innerL}px · offset {preview.innerO}px</p>
                    {preview.outerVisible && <p>Outer: {preview.outerL}px · offset {preview.outerO}px</p>}
                    {preview.dot && <p>Center dot: sim</p>}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleImport}>Importar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
