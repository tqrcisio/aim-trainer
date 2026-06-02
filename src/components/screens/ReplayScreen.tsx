import { useEffect, useRef, useState, useCallback } from "react";
import { ReplayEngine } from "@/engine/ReplayEngine";
import type { Replay } from "@/engine/replay-types";
import { Button } from "@/components/ui/8bit/button";

const SPEEDS = [0.25, 0.5, 1, 2] as const;

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  const ms = Math.floor((t % 1) * 10);
  return `${m}:${s}.${ms}`;
}

export function ReplayScreen({ replay, onClose }: { replay: Replay; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReplayEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentT, setCurrentT] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ReplayEngine(canvasRef.current, replay);
    engine.onTimeUpdate = (t) => setCurrentT(t);
    engine.onEnd = () => setPlaying(false);
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, [replay]);

  const togglePlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (playing) { engine.pause(); setPlaying(false); }
    else { engine.play(); setPlaying(true); }
  }, [playing]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    engineRef.current?.seek(frac * replay.duration);
  }, [replay.duration]);

  const handleSpeed = useCallback((s: number) => {
    setSpeed(s);
    engineRef.current?.setSpeed(s);
  }, []);

  const progress = replay.duration > 0 ? (currentT / replay.duration) * 100 : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "#0a121a" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Controls overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
        padding: "32px 24px 20px",
        display: "flex", flexDirection: "column", gap: 12, zIndex: 1,
      }}>
        {/* Timeline */}
        <div
          onClick={handleSeek}
          style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.15)", cursor: "pointer" }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "var(--bone, #ece8e1)" }} />
          {replay.shotEvents.map((ev, i) => (
            <div key={i} style={{
              position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
              left: `${(ev.t / replay.duration) * 100}%`,
              width: 6, height: 6,
              background: ev.hit ? "#38e0a6" : "#ff4655",
              borderRadius: "50%",
              pointerEvents: "none",
            }} />
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Button onClick={togglePlay} style={{ minWidth: 80 }}>
            {playing ? "Pause" : "Play"}
          </Button>

          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--bone, #ece8e1)", tabularNums: "tabular-nums" } as React.CSSProperties}>
            {fmt(currentT)} / {fmt(replay.duration)}
          </span>

          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => handleSpeed(s)}
                style={{
                  padding: "4px 10px", fontSize: 10,
                  background: speed === s ? "var(--bone, #ece8e1)" : "transparent",
                  color: speed === s ? "#0a121a" : "var(--bone, #ece8e1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer", fontFamily: "monospace",
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{ fontSize: 10, fontFamily: "monospace", color: "var(--steel, #5d7282)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
