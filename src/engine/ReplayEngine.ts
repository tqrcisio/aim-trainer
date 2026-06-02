import * as THREE from "three";
import type { Replay } from "./replay-types";

const DEG2RAD = Math.PI / 180;
const SIZES = { small: 0.26, medium: 0.4, large: 0.56 } as const;
const MAXPITCH = 89 * DEG2RAD;

type CameraPoint = { t: number; yaw: number; pitch: number };

export class ReplayEngine {
  canvas: HTMLCanvasElement;
  replay: Replay;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  pool: THREE.Mesh[] = [];
  disposables: { dispose: () => void }[] = [];

  playing = false;
  currentT = 0;
  speedFactor = 1;
  lastFrame = 0;
  eventCursor = 0;

  cameraTrack: CameraPoint[] = [];

  onTimeUpdate?: (t: number) => void;
  onEnd?: () => void;

  _raf!: number;

  constructor(canvas: HTMLCanvasElement, replay: Replay) {
    this.canvas = canvas;
    this.replay = replay;
    this._initScene();
    this._precompute();
    this._applyAt(0);
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  _precompute() {
    let yaw = 0, pitch = 0;
    const f = this.replay.settings.sens * 0.07 * DEG2RAD;
    this.cameraTrack = [{ t: 0, yaw: 0, pitch: 0 }];
    for (const ev of this.replay.mouseEvents) {
      yaw -= ev.dx * f;
      pitch = Math.max(-MAXPITCH, Math.min(MAXPITCH, pitch - ev.dy * f));
      this.cameraTrack.push({ t: ev.t, yaw, pitch });
    }
  }

  _findCamera(t: number): CameraPoint {
    const tr = this.cameraTrack;
    if (tr.length === 0) return { t: 0, yaw: 0, pitch: 0 };
    let lo = 0, hi = tr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (tr[mid].t <= t) lo = mid; else hi = mid - 1;
    }
    return tr[lo];
  }

  _applyAt(seekT: number) {
    // Find nearest keyframe at or before seekT
    const kf = this.replay.keyframes.reduce<typeof this.replay.keyframes[0] | null>(
      (best, k) => k.t <= seekT && (best === null || k.t > best.t) ? k : best,
      null
    ) ?? this.replay.keyframes[0];

    // Restore target state from keyframe
    if (kf) {
      kf.targets.forEach((tgt, i) => {
        if (i < this.pool.length) {
          this.pool[i].position.set(...tgt.pos);
          this.pool[i].visible = tgt.visible;
        }
      });
    }

    // Walk shot events from kf.t to seekT
    const fromT = kf?.t ?? 0;
    for (const ev of this.replay.shotEvents) {
      if (ev.t <= fromT) continue;
      if (ev.t > seekT) break;
      if (ev.hit && ev.newPos && ev.targetIdx >= 0 && ev.targetIdx < this.pool.length) {
        this.pool[ev.targetIdx].position.set(...ev.newPos);
      }
    }

    // Set event cursor to first event after seekT
    this.eventCursor = this.replay.shotEvents.findIndex(ev => ev.t > seekT);
    if (this.eventCursor === -1) this.eventCursor = this.replay.shotEvents.length;

    const cam = this._findCamera(seekT);
    this.camera.rotation.set(cam.pitch, cam.yaw, 0);
  }

  _loop() {
    this._raf = requestAnimationFrame(this._loop);

    if (this.playing) {
      const now = performance.now();
      const dt = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      this.currentT = Math.min(this.currentT + dt * this.speedFactor, this.replay.duration);

      const cam = this._findCamera(this.currentT);
      this.camera.rotation.set(cam.pitch, cam.yaw, 0);

      while (this.eventCursor < this.replay.shotEvents.length) {
        const ev = this.replay.shotEvents[this.eventCursor];
        if (ev.t > this.currentT) break;
        if (ev.hit && ev.newPos && ev.targetIdx >= 0 && ev.targetIdx < this.pool.length) {
          this.pool[ev.targetIdx].position.set(...ev.newPos);
        }
        this.eventCursor++;
      }

      this.onTimeUpdate?.(this.currentT);

      if (this.currentT >= this.replay.duration) {
        this.playing = false;
        this.onEnd?.();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  play() {
    if (this.currentT >= this.replay.duration) this._applyAt(0);
    this.lastFrame = performance.now();
    this.playing = true;
  }

  pause() { this.playing = false; }

  seek(t: number) {
    this.currentT = Math.max(0, Math.min(t, this.replay.duration));
    this._applyAt(this.currentT);
    this.renderer.render(this.scene, this.camera);
    this.onTimeUpdate?.(this.currentT);
  }

  setSpeed(s: number) { this.speedFactor = s; }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a121a);
    this.scene.fog = new THREE.Fog(0x0a121a, 14, 30);

    const aspect = window.innerWidth / window.innerHeight;
    const fovH = this.replay.settings.fov * DEG2RAD;
    const fovV = 2 * Math.atan(Math.tan(fovH / 2) / aspect) / DEG2RAD;
    this.camera = new THREE.PerspectiveCamera(fovV, aspect, 0.1, 200);
    this.camera.rotation.order = "YXZ";

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(3, 5, 4);
    this.scene.add(dir);

    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0c151d"; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#16242f"; ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    const wallTex = new THREE.CanvasTexture(c);
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(6, 4);
    const wallGeo = new THREE.PlaneGeometry(44, 26);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1, metalness: 0 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 0, -9.8);
    this.scene.add(wall);

    const grid = new THREE.GridHelper(40, 40, 0x1d2d3a, 0x14222d);
    grid.position.set(0, -3.1, -4);
    this.scene.add(grid);

    const r = SIZES[this.replay.settings.size];
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xff4655, emissive: 0xff4655, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0 });
    const targetGeo = new THREE.SphereGeometry(r, 22, 16);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(targetGeo, targetMat);
      m.visible = false;
      this.scene.add(m);
      this.pool.push(m);
    }

    this.disposables.push(
      wallTex, wallGeo, wallMat, targetMat, targetGeo,
      grid.geometry as unknown as { dispose: () => void },
      grid.material as unknown as { dispose: () => void },
    );
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this.disposables.forEach(d => d.dispose());
    this.renderer.dispose();
  }
}
