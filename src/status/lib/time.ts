/**
 * Time-bucketing helpers. Each square on the timeline represents one truncated
 * window of time (the "bucket"). The user picks the bucket size in the editor
 * panel; readings are floored to the start of their bucket so they line up into
 * a regular grid.
 */

export interface BucketDef {
  label: string;
  ms: number;
}

// The selectable bucket sizes (order = dropdown order).
export const BUCKETS: BucketDef[] = [
  { label: "1 minute", ms: 60_000 },
  { label: "5 minutes", ms: 5 * 60_000 },
  { label: "15 minutes", ms: 15 * 60_000 },
  { label: "30 minutes", ms: 30 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "6 hours", ms: 6 * 60 * 60_000 },
  { label: "1 day", ms: 24 * 60 * 60_000 },
];

export const BUCKET_LABELS: string[] = BUCKETS.map((b) => b.label);
export const DEFAULT_BUCKET = "5 minutes";

/** Cap on rendered columns so a tiny bucket over a huge range can't explode. */
export const MAX_BUCKETS = 600;

export function bucketMsForLabel(label: string | undefined): number {
  const found = BUCKETS.find((b) => b.label === label);
  return (found ?? BUCKETS[1]).ms; // default to 5 minutes
}

/**
 * Coerce a Sigma value into epoch milliseconds.
 * Handles datetime (epoch ms), epoch seconds, ISO strings, and Date objects.
 */
export function toEpochMs(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return isFinite(t) ? t : null;
  }
  if (typeof value === "number") {
    if (!isFinite(value)) return null;
    // Heuristic: values that look like epoch *seconds* get promoted to ms.
    if (value >= 1e9 && value < 1e12) return value * 1000;
    return value;
  }
  const s = String(value).trim();
  if (s === "") return null;
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && /^-?\d+(\.\d+)?$/.test(s)) {
    if (asNum >= 1e9 && asNum < 1e12) return asNum * 1000;
    return asNum;
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Floor an epoch-ms timestamp to the start of its bucket. */
export function truncateToBucket(ms: number, bucketMs: number): number {
  return Math.floor(ms / bucketMs) * bucketMs;
}

/**
 * Build the ordered list of bucket-start timestamps spanning [min, max].
 * Missing buckets are included (they render as "no data"), so real gaps in the
 * monitoring data show up as gaps on the timeline. Capped at MAX_BUCKETS.
 */
export function buildBucketRange(
  minMs: number,
  maxMs: number,
  bucketMs: number,
): { buckets: number[]; truncated: boolean } {
  const start = truncateToBucket(minMs, bucketMs);
  const end = truncateToBucket(maxMs, bucketMs);
  const count = Math.floor((end - start) / bucketMs) + 1;
  if (count <= MAX_BUCKETS) {
    const buckets: number[] = [];
    for (let t = start; t <= end; t += bucketMs) buckets.push(t);
    return { buckets, truncated: false };
  }
  // Too many buckets: keep the most recent MAX_BUCKETS.
  const buckets: number[] = [];
  const newStart = end - (MAX_BUCKETS - 1) * bucketMs;
  for (let t = newStart; t <= end; t += bucketMs) buckets.push(t);
  return { buckets, truncated: true };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Axis-tick label, formatted to suit the bucket size. */
export function formatTick(ms: number, bucketMs: number): string {
  const d = new Date(ms);
  if (bucketMs >= 24 * 60 * 60_000) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Full timestamp for tooltips. */
export function formatFull(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Choose ~`target` evenly spaced tick indices across `count` buckets, always
 * including the first and last.
 */
export function tickIndices(count: number, target = 8): number[] {
  if (count <= 1) return [0];
  const ticks = Math.min(target, count);
  const step = (count - 1) / (ticks - 1);
  const out: number[] = [];
  for (let i = 0; i < ticks; i++) out.push(Math.round(i * step));
  return Array.from(new Set(out));
}
