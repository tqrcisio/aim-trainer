import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Badge } from "@/components/ui/8bit/badge";
import { Card, CardContent } from "@/components/ui/8bit/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit/select";

/* ============================================================
   Constants
   ============================================================ */
const DEG2RAD = Math.PI / 180;
const SIZES = { small: 0.26, medium: 0.4, large: 0.56 } as const;
const PLAYLISTS = {
  gridshot: {
    name: "Gridshot",
    duration: 60,
    maxTargets: 3,
    area: { x: 4.6, yMin: -2.4, yMax: 2.4 },
    z: -9,
  },
} as const;
const DEFAULT_SETTINGS = {
  sens: 0.4,
  dpi: 800,
  fov: 103,
  size: "medium" as keyof typeof SIZES,
  invert: 0,
  crosshairCode: "0;P;h;0;0l;5;0o;2;0a;1;0f;0;1b;0",
};

type Settings = typeof DEFAULT_SETTINGS;

/* ============================================================
   Crosshair system
   ============================================================ */
const CROSSHAIR_COLORS: Record<number, string> = {
  0: "#ffffff", 1: "#00ff00", 2: "#c8ff00", 3: "#ffff00",
  4: "#ff7700", 5: "#00ffff", 6: "#ff00ff", 7: "#ff0000",
};

type CrosshairParams = {
  color: string;
  innerVisible: boolean;
  innerT: number; innerL: number; innerO: number; innerA: number;
  outerVisible: boolean;
  outerT: number; outerL: number; outerO: number; outerA: number;
  dot: boolean;
  outline: number;
};

function parseCrosshairCode(code: string): CrosshairParams {
  const parts = code.split(";");
  const kv: Record<string, string> = {};
  const MARKERS = new Set(["P", "S", "A"]);
  let i = (parts[0] && !isNaN(Number(parts[0]))) ? 1 : 0;
  while (i < parts.length) {
    const key = parts[i];
    if (MARKERS.has(key)) { i++; continue; }
    if (i + 1 < parts.length && !MARKERS.has(parts[i + 1])) {
      kv[key] = parts[i + 1]; i += 2;
    } else { i++; }
  }
  const c = parseInt(kv["c"] || "0");
  const color = c === 8 && kv["u"] ? "#" + kv["u"] : (CROSSHAIR_COLORS[c] ?? "#ffffff");
  const outerA = parseFloat(kv["1a"] || "0");
  const outerVisible =
    kv["1b"] === "1" ||
    (kv["1b"] !== "0" && (outerA > 0 || kv["1l"] !== undefined || kv["1t"] !== undefined));
  return {
    color,
    innerVisible: kv["0b"] !== "0",
    innerT: parseFloat(kv["0t"] || "2"),
    innerL: parseFloat(kv["0l"] || "6"),
    innerO: parseFloat(kv["0o"] || "0"),
    innerA: parseFloat(kv["0a"] || "1"),
    outerVisible,
    outerT: parseFloat(kv["1t"] || "2"),
    outerL: parseFloat(kv["1l"] || "6"),
    outerO: parseFloat(kv["1o"] || "0"),
    outerA: outerA || 1,
    dot: kv["h"] === "1" || kv["d"] === "1",
    outline: parseFloat(kv["o"] || "0"),
  };
}

