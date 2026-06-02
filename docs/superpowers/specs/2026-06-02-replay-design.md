# Replay System Design

## Goal

Ghost replay 3D: after a Gridshot run, the player can watch an exact reproduction of their session in the Three.js scene, with play/pause, 0.25x–2x speed, and a scrubber bar.

## Approach

Event stream recording. Every raw mouse delta and shot event is captured during the run. A keyframe (full camera + target state) is saved every 5 seconds to enable O(log n) scrubbing without re-simulating from t=0. On replay load, all camera positions are pre-computed from the event stream into a flat array, making frame lookup a binary search.

## Data Structures

```ts
type ReplayMouseEvent = { t: number; dx: number; dy: number };
type ReplayShotEvent  = { t: number; hit: boolean; targetIdx: number; newPos?: [number, number, number] };
type ReplaySpawnEvent = { t: number; targetIdx: number; pos: [number, number, number] };
type ReplayKeyframe   = { t: number; yaw: number; pitch: number; targets: Array<{ pos: [number, number, number]; visible: boolean }> };

type Replay = {
  id: string;
  date: string;
  score: number;
  acc: number;
  duration: number;
  settings: Pick<Settings, "sens" | "dpi" | "fov" | "size">;
  mouseEvents: ReplayMouseEvent[];
  shotEvents: ReplayShotEvent[];
  spawnEvents: ReplaySpawnEvent[];
  keyframes: ReplayKeyframe[];  // one every 5s
};
```

Estimated size: 50–80 KB per 60s run.

## Recording: `Recorder` class (`src/engine/Recorder.ts`)

Injected into `AimEngine` as an optional dependency. The engine calls recorder methods; it does not know or care whether recording is active.

```ts
class Recorder {
  begin(getState: () => ReplayKeyframe): void
  recordMouse(dx: number, dy: number): void
  recordShot(hit: boolean, targetIdx: number, newPos?: [number, number, number]): void
  recordSpawn(targetIdx: number, pos: [number, number, number]): void
  finish(meta: { score, acc, duration, settings }): Replay
}
```

`begin()` starts the timer and sets up a `setInterval` at 5s for keyframes. `finish()` clears the interval and returns the complete `Replay` object. The engine gets a `recorder?: Recorder` constructor param; all `recorder?.method()` calls are no-ops when null.

## Playback: `ReplayEngine` class (`src/engine/ReplayEngine.ts`)

Takes a `Replay` and a canvas. On `load()`:
1. Initialises the same Three.js scene as `AimEngine` (same geometry, same lighting).
2. Pre-computes a `cameraTrack: Array<{ t, yaw, pitch }>` by simulating all mouseEvents from t=0.
3. Stores `shotEvents` and `spawnEvents` sorted by `t`.

On each animation frame:
- `currentT = elapsedReal * speedFactor`
- Binary-search `cameraTrack` for current `t` → set `camera.rotation`
- Walk `shotEvents` forward, applying any events whose `t <= currentT` (spawn target at new position, play blip)
- Render scene

Scrubbing to `seekT`:
1. Find nearest keyframe `kf` where `kf.t <= seekT`
2. Load `kf` state (camera angles + target transforms)
3. Re-simulate mouseEvents from `kf.t` to `seekT` to get exact camera position
4. Set `eventCursor` to first shot/spawn event after `kf.t`
5. Resume playback

## Storage: Zustand slice (`src/store.ts`)

Add `replays: Replay[]` and `addReplay(r: Replay)` to the existing persisted store. `addReplay` prepends and trims to the last 20 entries (FIFO). ~1.5 MB max in localStorage.

## UI

**New screen state:** `"replay"` added to the `Screen` union in `AimRangeTrainer.tsx`.

**Entry points:**
- Results screen: "Ver Replay" button (replay of the run just finished)
- Main menu: "Replays" button opens a `ReplayList` screen listing saved runs

**`ReplayList` screen:** Card with a list of past replays (date, score, acc). Click any to enter `"replay"` screen.

**`ReplayScreen` component:**
- Full-screen canvas (same approach as the game canvas)
- Overlay at bottom: timeline bar with shot markers (green = hit, red = miss), current time / total time
- Controls: play/pause button, speed selector (0.25x / 0.5x / 1x / 2x)
- "Fechar" button returns to menu

**New files:**
```
src/engine/Recorder.ts
src/engine/ReplayEngine.ts
src/components/screens/ReplayList.tsx
src/components/screens/ReplayScreen.tsx
```

**Modified files:**
- `src/engine/AimEngine.ts` — add optional `recorder` param, call recorder hooks
- `src/store.ts` — add `replays` slice
- `src/AimRangeTrainer.tsx` — wire up Recorder, add replay screens to screen union
- `src/components/screens/Results.tsx` — add "Ver Replay" button
- `src/components/screens/Menu.tsx` — add "Replays" button
