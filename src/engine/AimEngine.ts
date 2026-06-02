import * as THREE from "three";
import type { Settings } from "@/store";

export const DEG2RAD = Math.PI / 180;
export const SIZES = { small: 0.26, medium: 0.4, large: 0.56 } as const;

const PLAYLISTS = {
  gridshot: {
    name: "Gridshot",
    duration: 60,
    maxTargets: 3,
    area: { x: 4.6, yMin: -2.4, yMax: 2.4 },
    z: -9,
  },
} as const;

export type StatsState = { score: number; time: number; acc: number };
export type ResultsData = {
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
export interface EngineHandlers {
  onStats: (s: StatsState) => void;
  onPause: () => void;
  onResume: () => void;
  onHit: (good: boolean) => void;
  onToast: (msg: string) => void;
  onEnd: (r: Omit<ResultsData, "isRecord">) => void;
}

export class AimEngine {
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
    this.settings = { sens: 0.4, dpi: 800, fov: 103, size: "medium", invert: 0, crosshairCode: "0;P;h;0;0l;5;0o;2;0a;1;0f;0;1b;0" };
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
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
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

    this.camera = new THREE.PerspectiveCamera(71, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.rotation.order = "YXZ";

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(3, 5, 4);
    this.scene.add(dir);

    const wallTex = this._gridTexture();
    const wallGeo = new THREE.PlaneGeometry(44, 26);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1, metalness: 0 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 0, -9.8);
    this.scene.add(wall);

    const grid = new THREE.GridHelper(40, 40, 0x1d2d3a, 0x14222d);
    grid.position.set(0, -3.1, -4);
    this.scene.add(grid);

    this.targetMat = new THREE.MeshStandardMaterial({ color: 0xff4655, emissive: 0xff4655, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0 });
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
      wallTex, wallGeo, wallMat, this.targetMat,
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
        if (dx * dx + dy * dy < r * 2.3 * (r * 2.3)) { ok = false; break; }
      }
      if (ok) return this.tmp.set(x, y, z);
    }
    return this.tmp.set((Math.random() * 2 - 1) * a.x, a.yMin + Math.random() * (a.yMax - a.yMin), z);
  }

  _place(m: THREE.Mesh) {
    m.position.copy(this._findPos(m));
    m.scale.setScalar(0.001);
    m.userData.spawnAt = performance.now();
  }

  _spawnAll() {
    this._rebuildGeo();
    const n = this.playlist.maxTargets;
    this.pool.forEach((m, i) => { m.visible = i < n; if (m.visible) this._place(m); });
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
        if (this.timeLeft <= 0) { this.timeLeft = 0; this._end(); }
      }
      const now = performance.now();
      if (now - this.lastStat > 100) { this.lastStat = now; this._emitStats(); }
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
      if (!this.locked) { this._requestLock(); return; }
      e.preventDefault();
      this._shoot();
    };
    this._onCtx = (e: Event) => e.preventDefault();
    this._onResize = () => { this.renderer.setSize(window.innerWidth, window.innerHeight); this._applyFov(); };
    this._onLockChange = () => {
      const locked = document.pointerLockElement === this.canvas;
      this.locked = locked;
      if (locked) { if (this.mode === "paused") { this.mode = "playing"; this.h.onResume(); } }
      else if (this.mode === "playing") { this.mode = "paused"; this.h.onPause(); }
    };
    this._onLockErr = () => this.h.onToast("Mouse não capturado. Abra o artifact em janela própria (pop-out).");

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
      if ((it.object as THREE.Mesh).visible) { hit = it.object as THREE.Mesh; break; }
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
    } catch { /* unsupported */ }
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
    this.score = 0; this.hits = 0; this.shots = 0; this.rtTotal = 0;
    this.duration = this.playlist.duration;
    this.timeLeft = this.duration;
    this.yaw = 0; this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);
    this._spawnAll();
    this.mode = "playing";
    this.locked = false;
    this._emitStats();
    this._requestLock();
    if (this._lockTimer) clearTimeout(this._lockTimer);
    this._lockTimer = setTimeout(() => {
      if (this.mode === "playing" && !this.locked) this.h.onToast("Clique na tela para capturar o mouse.");
    }, 350);
  }

  resume() { if (this.mode === "paused") this._requestLock(); }

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
    this.h.onEnd({ score: this.score, acc, rt, tps, hits: this.hits, shots: this.shots, sens: this.settings.sens, dpi: this.settings.dpi });
  }

  setSettings(next: Partial<Settings>) {
    const sizeChanged = next.size !== this.settings.size;
    this.settings = { ...this.settings, ...next };
    this._applyFov();
    if (sizeChanged) { this._rebuildGeo(); if (this.mode !== "playing") this._spawnAll(); }
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
