import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Replay } from "./engine/replay-types";

export type Settings = {
  sens: number;
  dpi: number;
  fov: number;
  size: "small" | "medium" | "large";
  invert: number;
  crosshairCode: string;
};

const DEFAULT_SETTINGS: Settings = {
  sens: 0.4,
  dpi: 800,
  fov: 103,
  size: "medium",
  invert: 0,
  crosshairCode: "0;P;h;0;0l;5;0o;2;0a;1;0f;0;1b;0",
};

type Store = {
  settings: Settings;
  patch: (update: Partial<Settings>) => void;
  replays: Replay[];
  addReplay: (r: Replay) => void;
};

export const useSettingsStore = create<Store>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      patch: (update) =>
        set((state) => ({ settings: { ...state.settings, ...update } })),
      replays: [],
      addReplay: (r) =>
        set((state) => ({ replays: [r, ...state.replays].slice(0, 20) })),
    }),
    { name: "aim-trainer-settings" }
  )
);
