/**
 * Status classification + per-bucket aggregation.
 *
 * The plugin runs in binary "up / down" mode (with an optional "degraded"
 * middle state). A single reading's value is mapped to one of these states by
 * `classify`; when several readings land in the same time bucket they are
 * combined by `aggregate` according to the user's chosen strategy.
 */

export type Status = "up" | "degraded" | "down" | "nodata";

// Severity ranking — higher wins under "Worst status wins".
export const SEVERITY: Record<Status, number> = {
  nodata: 0,
  up: 1,
  degraded: 2,
  down: 3,
};

// Default token sets (case-insensitive). User-supplied values extend these.
const DEFAULT_DOWN = [
  "0", "false", "no", "down", "offline", "off", "error", "err", "fail",
  "failed", "failure", "critical", "crit", "outage", "unhealthy", "dead",
  "red", "bad",
];
const DEFAULT_DEGRADED = [
  "degraded", "degrade", "warn", "warning", "slow", "partial", "amber",
  "yellow", "minor", "unstable", "flapping",
];
const DEFAULT_UP = [
  "1", "true", "yes", "up", "online", "ok", "okay", "healthy", "success",
  "pass", "passed", "operational", "good", "green", "available",
];

export function parseTokenList(input: string | undefined | null): string[] {
  if (!input) return [];
  return input
    .split(/[,\n;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export interface Classifier {
  classify(raw: unknown): Status;
}

/** Build a classifier from the optional user-supplied down/degraded lists. */
export function makeClassifier(
  userDown: string[],
  userDegraded: string[],
): Classifier {
  const downSet = new Set([...DEFAULT_DOWN, ...userDown]);
  const degradedSet = new Set([...DEFAULT_DEGRADED, ...userDegraded]);
  const upSet = new Set(DEFAULT_UP);

  return {
    classify(raw: unknown): Status {
      if (raw == null) return "nodata";
      const s = String(raw).trim();
      if (s === "") return "nodata";
      const lower = s.toLowerCase();

      // Explicit token matches take priority (degraded before down before up).
      if (degradedSet.has(lower)) return "degraded";
      if (downSet.has(lower)) return "down";
      if (upSet.has(lower)) return "up";

      if (typeof raw === "boolean") return raw ? "up" : "down";
      if (typeof raw === "number") {
        if (!isFinite(raw)) return "nodata";
        return raw === 0 ? "down" : "up";
      }

      // Numeric strings: 0 is down, any other finite number is up.
      const n = Number(lower);
      if (lower !== "" && !Number.isNaN(n) && isFinite(n)) {
        return n === 0 ? "down" : "up";
      }

      // Unknown but non-empty: assume the service reported something → up.
      return "up";
    },
  };
}

export const AGGREGATIONS = ["Worst status wins", "Most recent", "Average"] as const;
export type Aggregation = (typeof AGGREGATIONS)[number];
export const AGGREGATION_LABELS: string[] = [...AGGREGATIONS];
export const DEFAULT_AGGREGATION: Aggregation = "Worst status wins";

export function parseAggregation(value: string | undefined): Aggregation {
  return (AGGREGATIONS as readonly string[]).includes(value ?? "")
    ? (value as Aggregation)
    : DEFAULT_AGGREGATION;
}

export interface Reading {
  ms: number;
  raw: unknown;
}

/** Combine the readings that fall in one bucket into a single status. */
export function aggregate(
  readings: Reading[],
  mode: Aggregation,
  classifier: Classifier,
): Status {
  if (readings.length === 0) return "nodata";

  if (mode === "Most recent") {
    let latest = readings[0];
    for (const r of readings) if (r.ms > latest.ms) latest = r;
    return classifier.classify(latest.raw);
  }

  if (mode === "Average") {
    let sum = 0;
    let n = 0;
    for (const r of readings) {
      const v = typeof r.raw === "boolean" ? (r.raw ? 1 : 0) : Number(r.raw);
      if (!Number.isNaN(v) && isFinite(v)) {
        sum += v;
        n += 1;
      }
    }
    if (n > 0) return classifier.classify(sum / n);
    // Non-numeric data — fall through to worst-wins.
  }

  // Worst status wins (also the Average fallback).
  let worst: Status = "nodata";
  for (const r of readings) {
    const s = classifier.classify(r.raw);
    if (SEVERITY[s] > SEVERITY[worst]) worst = s;
  }
  return worst;
}

export interface Palette {
  up: string;
  degraded: string;
  down: string;
  nodata: string;
}

export function colorFor(status: Status, palette: Palette): string {
  return palette[status];
}

export const STATUS_LABEL: Record<Status, string> = {
  up: "Up",
  degraded: "Degraded",
  down: "Down",
  nodata: "No data",
};
