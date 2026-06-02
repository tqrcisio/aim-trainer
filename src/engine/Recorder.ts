import type { Replay, ReplayMouseEvent, ReplayShotEvent, ReplayKeyframe } from "./replay-types";
import type { Settings } from "@/store";

type KeyframeState = Omit<ReplayKeyframe, "t">;

export class Recorder {
  private startTime = 0;
  private mouseEvents: ReplayMouseEvent[] = [];
  private shotEvents: ReplayShotEvent[] = [];
  private keyframes: ReplayKeyframe[] = [];
  private kfInterval: ReturnType<typeof setInterval> | null = null;
  private getState: (() => KeyframeState) | null = null;

  begin(getState: () => KeyframeState) {
    this.startTime = performance.now();
    this.mouseEvents = [];
    this.shotEvents = [];
    this.keyframes = [];
    this.getState = getState;
    this.keyframes.push({ ...getState(), t: 0 });
    this.kfInterval = setInterval(() => {
      const t = (performance.now() - this.startTime) / 1000;
      this.keyframes.push({ ...this.getState!(), t });
    }, 5000);
  }

  recordMouse(dx: number, dy: number) {
    const t = (performance.now() - this.startTime) / 1000;
    this.mouseEvents.push({ t, dx, dy });
  }

  recordShot(hit: boolean, targetIdx: number, newPos?: [number, number, number]) {
    const t = (performance.now() - this.startTime) / 1000;
    this.shotEvents.push({ t, hit, targetIdx, newPos });
  }

  finish(meta: {
    score: number;
    acc: number;
    duration: number;
    settings: Pick<Settings, "sens" | "dpi" | "fov" | "size">;
  }): Replay {
    if (this.kfInterval) { clearInterval(this.kfInterval); this.kfInterval = null; }
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...meta,
      mouseEvents: this.mouseEvents,
      shotEvents: this.shotEvents,
      keyframes: this.keyframes,
    };
  }
}
