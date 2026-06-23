/**
 * Color scales for the globe + legend. The legend and globe always use the
 * SAME colors (1:1): the legend entries' colors are exactly what paints each
 * country.
 *
 *  - buildMeasureBuckets:    discrete buckets over a measure (categorical legend)
 *  - buildMeasureContinuous: smooth gradient over a measure (color-scale legend)
 *  - buildCategoryScale:     one color per tier category (either legend style)
 */
import { scaleQuantile, scaleQuantize } from "d3-scale";
import { extent } from "d3-array";
import {
  schemeBlues,
  schemeGreens,
  schemeOranges,
  schemeReds,
  schemePurples,
  schemeYlGnBu,
  schemeRdBu,
  interpolateViridis,
} from "d3-scale-chromatic";
import { formatCompact } from "./format";

export type BucketMethod = "Quantile" | "Equal interval";
export type LegendStyle = "Categorical" | "Color scale";

export const PALETTE_NAMES = [
  "Blues",
  "Greens",
  "Oranges",
  "Reds",
  "Purples",
  "Viridis",
  "Yellow-Green-Blue",
  "Red-Blue (diverging)",
  "Custom",
] as const;

const SCHEMES: Record<string, readonly (readonly string[])[]> = {
  Blues: schemeBlues,
  Greens: schemeGreens,
  Oranges: schemeOranges,
  Reds: schemeReds,
  Purples: schemePurples,
  "Yellow-Green-Blue": schemeYlGnBu,
  "Red-Blue (diverging)": schemeRdBu,
};

export interface LegendEntry {
  color: string;
  label: string;
  key: string;
}

/** Parse a comma/space/newline-separated list of hex colors into #rrggbb strings. */
export function parseHexColors(input: string | undefined | null): string[] {
  if (!input) return [];
  return input
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("#") ? s : `#${s}`))
    .filter((s) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s));
}

/** `n` distinct colors for the named palette (or the custom list). */
export function colorsForCount(name: string, n: number, customColors?: string[]): string[] {
  const count = Math.max(1, Math.round(n));
  if (name === "Custom" || (customColors && customColors.length > 0)) {
    const custom = customColors ?? [];
    if (custom.length === 0) return colorsForCount("Blues", count);
    return Array.from({ length: count }, (_, i) => custom[i % custom.length]);
  }
  if (name === "Viridis") {
    return Array.from({ length: count }, (_, i) =>
      interpolateViridis(count === 1 ? 0.5 : i / (count - 1)),
    );
  }
  const scheme = SCHEMES[name] ?? schemeBlues;
  if (count <= 2) return scheme[3].slice(0, count);
  if (scheme[count]) return [...scheme[count]];
  const widest = scheme[scheme.length - 1];
  return Array.from({ length: count }, (_, i) =>
    widest[Math.round((i / (count - 1)) * (widest.length - 1))],
  );
}

// ---------- continuous ramp helpers ----------
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const f = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** Color stops that define a continuous ramp for the palette. */
export function rampStops(palette: string, customColors?: string[]): string[] {
  if (customColors && customColors.length >= 2) return customColors;
  if (customColors && customColors.length === 1) return [customColors[0], customColors[0]];
  if (palette === "Viridis") return Array.from({ length: 9 }, (_, i) => interpolateViridis(i / 8));
  const scheme = SCHEMES[palette] ?? schemeBlues;
  const widest = scheme[Math.min(9, scheme.length - 1)] ?? scheme[scheme.length - 1];
  return [...widest];
}

/** Sample a ramp (array of color stops) at t in [0,1]. */
export function rampColorAt(stops: string[], t: number): string {
  if (stops.length === 0) return "#cccccc";
  if (stops.length === 1) return stops[0];
  const tt = Math.max(0, Math.min(1, t));
  const seg = tt * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const [r1, g1, b1] = hexToRgb(stops[i]);
  const [r2, g2, b2] = hexToRgb(stops[i + 1]);
  return rgbToHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}

/** A CSS `linear-gradient(...)` string from color stops. */
export function gradientCss(stops: string[]): string {
  if (stops.length === 0) return "#cccccc";
  if (stops.length === 1) return stops[0];
  const parts = stops.map((c, i) => `${c} ${((i / (stops.length - 1)) * 100).toFixed(1)}%`);
  return `linear-gradient(to right, ${parts.join(", ")})`;
}

