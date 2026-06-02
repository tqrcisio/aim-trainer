# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (Vite, usually port 5173)
pnpm build        # tsc -b + vite build
pnpm typecheck    # tsc --noEmit (no emit, just type errors)
pnpm lint         # eslint
pnpm format       # prettier --write
```

Adding UI components:
```bash
pnpm dlx shadcn@latest add @8bitcn/<name>   # 8bitcn component (preferred)
pnpm dlx shadcn@latest add <name>           # shadcn base component
```

## Architecture

Single-file game: all game logic and UI lives in `src/AimRangeTrainer.tsx`. `src/App.tsx` just re-exports it.

**Layers inside `AimRangeTrainer.tsx`:**

1. **`AimEngine` class** (imperative, ~500 lines) — owns the Three.js scene, WebGL renderer, pointer lock, mouse movement, shooting raycasting, audio, and game loop. Communicates upward via callbacks (`onStats`, `onPause`, `onHit`, `onEnd`, etc.). Never touches React state directly.

2. **Crosshair system** — `parseCrosshairCode(code)` decodes Valorant crosshair strings (semicolon key-value format) into `CrosshairParams`. `CrosshairRenderer` draws the crosshair with absolute-positioned `<span>` elements, same technique as tracker.gg. `PRO_CROSSHAIRS` is a hardcoded list of 12 pro player codes sourced from the tracker.gg API.

3. **Screen components** — `Menu`, `SettingsPanel`, `CrosshairPicker`, `Pause`, `Results`. All use 8bitcn components (Card, Button, Input, Select, Badge from `@/components/ui/8bit/`). Screen transitions are driven by a `screen` state union in the root component.

4. **Root `AimRangeTrainer`** — mounts/disposes the engine, wires callbacks, manages `screen` state, and reads settings from the Zustand store.

**State:**
- `src/store.ts` — Zustand store with `persist` middleware. Key `aim-trainer-settings` in localStorage. All user settings (sens, dpi, fov, size, invert, crosshairCode) live here. Access with `useSettingsStore((s) => s.settings)` and `useSettingsStore((s) => s.patch)`.
- Ephemeral game state (score, time, pause, results, toast, hit flash) lives in local `useState` inside the root component.

## UI Stack

- **Tailwind v4** — config is in `src/index.css` via `@theme inline {}`, not `tailwind.config.js`. All CSS variables are OKLCH.
- **shadcn/ui** (radix-lyra style) + **8bitcn** registry as the primary component set. 8bitcn components wrap shadcn primitives and add pixel-border effects.
- **Font:** "Press Start 2P" (Google Fonts) set globally. All 8bitcn components default to this font; do not add `font="normal"` overrides.
- **Dark mode:** the root `<div id="app">` has `className="dark"`, activating shadcn's dark theme tokens for all components.
- Icon library: `@phosphor-icons/react` (configured in `components.json`).

## Crosshair Code Format

Valorant crosshair codes: `0;P;c;5;h;0;0l;4;0o;2;0a;1;1b;0`

- `0` = version, `P` = primary section marker, `S` = scope section marker
- `c` = color index (0=white, 1=green, 5=cyan, 7=red, 8=custom+`u;RRGGBB`)
- `h` = center dot, `0b`/`1b` = inner/outer visible (0=hide), `0t`/`1t` = thickness, `0l`/`1l` = length, `0o`/`1o` = offset, `0a`/`1a` = alpha
- `o` = outline opacity

## Commits

Write commit messages in English only. No "Co-Authored-By" lines.
