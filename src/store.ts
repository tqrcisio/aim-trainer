import { create } from "zustand";
import { persist } from "zustand/middleware";

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

type SettingsStore = {
  settings: Settings;
  patch: (update: Partial<Settings>) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      patch: (update) =>
        set((state) => ({ settings: { ...state.settings, ...update } })),
    }),
    { name: "aim-trainer-settings" }
  )
);