function rangeLabel(a: number, b: number): string {
  if (a === b) return formatCompact(a);
  return `${formatCompact(a)} – ${formatCompact(b)}`;
}

// ---------- measure: discrete buckets ----------
export interface BucketScale {
  hasData: boolean;
  entries: LegendEntry[];
  colorByKey: Map<string, string>;
  keyForValue: (v: number) => string | null;
}

export function buildMeasureBuckets(
  values: number[],
  palette: string,
  buckets: number,
  method: BucketMethod,
  customColors?: string[],
): BucketScale {
  const clean = values.filter((v) => typeof v === "number" && isFinite(v));
  if (clean.length === 0) {
    return { hasData: false, entries: [], colorByKey: new Map(), keyForValue: () => null };
  }
  const useCustom =
    (palette === "Custom" || (customColors?.length ?? 0) > 0) && (customColors?.length ?? 0) >= 2;
  const k = useCustom
    ? (customColors as string[]).length
    : Math.max(3, Math.min(7, Math.round(buckets) || 5));
  const colors = colorsForCount(palette, k, customColors);
  const [min, max] = extent(clean) as [number, number];

  if (min === max) {
    const color = colors[colors.length - 1];
    const entries = [{ color, label: formatCompact(min), key: "0" }];
    return {
      hasData: true,
      entries,
      colorByKey: new Map([["0", color]]),
      keyForValue: () => "0",
    };
  }

  const scale =
    method === "Equal interval"
      ? scaleQuantize<string>().domain([min, max]).range(colors)
      : scaleQuantile<string>().domain(clean).range(colors);
  const edges =
    method === "Equal interval"
      ? [min, ...(scale as ReturnType<typeof scaleQuantize<string>>).thresholds(), max]
      : [min, ...(scale as ReturnType<typeof scaleQuantile<string>>).quantiles(), max];

  const entries = colors.map((color, i) => ({
    color,
    label: rangeLabel(edges[i], edges[i + 1]),
    key: String(i),
  }));
  const colorByKey = new Map(entries.map((e) => [e.key, e.color]));
  const keyForValue = (v: number): string | null => {
    if (!isFinite(v)) return null;
    for (let i = 0; i < edges.length - 1; i++) {
      if (v <= edges[i + 1] || i === edges.length - 2) return String(i);
    }
    return String(colors.length - 1);
  };
  return { hasData: true, entries, colorByKey, keyForValue };
}

// ---------- measure: continuous gradient ----------
export interface ContinuousScale {
  hasData: boolean;
  colorForValue: (v: number) => string;
  gradientCss: string;
  ticks: { pos: number; label: string }[];
}

export function buildMeasureContinuous(
  values: number[],
  palette: string,
  customColors?: string[],
): ContinuousScale {
  const clean = values.filter((v) => typeof v === "number" && isFinite(v));
  if (clean.length === 0) {
    return { hasData: false, colorForValue: () => "#cccccc", gradientCss: "#cccccc", ticks: [] };
  }
  const stops = rampStops(palette, customColors);
  const [min, max] = extent(clean) as [number, number];
  const span = max - min || 1;
  return {
    hasData: true,
    colorForValue: (v) => rampColorAt(stops, (v - min) / span),
    gradientCss: gradientCss(stops),
    ticks: [0, 0.25, 0.5, 0.75, 1].map((p) => ({ pos: p, label: formatCompact(min + p * span) })),
  };
}

// ---------- tier categories ----------
export interface CategoryScale {
  hasData: boolean;
  entries: LegendEntry[];
  colorByKey: Map<string, string>;
}

export function buildCategoryScale(
  categories: string[],
  palette: string,
  customColors: string[] | undefined,
  legendStyle: LegendStyle,
): CategoryScale {
  if (categories.length === 0) {
    return { hasData: false, entries: [], colorByKey: new Map() };
  }
  const n = categories.length;
  let colors: string[];
  if (legendStyle === "Color scale") {
    const stops = rampStops(palette, customColors);
    colors = Array.from({ length: n }, (_, i) => rampColorAt(stops, n === 1 ? 0.5 : i / (n - 1)));
  } else {
    colors = colorsForCount(palette, n, customColors);
  }
  const entries = categories.map((c, i) => ({ color: colors[i], label: c, key: c }));
  return {
    hasData: true,
    entries,
    colorByKey: new Map(entries.map((e) => [e.key, e.color])),
  };
}
