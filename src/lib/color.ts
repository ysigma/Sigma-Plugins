/**
 * Categorical color scale: one color per tier category. The colors come from
 * the user's color picks, mapped POSITIONALLY to the tier order (Color 1 ->
 * first tier, Color 2 -> second, ...). Empty slots fall back to a default
 * color for that position (they do not shift the others). Tier values are
 * matched case/whitespace-insensitively so they line up with the typed order.
 */

export interface LegendEntry {
  color: string;
  label: string;
  key: string;
}

/** Fallback distinct colors used for positions the user hasn't picked. */
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

function isHex(s: unknown): s is string {
  return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s);
}

/** Parse a comma/space/newline-separated list of hex colors into #rrggbb strings. */
export function parseHexColors(input: string | undefined | null): string[] {
  if (!input) return [];
  return input
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("#") ? s : `#${s}`))
    .filter(isHex);
}

/** Normalize a tier value for matching (trim + lowercase + collapse spaces). */
export function normalizeTier(value: unknown): string {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export interface CategoryScale {
  hasData: boolean;
  entries: LegendEntry[];
  keyForTier: (raw: unknown) => string | null;
  colorForKey: (key: string) => string | undefined;
}

/**
 * @param categories ordered tier labels (low -> high)
 * @param colors positional color slots (may contain null/empty -> default)
 */
export function buildCategoryScale(
  categories: string[],
  colors: (string | null | undefined)[],
): CategoryScale {
  if (categories.length === 0) {
    return { hasData: false, entries: [], keyForTier: () => null, colorForKey: () => undefined };
  }
  const entries = categories.map((label, i) => ({
    color: isHex(colors[i]) ? (colors[i] as string) : DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    label,
    key: normalizeTier(label),
  }));
  const colorByKey = new Map(entries.map((e) => [e.key, e.color]));
  return {
    hasData: true,
    entries,
    keyForTier: (raw) =>
      raw == null || String(raw).trim() === "" ? null : normalizeTier(raw),
    colorForKey: (key) => colorByKey.get(key),
  };
}
