/**
 * Discrete (bucketed) color scale used to paint countries by the chosen metric,
 * plus the matching stepped legend.
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

const MIN_BUCKETS = 3;
const MAX_BUCKETS = 7;

function clampBuckets(k: number): number {
  if (!isFinite(k)) return 5;
  return Math.max(MIN_BUCKETS, Math.min(MAX_BUCKETS, Math.round(k)));
}

/** Return `k` discrete colors for the named palette. */
export function getPalette(name: string, k: number): string[] {
  const kk = clampBuckets(k);
  if (name === "Viridis") {
    return Array.from({ length: kk }, (_, i) =>
      interpolateViridis(kk === 1 ? 0.5 : i / (kk - 1)),
    );
  }
  const scheme = SCHEMES[name] ?? schemeBlues;
  return [...scheme[kk]];
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

/**
 * Build a bucketed color scale from the metric values present in the data.
 */
export function buildColorScale(
  values: number[],
  paletteName: string,
  buckets: number,
  method: BucketMethod,
): ColorScale {
  const clean = values.filter((v) => typeof v === "number" && isFinite(v));
  if (clean.length === 0) {
    return { hasData: false, colorFor: () => "#cccccc", legend: [] };
  }

  const k = clampBuckets(buckets);
  const colors = getPalette(paletteName, k);
  const [min, max] = extent(clean) as [number, number];

  // Degenerate case: every value is identical.
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

  // Quantile (default): each bucket holds roughly the same number of countries.
  const scale = scaleQuantile<string>().domain(clean).range(colors);
  const edges = [min, ...scale.quantiles(), max];
  const legend = colors.map((color, i) => ({
    color,
    label: rangeLabel(edges[i], edges[i + 1]),
  }));
  return { hasData: true, colorFor: (v) => scale(v), legend };
}