function CrosshairRenderer({
  params,
  size = 64,
  flash = false,
  className,
}: {
  params: CrosshairParams;
  size?: number;
  flash?: boolean;
  className?: string;
}) {
  const S = size / 64;
  const cx = size / 2;
  const outline = params.outline > 0 ? `0 0 0 1px rgba(0,0,0,${params.outline})` : undefined;
  const scale = flash ? 1.7 : 1;

  const arm = (dir: "top" | "bottom" | "left" | "right", outer = false) => {
    const t = (outer ? params.outerT : params.innerT) * S;
    const l = (outer ? params.outerL : params.innerL) * S;
    const o = (outer ? params.outerO : params.innerO) * S;
    const a = outer ? params.outerA : params.innerA;
    const style: React.CSSProperties = {
      position: "absolute",
      backgroundColor: params.color,
      opacity: a,
      boxShadow: outline,
      transition: "transform 0.05s ease",
      transform: `scale(${scale})`,
      transformOrigin: dir === "top" ? "bottom center" : dir === "bottom" ? "top center" : dir === "left" ? "right center" : "left center",
    };
    if (dir === "top")    return <span key={`${outer?'o':'i'}-t`} style={{ ...style, width: t, height: l, left: cx - t / 2, top: cx - o - l }} />;
    if (dir === "bottom") return <span key={`${outer?'o':'i'}-b`} style={{ ...style, width: t, height: l, left: cx - t / 2, top: cx + o }} />;
    if (dir === "left")   return <span key={`${outer?'o':'i'}-l`} style={{ ...style, width: l, height: t, left: cx - o - l, top: cx - t / 2 }} />;
    return               <span key={`${outer?'o':'i'}-r`} style={{ ...style, width: l, height: t, left: cx + o, top: cx - t / 2 }} />;
  };

  const DIRS = ["top", "bottom", "left", "right"] as const;
  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      {params.innerVisible && DIRS.map((d) => arm(d))}
      {params.outerVisible && DIRS.map((d) => arm(d, true))}
      {params.dot && (
        <span style={{
          position: "absolute",
          width: params.innerT * S, height: params.innerT * S,
          backgroundColor: params.color, opacity: params.innerA,
          left: cx - (params.innerT * S) / 2, top: cx - (params.innerT * S) / 2,
          boxShadow: outline,
        }} />
      )}
    </div>
  );
}

const PRO_CROSSHAIRS = [
  { name: "TenZ", team: "T1", code: "0;s;1;P;c;5;h;0;m;1;0l;4;0o;2;0a;1;0f;0;1b;0" },
  { name: "yay", team: "Ex-OpTic", code: "0;P;h;0;f;0;0l;4;0o;0;0a;1;0f;0;1b;0" },
  { name: "aspas", team: "MIBR", code: "0;P;c;7;h;0;0l;3;0o;2;0a;1;0f;0;1b;" },
  { name: "Zekken", team: "MIBR", code: "0;P;c;1;o;1;d;1;0b;0;1b;0" },
  { name: "ScreaM", team: "Ex-BDS", code: "0;s;1;P;o;1;0t;1;0l;1;0o;4;0a;1;0f;0;1t;1;1l;1;1o;3;1a;0;1m;0;1f;0;S;c;0;o;" },
  { name: "Nukkye", team: "NIP", code: "0;s;1;P;h;0;0t;1;0l;4;0o;1;0a;1;0f;0;1t;3;1o;2;1a;1;1m;0;1f;" },
  { name: "Alfajer", team: "Vitality", code: "0;P;h;0;0t;1;0l;4;0o;1;0a;1;0f;0;1t;3;1o;2;1a;1;1m;0;1f;" },
  { name: "Cryo", team: "100T", code: "0;P;h;0;0l;4;0o;0;0a;1;0f;0;1b;0" },
  { name: "Asuna", team: "100T", code: "0;s;1;P;h;0;s;0;0l;3;0o;0;0a;1;0f;0;1b;" },
  { name: "mwzera", team: "MIBR", code: "0;P;c;5;h;0;d;1;z;1;f;0;m;1;0t;1;0l;2;0v;1;0g;1;0o;1;0a;1;0e;0.196;1b;0" },
  { name: "f0rsakeN", team: "PRX", code: "0;P;h;0;f;0;0l;4;0a;1;0f;0;1b;0" },
  { name: "crashies", team: "Fnatic", code: "0;s;1;P;c;1;h;0;f;0;0l;4;0o;2;0a;1;0f;0;1b;0" },
] as const;

