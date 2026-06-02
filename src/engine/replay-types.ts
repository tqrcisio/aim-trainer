import type { Settings } from "@/store";

export type ReplayMouseEvent = { t: number; dx: number; dy: number };
export type ReplayShotEvent = {
  t: number;
  hit: boolean;
  targetIdx: number;
  newPos?: [number, number, number];
};
export type ReplayKeyframe = {
  t: number;
  yaw: number;
  pitch: number;
  targets: Array<{ pos: [number, number, number]; visible: boolean }>;
};

export type Replay = {
  id: string;
  date: string;
  score: number;
  acc: number;
  duration: number;
  settings: Pick<Settings, "sens" | "dpi" | "fov" | "size">;
  mouseEvents: ReplayMouseEvent[];
  shotEvents: ReplayShotEvent[];
  keyframes: ReplayKeyframe[];
};
