import { useEffect, useRef, useState, useCallback } from "react";
import { ReplayEngine } from "@/engine/ReplayEngine";
import type { Replay } from "@/engine/replay-types";
import { Button } from "@/components/ui/8bit/button";
import { CrosshairRenderer } from "@/components/CrosshairRenderer";
import { parseCrosshairCode } from "@/lib/crosshair";
import { useSettingsStore } from "@/store";

const DEG2RAD = Math.PI / 180;
const SPEEDS = [0.25, 0.5, 1, 2] as const;
const TRAIL_DURATION = 1.2; // seconds of trail kept
const MAX_ANGULAR_SPEED = 4; // rad/s considered "max" for color mapping

type TrailPt = { yaw: number; pitch: number; speed: number; time: number };

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  const ds = Math.floor((t % 1) * 10);
  return `${m}:${s}.${ds}`;
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPt[],
  currentYaw: number,
  currentPitch: number,
  fovDeg: number,
  now: number,
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (trail.length < 2) return;

  const pxPerRad = W / (fovDeg * DEG2RAD);

  // Draw from oldest to newest so newer segments render on top
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    const age = now - pt.time;
    if (age > TRAIL_DURATION) continue;

    const ageFrac = age / TRAIL_DURATION;
    const alpha = Math.pow(1 - ageFrac, 1.4) * 0.9;
    if (alpha < 0.01) continue;

    const sx = W / 2 + (pt.yaw - currentYaw) * pxPerRad;
    const sy = H / 2 - (pt.pitch - currentPitch) * pxPerRad;

    // Color: green (slow) → yellow → red (fast)
    const speedFrac = Math.min(pt.speed / MAX_ANGULAR_SPEED, 1);
    const hue = (1 - speedFrac) * 120;
    const radius = Math.max(1.5, (1 - ageFrac) * 6);

    ctx.save();
    ctx.shadowBlur = radius * 4;
    ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue}, 100%, 72%)`;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function ReplayScreen({ replay, onClose }: { replay: Replay; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReplayEngine | null>(null);
  const trailRef = useRef<TrailPt[]>([]);
  const lastYawRef = useRef(0);
  const lastPitchRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [currentT, setCurrentT] = useState(0);
  const [cameraState, setCameraState] = useState({ yaw: 0, pitch: 0 });
  const [speed, setSpeed] = useState(1);

  const settings = useSettingsStore((s) => s.settings);
  const crosshairParams = parseCrosshairCode(settings.crosshairCode);

  // Trail animation loop (runs independent of engine RAF)
  useEffect(() => {
    const trailCanvas = trailCanvasRef.current;
    if (!trailCanvas) return;
    const ctx = trailCanvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      trailCanvas.width = window.innerWidth;
      trailCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      drawTrail(ctx, trailRef.current, lastYawRef.current, lastPitchRef.current, replay.settings.fov, performance.now() / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [replay.settings.fov]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ReplayEngine(canvasRef.current, replay);

    engine.onFrame = (t, yaw, pitch) => {
      setCurrentT(t);
      setCameraState({ yaw, pitch });

      const now = performance.now() / 1000;
      const dt = now - lastFrameTimeRef.current;
      if (dt > 0 && dt < 0.1) {
        const dyaw = yaw - lastYawRef.current;
        const dpitch = pitch - lastPitchRef.current;
        const angularSpeed = Math.sqrt(dyaw * dyaw + dpitch * dpitch) / dt;
        trailRef.current.push({ yaw, pitch, speed: angularSpeed, time: now });
        // Prune old points
        const cutoff = now - TRAIL_DURATION - 0.1;
        trailRef.current = trailRef.current.filter(p => p.time > cutoff);
      }
      lastYawRef.current = yaw;
      lastPitchRef.current = pitch;
      lastFrameTimeRef.current = now;
    };

    engine.onEnd = () => setPlaying(false);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
      trailRef.current = [];
    };
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
    trailRef.current = []; // clear trail on scrub
    engineRef.current?.seek(frac * replay.duration);
  }, [replay.duration]);

  const handleSpeed = useCallback((s: number) => {
    setSpeed(s);
    engineRef.current?.setSpeed(s);
  }, []);

  const progress = replay.duration > 0 ? (currentT / replay.duration) * 100 : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "#0a121a" }}>
      {/* WebGL scene */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Trail heatmap overlay */}
      <canvas
        ref={trailCanvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }}
      />

      {/* Crosshair */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        pointerEvents: "none", zIndex: 2,
      }}>
        <CrosshairRenderer params={crosshairParams} size={72} />
      </div>

      {/* Controls overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
        padding: "40px 24px 20px",
        display: "flex", flexDirection: "column", gap: 12, zIndex: 3,
      }}>
        {/* Timeline */}
        <div
          onClick={handleSeek}
          style={{
            position: "relative", height: 6,
            background: "rgba(255,255,255,0.12)",
            cursor: "pointer",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "rgba(255,255,255,0.7)" }} />
          {replay.shotEvents.map((ev, i) => (
            <div key={i} style={{
              position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
              left: `${(ev.t / replay.duration) * 100}%`,
              width: 7, height: 7,
              background: ev.hit ? "#38e0a6" : "#ff4655",
              borderRadius: "50%",
              pointerEvents: "none",
              boxShadow: ev.hit ? "0 0 4px #38e0a6" : "0 0 4px #ff4655",
            }} />
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={togglePlay} style={{ minWidth: 80 }}>
            {playing ? "Pause" : "Play"}
          </Button>

          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(236,232,225,0.7)", letterSpacing: 1 }}>
            {fmt(currentT)} / {fmt(replay.duration)}
          </span>

          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => handleSpeed(s)}
                style={{
                  padding: "4px 10px", fontSize: 10,
                  background: speed === s ? "rgba(236,232,225,0.9)" : "transparent",
                  color: speed === s ? "#0a121a" : "rgba(236,232,225,0.6)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", fontFamily: "monospace",
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(93,114,130,0.8)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
