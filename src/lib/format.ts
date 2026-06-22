/** Number formatting helpers shared by the legend and the hover tooltip. */

const EM_DASH = "–";

/**
 * Compact-ish formatting for legend ranges (e.g. 1.2M, 4.5K, 0.03).
 */
export function formatCompact(n: number): string {
  if (n == null || !isFinite(n)) return EM_DASH;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 100_000 || abs < 0.001)) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

/**
 * Full, grouped formatting for the hover tooltip (e.g. 1,234,567.89).
 */
export function formatFull(n: number): string {
  if (n == null || !isFinite(n)) return EM_DASH;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}
