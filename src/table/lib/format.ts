export function formatNumber(value: number, mode: string): string {
  if (!isFinite(value)) return "";
  if (mode === "Plain (1234)") return String(Math.round(value));
  if (mode === "Compact (1.2K)") {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return sign + String(Math.round(abs));
  }
  return value.toLocaleString("en-US");
}
