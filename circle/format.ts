/** Number formatting for the measure shown below each circle. */

const EM_DASH = "–";

/**
 * Format a number for display. `decimals` may be a fixed digit count, or
 * "auto" for a sensible compact-ish format (grouped thousands, up to 2
 * fraction digits, compact notation for very large/small magnitudes).
 */
export function formatNumber(n: number, decimals: number | "auto" = "auto"): string {
  if (n == null || !isFinite(n)) return EM_DASH;

  if (typeof decimals === "number") {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 100_000 || abs < 0.001)) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}
