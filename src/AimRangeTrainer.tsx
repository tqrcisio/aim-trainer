import { useState, useEffect, useRef, useCallback } from "react";
import { useSettingsStore, type Settings } from "./store";
import { AimEngine, type StatsState, type ResultsData } from "./engine/AimEngine";
import { Recorder } from "./engine/Recorder";
import type { Replay } from "./engine/replay-types";
import { parseCrosshairCode } from "./lib/crosshair";
import { CrosshairRenderer } from "./components/CrosshairRenderer";
import { Hud, GameStyles } from "./components/Hud";
import { Menu } from "./components/screens/Menu";
import { SettingsPanel } from "./components/screens/SettingsPanel";
import { Pause } from "./components/screens/Pause";
import { Results } from "./components/screens/Results";
import { ReplayList } from "./components/screens/ReplayList";
import { ReplayScreen } from "./components/screens/ReplayScreen";
import { CrosshairPicker } from "./components/CrosshairPicker";

type Screen = "menu" | "settings" | "playing" | "paused" | "results" | "crosshairs" | "replayList" | "replay";

export default function AimRangeTrainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AimEngine | null>(null);
  const recorderRef = useRef<Recorder>(new Recorder());
  const bestRef = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsReturn = useRef<Screen>("menu");

  const [screen, setScreen] = useState<Screen>("menu");
  const settings = useSettingsStore((s) => s.settings);
  const patch = useSettingsStore((s) => s.patch);
  const replays = useSettingsStore((s) => s.replays);
  const addReplay = useSettingsStore((s) => s.addReplay);
  const [stats, setStats] = useState<StatsState>({ score: 0, time: 60, acc: 100 });
  const [results, setResults] = useState<ResultsData | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [currentReplay, setCurrentReplay] = useState<Replay | null>(null);

  const onStats = useCallback((s: StatsState) => setStats(s), []);
  const onPause = useCallback(() => setScreen("paused"), []);
  const onResume = useCallback(() => setScreen("playing"), []);
  const onHit = useCallback(() => {}, []);
  const onToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  const onEnd = useCallback((r: Omit<ResultsData, "isRecord">) => {
    const isRecord = bestRef.current == null || r.score > bestRef.current;
    if (isRecord) setBest(r.score);
    setResults({ ...r, isRecord });
    setScreen("results");
    const replay = recorderRef.current.finish({
      score: r.score,
      acc: r.acc,
      duration: 60,
      settings: { sens: settings.sens, dpi: settings.dpi, fov: settings.fov, size: settings.size },
    });
    addReplay(replay);
    setCurrentReplay(replay);
  }, [settings, addReplay]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new AimEngine(canvasRef.current, { onStats, onPause, onResume, onHit, onToast, onEnd }, recorderRef.current);
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, [onStats, onPause, onResume, onHit, onToast, onEnd]);

  useEffect(() => { engineRef.current?.setSettings(settings); }, [settings]);
  useEffect(() => { bestRef.current = best; }, [best]);

  const startGame    = useCallback(() => { setScreen("playing"); engineRef.current?.start(); }, []);
  const resumeGame   = useCallback(() => engineRef.current?.resume(), []);
  const toMenu       = useCallback(() => { engineRef.current?.stop(); setScreen("menu"); }, []);
  const openSettings = useCallback(() => {
    setScreen((s) => { settingsReturn.current = s; return "settings"; });
  }, []);
  const closeSettings   = useCallback(() => setScreen(settingsReturn.current), []);
  const changeSettings  = useCallback((update: Partial<Settings>) => patch(update), [patch]);
  const openCrosshairs  = useCallback(() => setScreen("crosshairs"), []);
  const closeCrosshairs = useCallback(() => setScreen("menu"), []);
  const openReplays     = useCallback(() => setScreen("replayList"), []);
  const openReplay      = useCallback((r: Replay) => { setCurrentReplay(r); setScreen("replay"); }, []);
  const closeReplay     = useCallback(() => setScreen("menu"), []);
  const openLastReplay  = useCallback(() => { if (currentReplay) setScreen("replay"); }, [currentReplay]);

  const playing = screen === "playing";

  return (
    <div id="app" className="dark">
      <GameStyles />
      <canvas ref={canvasRef} className="game-canvas" />

      {playing && (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 5 }}>
          <CrosshairRenderer params={parseCrosshairCode(settings.crosshairCode)} size={72} />
        </div>
      )}

      <div className={`hud ${playing ? "show" : ""}`}>
        <Hud stats={stats} />
      </div>

      {screen === "menu" && (
        <Menu best={best} settings={settings} onPlay={startGame} onSettings={openSettings} onCrosshairs={openCrosshairs} onReplays={openReplays} />
      )}
      {screen === "settings" && (
        <SettingsPanel settings={settings} onChange={changeSettings} onClose={closeSettings} />
      )}
      {screen === "crosshairs" && (
        <CrosshairPicker current={settings.crosshairCode} onSelect={(code) => changeSettings({ crosshairCode: code })} onClose={closeCrosshairs} />
      )}
      {screen === "paused" && (
        <Pause onResume={resumeGame} onSettings={openSettings} onMenu={toMenu} />
      )}
      {screen === "results" && results && (
        <Results r={results} onAgain={startGame} onMenu={toMenu} onReplay={openLastReplay} />
      )}
      {screen === "replayList" && (
        <ReplayList replays={replays} onWatch={openReplay} onClose={() => setScreen("menu")} />
      )}
      {screen === "replay" && currentReplay && (
        <ReplayScreen replay={currentReplay} onClose={closeReplay} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