function CrosshairPicker({
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
    if (code.trim()) {
      try {
        setPreview(parseCrosshairCode(code.trim()));
      } catch {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
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
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-bold text-foreground">Crosshair</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xs">
              Fechar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            {(["presets", "import"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 text-[9px] uppercase tracking-widest transition-colors ${
                  tab === t
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
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
                        active
                          ? "border-foreground bg-foreground/10"
                          : "border-border hover:border-foreground/40 hover:bg-muted/20"
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
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">
                  Código Valorant
                </p>
                <Input
                  placeholder="0;P;h;0;0l;5;0o;2;0a;1;0f;0;1b;0"
                  value={importCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImportChange(e.target.value)}
                  className="font-mono text-xs"
                />
                {importError && (
                  <p className="text-[9px] text-destructive mt-2">{importError}</p>
                )}
              </div>
              {preview && (
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#0a121a] border border-border flex items-center justify-center">
                    <CrosshairRenderer params={preview} size={56} />
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider space-y-1">
                    <p>Cor: <span className="text-foreground" style={{ color: preview.color }}>{preview.color}</span></p>
                    <p>Inner: {preview.innerL}px · offset {preview.innerO}px</p>
                    {preview.outerVisible && <p>Outer: {preview.outerL}px · offset {preview.outerO}px</p>}
                    {preview.dot && <p>Center dot: sim</p>}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleImport}>
                  Importar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
type StatsState = { score: number; time: number; acc: number };
type ResultsData = {
  score: number;
  acc: number;
  rt: number;
  tps: string;
  hits: number;
  shots: number;
  sens: number;
  dpi: number;
  isRecord?: boolean;
};

const fmtSens = (v: number) =>
  Number(v)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "") || "0";
const cm360 = (sens: number, dpi: number) => (360 / (sens * 0.07) / dpi) * 2.54;

/* ============================================================
   AimEngine — imperative WebGL layer
   ============================================================ */
interface EngineHandlers {
  onStats: (s: StatsState) => void;
  onPause: () => void;
  onResume: () => void;
  onHit: (good: boolean) => void;
  onToast: (msg: string) => void;
  onEnd: (r: Omit<ResultsData, "isRecord">) => void;
}

class AimEngine {
  canvas: HTMLCanvasElement;
  h: EngineHandlers;
  settings: Settings;
  playlist: (typeof PLAYLISTS)["gridshot"];

  mode: "idle" | "playing" | "paused";
  locked: boolean;
  yaw: number;
  pitch: number;
  readonly MAXPITCH: number;

  score: number;
  hits: number;
  shots: number;
  rtTotal: number;
  timeLeft: number;
  duration: number;
  lastStat: number;

  pool: THREE.Mesh[];
  disposables: { dispose: () => void }[];
  tmp: THREE.Vector3;
  center: THREE.Vector2;
  actx: AudioContext | null;
  _lockTimer: ReturnType<typeof setTimeout> | null;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  targetMat!: THREE.MeshStandardMaterial;
  targetGeo!: THREE.SphereGeometry;
  targetR!: number;
  raycaster!: THREE.Raycaster;
  clock!: THREE.Clock;

  _raf!: number;
  _onMove!: (e: MouseEvent) => void;
  _onDown!: (e: MouseEvent) => void;
  _onCtx!: (e: Event) => void;
  _onResize!: () => void;
  _onLockChange!: () => void;
  _onLockErr!: () => void;

  constructor(canvas: HTMLCanvasElement, handlers: EngineHandlers) {
    this.canvas = canvas;
    this.h = handlers;
    this.settings = { ...DEFAULT_SETTINGS };
    this.playlist = PLAYLISTS.gridshot;

    this.mode = "idle";
    this.locked = false;
    this.yaw = 0;
    this.pitch = 0;
    this.MAXPITCH = 89 * DEG2RAD;

    this.score = 0;
    this.hits = 0;
    this.shots = 0;
    this.rtTotal = 0;
    this.timeLeft = 0;
    this.duration = 0;
    this.lastStat = 0;

    this.pool = [];
    this.disposables = [];
    this.tmp = new THREE.Vector3();
    this.center = new THREE.Vector2(0, 0);
    this.actx = null;
    this._lockTimer = null;

    this._initScene();
    this._bindEvents();
    this._spawnAll();

    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  _gridTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = "#0c151d";
    x.fillRect(0, 0, 256, 256);
    x.strokeStyle = "#16242f";
    x.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 256);
      x.stroke();
      x.beginPath();
      x.moveTo(0, i);
      x.lineTo(256, i);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 4);
    return t;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a121a);
    this.scene.fog = new THREE.Fog(0x0a121a, 14, 30);

    this.camera = new THREE.PerspectiveCamera(
      71,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.rotation.order = "YXZ";

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(3, 5, 4);
    this.scene.add(dir);

    const wallTex = this._gridTexture();
    const wallGeo = new THREE.PlaneGeometry(44, 26);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 1,
      metalness: 0,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 0, -9.8);
    this.scene.add(wall);

    const grid = new THREE.GridHelper(40, 40, 0x1d2d3a, 0x14222d);
    grid.position.set(0, -3.1, -4);
    this.scene.add(grid);

    this.targetMat = new THREE.MeshStandardMaterial({
      color: 0xff4655,
      emissive: 0xff4655,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0,
    });
    this._rebuildGeo();
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(this.targetGeo, this.targetMat);
      m.visible = false;
      m.userData = { spawnAt: 0 };
      this.scene.add(m);
      this.pool.push(m);
    }

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this._applyFov();

    this.disposables.push(
      wallTex,
      wallGeo,
      wallMat,
      this.targetMat,
      (grid.geometry as unknown as { dispose: () => void }),
      (grid.material as unknown as { dispose: () => void }),
    );
  }

  _rebuildGeo() {
    this.targetR = SIZES[this.settings.size];
    if (this.targetGeo) this.targetGeo.dispose();
    this.targetGeo = new THREE.SphereGeometry(this.targetR, 22, 16);
    for (const m of this.pool) m.geometry = this.targetGeo;
  }

  _applyFov() {
    const aspect = window.innerWidth / window.innerHeight;
    const h = this.settings.fov * DEG2RAD;
    const v = 2 * Math.atan(Math.tan(h / 2) / aspect);
    this.camera.fov = v / DEG2RAD;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  _findPos(self: THREE.Mesh) {
    const a = this.playlist.area;
    const z = this.playlist.z;
    const r = this.targetR;
    for (let t = 0; t < 14; t++) {
      const x = (Math.random() * 2 - 1) * a.x;
      const y = a.yMin + Math.random() * (a.yMax - a.yMin);
      let ok = true;
      for (const m of this.pool) {
        if (m === self || !m.visible) continue;
        const dx = m.position.x - x;
        const dy = m.position.y - y;
        if (dx * dx + dy * dy < r * 2.3 * (r * 2.3)) {
          ok = false;
          break;
        }
      }
      if (ok) return this.tmp.set(x, y, z);
    }
    return this.tmp.set(
      (Math.random() * 2 - 1) * a.x,
      a.yMin + Math.random() * (a.yMax - a.yMin),
      z,
    );
  }

  _place(m: THREE.Mesh) {
    m.position.copy(this._findPos(m));
    m.scale.setScalar(0.001);
    m.userData.spawnAt = performance.now();
  }

  _spawnAll() {
    this._rebuildGeo();
    const n = this.playlist.maxTargets;
    this.pool.forEach((m, i) => {
      m.visible = i < n;
      if (m.visible) this._place(m);
    });
  }

  _loop() {
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    for (const m of this.pool) {
      if (m.visible && m.scale.x < 1) m.scale.setScalar(Math.min(1, m.scale.x + dt * 15));
    }

    if (this.mode === "playing") {
      if (this.locked) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this._end();
        }
      }
      const now = performance.now();
      if (now - this.lastStat > 100) {
        this.lastStat = now;
        this._emitStats();
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  _emitStats() {
    const acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 100;
    this.h.onStats({ score: this.score, time: this.timeLeft, acc });
  }

  _bindEvents() {
    this._onMove = (e: MouseEvent) => {
      if (this.mode !== "playing" || !this.locked) return;
      const f = this.settings.sens * 0.07 * DEG2RAD;
      this.yaw -= e.movementX * f;
      this.pitch -= e.movementY * f * (this.settings.invert ? -1 : 1);
      this.pitch = Math.max(-this.MAXPITCH, Math.min(this.MAXPITCH, this.pitch));
      this.camera.rotation.set(this.pitch, this.yaw, 0);
    };
    this._onDown = (e: MouseEvent) => {
      if (e.button !== 0 || this.mode !== "playing") return;
      if (!this.locked) {
        this._requestLock();
        return;
      }
      e.preventDefault();
      this._shoot();
    };
    this._onCtx = (e: Event) => e.preventDefault();
    this._onResize = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this._applyFov();
    };
    this._onLockChange = () => {
      const locked = document.pointerLockElement === this.canvas;
      this.locked = locked;
      if (locked) {
        if (this.mode === "paused") {
          this.mode = "playing";
          this.h.onResume();
        }
      } else if (this.mode === "playing") {
        this.mode = "paused";
        this.h.onPause();
      }
    };
    this._onLockErr = () =>
      this.h.onToast("Mouse não capturado. Abra o artifact em janela própria (pop-out).");

    document.addEventListener("mousemove", this._onMove, { passive: true });
    this.canvas.addEventListener("mousedown", this._onDown);
    this.canvas.addEventListener("contextmenu", this._onCtx);
    window.addEventListener("resize", this._onResize);
    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("pointerlockerror", this._onLockErr);
  }

  _requestLock() {
    const p = this.canvas.requestPointerLock() as Promise<void> | undefined;
    if (p && p.catch) p.catch(() => {});
  }

  _shoot() {
    this.shots++;
    this.raycaster.setFromCamera(this.center, this.camera);
    const inter = this.raycaster.intersectObjects(this.pool, false);
    let hit: THREE.Mesh | null = null;
    for (const it of inter) {
      if ((it.object as THREE.Mesh).visible) {
        hit = it.object as THREE.Mesh;
        break;
      }
    }
    if (hit) {
      const rt = performance.now() - hit.userData.spawnAt;
      this.hits++;
      this.rtTotal += rt;
      this.score += 100 + Math.max(0, Math.round((600 - rt) * 0.15));
      this._place(hit);
      this._blip(880, 0.06, 0.05);
      this.h.onHit(true);
    } else {
      this._blip(170, 0.05, 0.035);
      this.h.onHit(false);
    }
    this._emitStats();
  }

  _initAudio() {
    if (this.actx) return;
    try {
      this.actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      /* unsupported */
    }
  }

  _blip(freq: number, dur: number, vol: number) {
    if (!this.actx) return;
    const o = this.actx.createOscillator();
    const g = this.actx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(this.actx.destination);
    const t = this.actx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
  }

  start() {
    this._initAudio();
    this.score = 0;
    this.hits = 0;
    this.shots = 0;
    this.rtTotal = 0;
    this.duration = this.playlist.duration;
    this.timeLeft = this.duration;
    this.yaw = 0;
    this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);
    this._spawnAll();
    this.mode = "playing";
    this.locked = false;
    this._emitStats();
    this._requestLock();
    if (this._lockTimer) clearTimeout(this._lockTimer);
    this._lockTimer = setTimeout(() => {
      if (this.mode === "playing" && !this.locked)
        this.h.onToast("Clique na tela para capturar o mouse.");
    }, 350);
  }

  resume() {
    if (this.mode === "paused") this._requestLock();
  }

  stop() {
    this.mode = "idle";
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this._spawnAll();
  }

  _end() {
    this.mode = "idle";
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    const acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
    const rt = this.hits ? Math.round(this.rtTotal / this.hits) : 0;
    const tps = (this.hits / this.duration).toFixed(2);
    this.h.onEnd({
      score: this.score,
      acc,
      rt,
      tps,
      hits: this.hits,
      shots: this.shots,
      sens: this.settings.sens,
      dpi: this.settings.dpi,
    });
  }

  setSettings(next: Partial<Settings>) {
    const sizeChanged = next.size !== this.settings.size;
    this.settings = { ...this.settings, ...next };
    this._applyFov();
    if (sizeChanged) {
      this._rebuildGeo();
      if (this.mode !== "playing") this._spawnAll();
    }
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    if (this._lockTimer) clearTimeout(this._lockTimer);
    document.removeEventListener("mousemove", this._onMove);
    this.canvas.removeEventListener("mousedown", this._onDown);
    this.canvas.removeEventListener("contextmenu", this._onCtx);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("pointerlockchange", this._onLockChange);
    document.removeEventListener("pointerlockerror", this._onLockErr);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    if (this.targetGeo) this.targetGeo.dispose();
    this.disposables.forEach((d) => d.dispose && d.dispose());
    this.renderer.dispose();
    if (this.actx) this.actx.close();
  }
}

/* ============================================================
   Presentational components
   ============================================================ */
function Reticles() {
  return (
    <>
      <div className="reticle tl" />
      <div className="reticle tr" />
      <div className="reticle bl" />
      <div className="reticle br" />
    </>
  );
}

function Hud({ stats }: { stats: StatsState }) {
  return (
    <div className="hud-top">
      <div className="stat">
        <div className="v">{stats.score}</div>
        <div className="k">Score</div>
      </div>
      <div className="stat time">
        <div className="v">{stats.time.toFixed(1)}</div>
        <div className="k">Time</div>
      </div>
      <div className="stat">
        <div className="v">{stats.acc}%</div>
        <div className="k">Acc</div>
      </div>
    </div>
  );
}

const LOCKED_MODES = [
  {
    idx: "02",
    tag: "Reflex",
    name: "Spidershot",
    desc: "Flicks largos para alvos em pontos fixos.",
  },
  {
    idx: "03",
    tag: "Tracking",
    name: "Motion Track",
    desc: "Mantenha a mira em um alvo em movimento.",
  },
];

function Menu({
  best,
  settings,
  onPlay,
  onSettings,
  onCrosshairs,
}: {
  best: number | null;
  settings: Settings;
  onPlay: () => void;
  onSettings: () => void;
  onCrosshairs: () => void;
}) {
  return (
    <div className="overlay">
      <Reticles />
      <Card className="w-[min(500px,90vw)]">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5">
            <div>
              <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-3">
                Treino de mira
              </p>
              <h1 className="retro text-lg text-foreground leading-snug">AIM RANGE</h1>
            </div>
            <button
              onClick={onSettings}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Configurações"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          {/* Mode list */}
          <div className="border-t border-border">
            {/* Active mode */}
            <button
              onClick={onPlay}
              className="group w-full flex items-center gap-5 px-6 py-5 text-left hover:bg-primary/5 transition-colors border-b border-border"
            >
              <span className="font-mono text-3xl font-bold text-muted-foreground/40 group-hover:text-primary/60 transition-colors tabular-nums leading-none">
                01
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  Clicking · 60s · 3 alvos
                </p>
                <p className="text-sm font-semibold text-foreground">Gridshot</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Flick e click clássico. Alvos aleatórios, acerte para o próximo aparecer.
                </p>
              </div>
              <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0">
                ▶
              </span>
            </button>

            {/* Locked modes */}
            {LOCKED_MODES.map((p) => (
              <div
                key={p.idx}
                className="flex items-center gap-5 px-6 py-5 opacity-35 border-b border-border last:border-0"
              >
                <span className="font-mono text-3xl font-bold text-muted-foreground tabular-nums leading-none">
                  {p.idx}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                    {p.tag}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider flex-shrink-0">
                  Em breve
                </Badge>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-border bg-muted/10">
            {/* Crosshair preview button */}
            <button
              onClick={onCrosshairs}
              className="flex items-center gap-3 group hover:opacity-80 transition-opacity flex-shrink-0"
              title="Trocar crosshair"
            >
              <div className="w-8 h-8 bg-[#0a121a] border border-border flex items-center justify-center group-hover:border-foreground/40 transition-colors">
                <CrosshairRenderer params={parseCrosshairCode(settings.crosshairCode)} size={28} />
              </div>
            </button>
            <div className="w-px h-4 bg-border flex-shrink-0" />
            {/* Stats */}
            <div className="flex gap-5 flex-1 min-w-0">
              {[
                { k: "Recorde", v: best == null ? "—" : String(best) },
                { k: "Sens", v: Number(settings.sens).toFixed(2) },
                { k: "DPI", v: String(settings.dpi) },
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

const DPI_PRESETS = [400, 800, 1600] as const;

function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const isCustomDpi = !DPI_PRESETS.includes(settings.dpi as typeof DPI_PRESETS[number]);

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
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-border">
            <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-3">
              Config
            </p>
            <h2 className="text-base font-semibold text-foreground">Configurações</h2>
          </div>

          {/* Sensitivity */}
          <div className="px-6 py-5 border-b border-border">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Sensibilidade
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Sens Valorant — {fmtSens(settings.sens)}</FieldLabel>
                <Input
                 
                  type="number"
                  min="0.05"
                  max="5"
                  step="0.001"
                  value={settings.sens}
                  onChange={set("sens")}
                />
              </div>
              <div>
                <FieldLabel>DPI — {settings.dpi}</FieldLabel>
                <Select
                  value={isCustomDpi ? "custom" : String(settings.dpi)}
                  onValueChange={(v) => {
                    if (v !== "custom") onChange({ dpi: Number(v) });
                    else onChange({ dpi: settings.dpi });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DPI_PRESETS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} DPI
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {isCustomDpi && (
                  <Input
                    type="number"
                    min="100"
                    max="6400"
                    step="50"
                    value={settings.dpi}
                    onChange={set("dpi")}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Derived values */}
            <div className="grid grid-cols-3 gap-px mt-4 border border-border bg-border">
              {[
                { v: Math.round(settings.sens * settings.dpi), k: "eDPI" },
                { v: `~${cm360(settings.sens, settings.dpi).toFixed(1)} cm`, k: "cm / 360°" },
                { v: `${(settings.sens * 0.07).toFixed(3)}°`, k: "graus / ct" },
              ].map((s) => (
                <div key={s.k} className="bg-card px-3 py-3">
                  <p className="font-mono text-base font-bold text-foreground tabular-nums leading-none">
                    {s.v}
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-1.5">
                    {s.k}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Range */}
          <div className="px-6 py-5 border-b border-border">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Range
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>FOV — {settings.fov} (Valorant: 103)</FieldLabel>
                <input
                  type="range"
                  min="80"
                  max="120"
                  step="1"
                  value={settings.fov}
                  onChange={set("fov")}
                />
              </div>
              <div>
                <FieldLabel>Tamanho do alvo</FieldLabel>
                <select
                  value={settings.size}
                  onChange={(e) => onChange({ size: e.target.value as keyof typeof SIZES })}
                >
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
              <div>
                <FieldLabel>Cor da mira</FieldLabel>
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) => onChange({ color: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <p className="text-xs text-muted-foreground max-w-[32ch] leading-relaxed">
              Ponteiro Windows 6/11, aceleração desligada.
            </p>
            <Button onClick={onClose}>
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Pause({
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
            <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-3">
              Pausado
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clique na tela para continuar. O cronômetro está parado.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={onResume}>
              Continuar
            </Button>
            <Button variant="outline" onClick={onSettings}>
              Config
            </Button>
            <Button variant="outline" onClick={onMenu}>
              Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Results({
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
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-border">
            <div>
              <p className="retro text-[9px] text-muted-foreground uppercase tracking-widest mb-2">
                Gridshot
              </p>
              <p className="text-sm font-medium text-foreground">Resultado</p>
            </div>
            {r.isRecord && (
              <Badge variant="default" className="text-[9px] uppercase tracking-wider">
                Novo recorde
              </Badge>
            )}
          </div>

          {/* Score */}
          <div className="px-6 py-7 text-center border-b border-border">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
              Score
            </p>
            <p className="retro text-4xl text-primary tabular-nums leading-none">{r.score}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {stats.map((s) => (
              <div key={s.k} className="px-4 py-4 text-center">
                <p className="font-mono text-lg font-bold text-foreground tabular-nums leading-none">
                  {s.v}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-2">
                  {s.k}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <p className="text-[10px] font-mono text-muted-foreground">
              {r.hits}/{r.shots} acertos · {r.sens} sens @ {r.dpi} DPI
            </p>
            <div className="flex gap-3">
              <Button onClick={onAgain}>
                De novo
              </Button>
              <Button variant="outline" onClick={onMenu}>
                Menu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Scoped styles
   ============================================================ */
function GameStyles() {
  return (
    <style>{`
    :root{
      --ink:#0f1923; --ink2:#16222e; --ink3:#0a121a; --panel:#11202c;
      --edge:#243441; --edge2:#33495a; --red:#ff4655;
      --bone:#ece8e1; --steel:#5d7282; --steel2:#8ba0ac; --mint:#38e0a6;
      --fd:"Bahnschrift","DIN Condensed","Oswald","Arial Narrow",system-ui,sans-serif;
      --fu:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
      --fm:ui-monospace,"SF Mono","Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace;
    }
    html,body{height:100%;margin:0;overflow:hidden;background:var(--ink);}
    #app{position:fixed;inset:0;font-family:var(--fu);color:var(--bone);-webkit-font-smoothing:antialiased;}
    #app ::selection{background:var(--red);color:var(--ink);}
    .game-canvas{position:fixed;inset:0;display:block;z-index:0;}


    .hud{position:absolute;inset:0;pointer-events:none;z-index:4;display:none;}
    .hud.show{display:block;}
    .hud-top{position:absolute;top:20px;left:50%;transform:translateX(-50%);display:flex;gap:2px;}
    .stat{position:relative;background:rgba(10,18,26,.78);border-top:1px solid var(--edge2);padding:9px 22px 8px;text-align:center;min-width:96px;}
    .stat .v{font-family:var(--fm);font-size:23px;font-weight:700;line-height:1;letter-spacing:-1px;font-variant-numeric:tabular-nums;}
    .stat .k{font-family:var(--fd);font-size:10px;letter-spacing:3px;color:var(--steel);text-transform:uppercase;margin-top:6px;}
    .stat.time{background:rgba(255,70,85,.14);}.stat.time .v,.stat.time .k{color:var(--red);}
    .stat::before,.stat::after{content:"";position:absolute;top:0;width:7px;height:7px;}
    .stat::before{left:0;border-left:2px solid var(--red);border-top:2px solid var(--red);}
    .stat::after{right:0;border-right:2px solid var(--red);border-top:2px solid var(--red);}

    .overlay{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(8,14,20,.55),rgba(8,14,20,.92));}
    .overlay::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);}
    .reticle{position:absolute;width:26px;height:26px;z-index:2;pointer-events:none;}
    .reticle.tl{top:22px;left:22px;border-left:2px solid var(--edge2);border-top:2px solid var(--edge2);}
    .reticle.tr{top:22px;right:22px;border-right:2px solid var(--edge2);border-top:2px solid var(--edge2);}
    .reticle.bl{bottom:22px;left:22px;border-left:2px solid var(--edge2);border-bottom:2px solid var(--edge2);}
    .reticle.br{bottom:22px;right:22px;border-right:2px solid var(--edge2);border-bottom:2px solid var(--edge2);}

    select{width:100%;background:var(--ink3);border:1px solid var(--edge);border-bottom:2px solid var(--edge2);color:var(--bone);padding:10px 12px;font-family:var(--fm);font-size:13px;outline:none;transition:.14s;appearance:none;}
    select:focus{border-bottom-color:var(--red);}
    input[type=color]{width:100%;height:40px;background:var(--ink3);border:1px solid var(--edge);cursor:pointer;padding:3px;}
    input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;margin:10px 0;background:var(--edge2);outline:none;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:18px;background:var(--red);cursor:pointer;box-shadow:0 0 0 1px var(--ink);}
    input[type=range]::-moz-range-thumb{width:14px;height:18px;border:none;background:var(--red);cursor:pointer;}
    .toast{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);z-index:20;background:var(--ink2);border-top:2px solid var(--red);color:var(--bone);padding:12px 18px;font-family:var(--fm);font-size:12px;letter-spacing:.5px;max-width:80vw;text-align:center;}
    `}</style>
  );
}

/* ============================================================
   Root component
   ============================================================ */
export default function AimRangeTrainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AimEngine | null>(null);
  const bestRef = useRef<number | null>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsReturn = useRef<string>("menu");

  const [screen, setScreen] = useState<"menu" | "settings" | "playing" | "paused" | "results" | "crosshairs">(
    "menu",
  );
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<StatsState>({ score: 0, time: 60, acc: 100 });
  const [results, setResults] = useState<ResultsData | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [hit, setHit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const onStats = useCallback((s: StatsState) => setStats(s), []);
  const onPause = useCallback(() => setScreen("paused"), []);
  const onResume = useCallback(() => setScreen("playing"), []);
  const onHit = useCallback((good: boolean) => {
    if (!good) return;
    setHit(true);
    if (hitTimer.current) clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHit(false), 70);
  }, []);
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
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new AimEngine(canvasRef.current, {
      onStats,
      onPause,
      onResume,
      onHit,
      onToast,
      onEnd,
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [onStats, onPause, onResume, onHit, onToast, onEnd]);

  useEffect(() => {
    engineRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  const startGame = useCallback(() => {
    setScreen("playing");
    engineRef.current?.start();
  }, []);
  const resumeGame = useCallback(() => engineRef.current?.resume(), []);
  const toMenu = useCallback(() => {
    engineRef.current?.stop();
    setScreen("menu");
  }, []);
  const openSettings = useCallback(() => {
    setScreen((s) => {
      settingsReturn.current = s;
      return "settings";
    });
  }, []);
  const closeSettings = useCallback(
    () => setScreen((settingsReturn.current || "menu") as typeof screen),
    [],
  );
  const changeSettings = useCallback(
    (patch: Partial<Settings>) => setSettings((p) => ({ ...p, ...patch })),
    [],
  );
  const openCrosshairs = useCallback(() => setScreen("crosshairs"), []);
  const closeCrosshairs = useCallback(() => setScreen("menu"), []);

  const playing = screen === "playing";
  const crosshairParams = parseCrosshairCode(settings.crosshairCode);

  return (
    <div id="app" className="dark">
      <GameStyles />
      <canvas ref={canvasRef} className="game-canvas" />

      {playing && (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 5 }}>
          <CrosshairRenderer params={crosshairParams} size={72} flash={hit} />
        </div>
      )}

      <div className={`hud ${playing ? "show" : ""}`}>
        <Hud stats={stats} />
      </div>

      {screen === "menu" && (
        <Menu best={best} settings={settings} onPlay={startGame} onSettings={openSettings} onCrosshairs={openCrosshairs} />
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
        <Results r={results} onAgain={startGame} onMenu={toMenu} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
