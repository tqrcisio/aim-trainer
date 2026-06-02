export type CrosshairParams = {
  color: string;
  innerVisible: boolean;
  innerT: number; innerL: number; innerO: number; innerA: number;
  outerVisible: boolean;
  outerT: number; outerL: number; outerO: number; outerA: number;
  dot: boolean;
  outline: number;
};

const COLORS: Record<number, string> = {
  0: "#ffffff", 1: "#00ff00", 2: "#c8ff00", 3: "#ffff00",
  4: "#ff7700", 5: "#00ffff", 6: "#ff00ff", 7: "#ff0000",
};

const FALLBACK: CrosshairParams = {
  color: "#ffffff",
  innerVisible: true, innerT: 2, innerL: 6, innerO: 0, innerA: 1,
  outerVisible: false, outerT: 2, outerL: 6, outerO: 0, outerA: 1,
  dot: false, outline: 0,
};

export function parseCrosshairCode(code: string): CrosshairParams {
  if (!code || typeof code !== "string") return FALLBACK;
  const parts = code.split(";");
  const kv: Record<string, string> = {};
  const MARKERS = new Set(["P", "S", "A"]);
  let i = parts[0] && !isNaN(Number(parts[0])) ? 1 : 0;
  while (i < parts.length) {
    const key = parts[i];
    if (MARKERS.has(key)) { i++; continue; }
    if (i + 1 < parts.length && !MARKERS.has(parts[i + 1])) {
      kv[key] = parts[i + 1]; i += 2;
    } else { i++; }
  }
  const c = parseInt(kv["c"] || "0");
  const color = c === 8 && kv["u"] ? "#" + kv["u"] : (COLORS[c] ?? "#ffffff");
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
