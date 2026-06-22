/**
 * Color scales for the globe:
 *  - buildColorScale:   discrete buckets over a numeric measure (quantile /
 *                       equal-interval), optionally with a custom hex palette.
 *  - buildCategoryScale: one color per category (used to color by a tier column).
 * Plus the matching legend entries.
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

/** Return exactly `n` colors for the named palette (or the custom list). */
export function colorsForCount(
  name: string,
  n: number,
  customColors?: string[],
): string[] {
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
  // Larger than the scheme provides: sample from its widest set.
  const widest = scheme[scheme.length - 1];
  return Array.from({ length: count }, (_, i) =>
    widest[Math.round((i / (count - 1)) * (widest.length - 1))],
  );
}

export interface LegendEntry {
  color: string;
  label: string;
}

export interface ColorScale {
  hasData: boolean;
  colorFor: (value: number) => string;
  legend: LegendEntry[];
}

function rangeLabel(a: number, b: number): string {
  if (a === b) return formatCompact(a);
  return `${formatCompact(a)} – ${formatCompact(b)}`;
}

/** Discrete bucketed color scale over a numeric measure. */
export function buildColorScale(
  values: number[],
  paletteName: string,
  buckets: number,
  method: BucketMethod,
  customColors?: string[],
): ColorScale {
  const clean = values.filter((v) => typeof v === "number" && isFinite(v));
  if (clean.length === 0) {
    return { hasData: false, colorFor: () => "#cccccc", legend: [] };
  }

  // With a custom palette, the number of colors drives the number of buckets.
  const useCustom =
    (paletteName === "Custom" || (customColors?.length ?? 0) > 0) &&
    (customColors?.length ?? 0) >= 2;
  const k = useCustom
    ? (customColors as string[]).length
    : Math.max(3, Math.min(7, Math.round(buckets) || 5));
  const colors = colorsForCount(paletteName, k, customColors);
  const [min, max] = extent(clean) as [number, number];

  if (min === max) {
    const color = colors[colors.length - 1];
    return {
      hasData: true,
      colorFor: () => color,
      legend: [{ color, label: formatCompact(min) }],
    };
  }

  if (method === "Equal interval") {
    const scale = scaleQuantize<string>().domain([min, max]).range(colors);
    const edges = [min, ...scale.thresholds(), max];
    const legend = colors.map((color, i) => ({
      color,
      label: rangeLabel(edges[i], edges[i + 1]),
    }));
    return { hasData: true, colorFor: (v) => scale(v), legend };
  }

  const scale = scaleQuantile<string>().domain(clean).range(colors);
  const edges = [min, ...scale.quantiles(), max];
  const legend = colors.map((color, i) => ({
    color,
    label: rangeLabel(edges[i], edges[i + 1]),
  }));
  return { hasData: true, colorFor: (v) => scale(v), legend };
}

export interface CategoryScale {
  hasData: boolean;
  colorFor: (category: string) => string;
  legend: LegendEntry[];
}

/**
 * One color per category, used to color by a tier column. `categories` is the
 * ordered list of tier values (low -> high) that also drives the legend order.
 */
export function buildCategoryScale(
  categories: string[],
  paletteName: string,
  customColors?: string[],
): CategoryScale {
  if (categories.length === 0) {
    return { hasData: false, colorFor: () => "#cccccc", legend: [] };
  }
  const colors = colorsForCount(paletteName, categories.length, customColors);
  const byCategory = new Map<string, string>();
  categories.forEach((cat, i) => byCategory.set(cat, colors[i]));

  return {
    hasData: true,
    colorFor: (category) => byCategory.get(category) ?? "#cccccc",
    legend: categories.map((cat, i) => ({ color: colors[i], label: cat })),
  };
}
