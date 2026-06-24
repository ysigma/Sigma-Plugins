/**
 * Colour + severity model for the threat-origin arc map.
 *
 * The whole map lives in an orange family matched to the reference design.
 * Severity does not change the *hue* — it only pushes the same orange brighter
 * (toward a hot highlight) or dimmer (toward a deep ember) and scales line
 * width, flow speed and pulse size. That keeps the "uniform orange" look while
 * letting Critical / High traffic read hotter and faster ("orange + accents").
 */

export type SeverityKey = "critical" | "high" | "medium" | "low" | "unknown";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/* ---------- colour utilities ---------- */

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec((hex || "").trim());
  if (!m) return { r: 255, g: 90, b: 31 };
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba({ r, g, b }: RGB, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  };
}

/** Relative luminance (0..1) — used to auto-contrast label text if needed. */
export function luminance({ r, g, b }: RGB): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* ---------- severity ---------- */

export function normalizeSeverity(raw: unknown): SeverityKey {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "unknown";
  if (s.startsWith("crit") || s === "4" || s === "p1") return "critical";
  if (s.startsWith("high") || s === "3" || s === "p2") return "high";
  if (s.startsWith("med") || s === "2" || s === "p3") return "medium";
  if (s.startsWith("low") || s.startsWith("info") || s === "1" || s === "p4")
    return "low";
  return "unknown";
}

export const SEVERITY_RANK: Record<SeverityKey, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

export const SEVERITY_LABEL: Record<SeverityKey, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
};

/** Highest-severity-first, for tooltip breakdowns and legends. */
export const SEVERITY_ORDER: SeverityKey[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

/* ---------- per-severity visual accents ---------- */

export interface Accent {
  /** Multiplier on the base core line width. */
  width: number;
  /** Brightness push: >0 toward hot highlight, <0 toward deep ember. */
  bright: number;
  /** Multiplier on the flow (comet) speed. */
  speed: number;
  /** Multiplier on pulse-ring size / intensity at the origin. */
  pulse: number;
}

export const ACCENTS: Record<SeverityKey, Accent> = {
  critical: { width: 2.4, bright: 0.55, speed: 1.7, pulse: 1.55 },
  high: { width: 1.8, bright: 0.34, speed: 1.35, pulse: 1.28 },
  medium: { width: 1.3, bright: 0.12, speed: 1.05, pulse: 1.0 },
  low: { width: 1.0, bright: -0.2, speed: 0.82, pulse: 0.82 },
  unknown: { width: 1.15, bright: 0.0, speed: 1.0, pulse: 0.95 },
};

/** Used when severity accents are turned off — everything reads identically. */
export const NEUTRAL_ACCENT: Accent = {
  width: 1.35,
  bright: 0.06,
  speed: 1.0,
  pulse: 1.0,
};

const HOT: RGB = { r: 255, g: 228, b: 170 }; // warm white-orange highlight
const EMBER: RGB = { r: 120, g: 44, b: 8 }; // deep ember

/** Push the base orange brighter (hot) or dimmer (ember) per the accent. */
export function accentColor(base: RGB, bright: number): RGB {
  if (bright >= 0) return mix(base, HOT, Math.min(bright, 1));
  return mix(base, EMBER, Math.min(-bright, 1));
}
