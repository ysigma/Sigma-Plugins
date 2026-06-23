/**
 * Color scales for the globe + legend.
 *
 * The colors come from ONE source: the user's color picks (or a default set as
 * a fallback). The legend entries' colors are exactly what paint each country,
 * so the legend and globe are always 1:1.
 *
 *  - buildMeasureBuckets: discrete buckets over a measure (one color per bucket)
 *  - buildCategoryScale:  one color per tier category
 */
import { scaleQuantile, scaleQuantize } from "d3-scale";
import { extent } from "d3-array";
import { formatCompact } from "./format";

export type BucketMethod = "Quantile" | "Equal interval";

export interface LegendEntry {
  color: string;
  label: string;
  key: string;
}

/** Fallback distinct colors used until the user picks their own. */
const DEFAULT_COLORS = [
  "#4e79a7",
  "#59a14f",
  "#f28e2b",
  "#e15759",
  "#b07aa1",
  "#76b7b2",
  "#edc948",
  "#ff9da7",
];

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

/** `n` colors from the chosen palette (custom picks, or the default set). */
export function colorsForCount(n: number, customColors?: string[]): string[] {
  const base = customColors && customColors.length > 0 ? customColors : DEFAULT_COLORS;
  const count = Math.max(1, Math.round(n));
  return Array.from({ length: count }, (_, i) => base[i % base.length]);
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
  method: BucketMethod,
  customColors: string[],
): BucketScale {
  const clean = values.filter((v) => typeof v === "number" && isFinite(v));
  if (clean.length === 0) {
    return { hasData: false, entries: [], colorByKey: new Map(), keyForValue: () => null };
  }
  // Number of buckets follows the number of colors the user picked.
  const useCustom = customColors.length >= 2;
  const k = useCustom ? customColors.length : 5;
  const colors = colorsForCount(k, useCustom ? customColors : undefined);
  const [min, max] = extent(clean) as [number, number];

  if (min === max) {
    const color = colors[colors.length - 1];
    return {
      hasData: true,
      entries: [{ color, label: formatCompact(min), key: "0" }],
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

// ---------- tier categories ----------
export interface CategoryScale {
  hasData: boolean;
  entries: LegendEntry[];
  colorByKey: Map<string, string>;
}

export function buildCategoryScale(
  categories: string[],
  customColors: string[],
): CategoryScale {
  if (categories.length === 0) {
    return { hasData: false, entries: [], colorByKey: new Map() };
  }
  const colors = colorsForCount(categories.length, customColors);
  const entries = categories.map((c, i) => ({ color: colors[i], label: c, key: c }));
  return {
    hasData: true,
    entries,
    colorByKey: new Map(entries.map((e) => [e.key, e.color])),
  };
}
