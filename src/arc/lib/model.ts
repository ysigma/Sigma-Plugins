/**
 * Turns raw Sigma columns into the render model: one **arc** per
 * source→destination route, one **origin** point per source location, and one
 * **destination** point per target location. Rows sharing a location are
 * aggregated (volume summed, peak severity kept) so the animation stays smooth
 * and the tooltips read as a summary rather than thousands of raw events.
 */
import {
  normalizeSeverity,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  SEVERITY_RANK,
  type SeverityKey,
} from "./theme";

export interface Arc {
  id: string;
  srcLat: number;
  srcLon: number;
  dstLat: number;
  dstLon: number;
  srcLabel: string;
  dstLabel: string;
  severity: SeverityKey;
  severityRank: number;
  count: number;
  rows: number;
  /** Deterministic initial flow phase 0..1 (de-syncs the comets). */
  phase: number;
  tooltipHtml: string;
}

export interface OriginPoint {
  id: string;
  lat: number;
  lon: number;
  label: string;
  count: number;
  rows: number;
  severity: SeverityKey;
  severityRank: number;
  phase: number;
  tooltipHtml: string;
}

export interface DestPoint {
  id: string;
  lat: number;
  lon: number;
  label: string;
  count: number;
  rows: number;
  origins: number;
  tooltipHtml: string;
}

export interface ThreatModel {
  arcs: Arc[];
  origins: OriginPoint[];
  dests: DestPoint[];
  totalRows: number;
  /** Rows skipped for missing/invalid source coordinates. */
  unmapped: number;
  /** Arcs dropped by the render cap (0 when nothing was dropped). */
  cappedArcs: number;
}

export interface BuildInput {
  srcLat: unknown[];
  srcLon: unknown[];
  dstLat?: unknown[];
  dstLon?: unknown[];
  srcLabel?: unknown[];
  dstLabel?: unknown[];
  severity?: unknown[];
  weight?: unknown[];
  attackType?: unknown[];
  target?: unknown[];
  defaultDest: { lat: number; lon: number; label: string };
  maxArcs: number;
}

/* ---------- small helpers ---------- */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function validLat(n: number): boolean {
  return isFinite(n) && n >= -90 && n <= 90;
}
function validLon(n: number): boolean {
  return isFinite(n) && n >= -180 && n <= 180;
}

/** Stable 0..1 hash so a route's flow phase is consistent across rebuilds. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function inc(map: Map<string, number>, key: string, by: number): void {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + by);
}

function topEntries(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/* ---------- per-bucket accumulator ---------- */

interface Agg {
  lat: number;
  lon: number;
  label: string;
  count: number;
  rows: number;
  byType: Map<string, number>;
  byTarget: Map<string, number>;
  bySev: Map<SeverityKey, number>;
}

function newAgg(lat: number, lon: number): Agg {
  return {
    lat,
    lon,
    label: "",
    count: 0,
    rows: 0,
    byType: new Map(),
    byTarget: new Map(),
    bySev: new Map(),
  };
}

function feed(a: Agg, sev: SeverityKey, w: number, type: string, target: string, label: string): void {
  a.count += w;
  a.rows += 1;
  if (type) inc(a.byType, type, w);
  if (target) inc(a.byTarget, target, w);
  a.bySev.set(sev, (a.bySev.get(sev) ?? 0) + w);
  if (!a.label && label) a.label = label;
}

const RANK_TO_SEV: Record<number, SeverityKey> = {
  4: "critical",
  3: "high",
  2: "medium",
  1: "low",
};

/**
 * A route's *representative* severity = the volume-weighted mean severity rank,
 * rounded to the nearest bucket. This characterizes the overall threat profile
 * (so a mostly-medium route reads cooler than a mostly-critical one) while the
 * tooltip still shows the full per-severity breakdown. Returns `unknown` when
 * no severity data is present.
 */
function representativeSeverity(bySev: Map<SeverityKey, number>): {
  sev: SeverityKey;
  rank: number;
} {
  let knownW = 0;
  let sumRank = 0;
  for (const [k, v] of bySev) {
    if (k === "unknown") continue;
    knownW += v;
    sumRank += SEVERITY_RANK[k] * v;
  }
  if (knownW <= 0) return { sev: "unknown", rank: 0 };
  const rank = Math.max(1, Math.min(4, Math.round(sumRank / knownW)));
  return { sev: RANK_TO_SEV[rank], rank };
}

/* ---------- tooltip fragments ---------- */

function severityRows(bySev: Map<SeverityKey, number>): string {
  const rows = SEVERITY_ORDER.filter((k) => (bySev.get(k) ?? 0) > 0).map(
    (k) =>
      `<div class="tam-tt-row"><span class="tam-dot ${k}"></span>${SEVERITY_LABEL[k]}<b>${formatInt(
        bySev.get(k)!,
      )}</b></div>`,
  );
  return rows.join("");
}

function listRows(entries: [string, number][]): string {
  return entries
    .map(
      ([name, v]) =>
        `<div class="tam-tt-row"><span>${escapeHtml(name)}</span><b>${formatInt(v)}</b></div>`,
    )
    .join("");
}

/* ---------- main build ---------- */

export function buildModel(input: BuildInput): ThreatModel {
  const {
    srcLat,
    srcLon,
    dstLat,
    dstLon,
    srcLabel,
    dstLabel,
    severity,
    weight,
    attackType,
    target,
    defaultDest,
    maxArcs,
  } = input;

  const n = Math.max(
    srcLat?.length ?? 0,
    srcLon?.length ?? 0,
    dstLat?.length ?? 0,
    dstLon?.length ?? 0,
  );

  const arcAgg = new Map<string, Agg & { dLat: number; dLon: number; dLabel: string }>();
  const originAgg = new Map<string, Agg>();
  const destAgg = new Map<string, Agg & { originKeys: Set<string> }>();

  let totalRows = 0;
  let unmapped = 0;

  for (let i = 0; i < n; i++) {
    const sLat = num(srcLat?.[i]);
    const sLon = num(srcLon?.[i]);
    if (!validLat(sLat) || !validLon(sLon)) {
      unmapped++;
      continue;
    }
    let dLat = num(dstLat?.[i]);
    let dLon = num(dstLon?.[i]);
    if (!validLat(dLat) || !validLon(dLon)) {
      dLat = defaultDest.lat;
      dLon = defaultDest.lon;
    }
    totalRows++;

    const w = (() => {
      const x = num(weight?.[i]);
      return isFinite(x) && x > 0 ? x : 1;
    })();
    const sev = severity ? normalizeSeverity(severity[i]) : "unknown";
    const sLabel = str(srcLabel?.[i]);
    const dLabel = str(dstLabel?.[i]) || defaultDest.label;
    const aType = str(attackType?.[i]);
    const aTarget = str(target?.[i]);

    const sKey = `${round2(sLat)},${round2(sLon)}`;
    const dKey = `${round2(dLat)},${round2(dLon)}`;
    const arcKey = `${sKey}>${dKey}`;

    let arc = arcAgg.get(arcKey);
    if (!arc) {
      arc = Object.assign(newAgg(sLat, sLon), { dLat, dLon, dLabel });
      arcAgg.set(arcKey, arc);
    }
    feed(arc, sev, w, aType, aTarget, sLabel);
    if (!arc.dLabel && dLabel) arc.dLabel = dLabel;

    let origin = originAgg.get(sKey);
    if (!origin) {
      origin = newAgg(sLat, sLon);
      originAgg.set(sKey, origin);
    }
    feed(origin, sev, w, aType, aTarget, sLabel);

    let dest = destAgg.get(dKey);
    if (!dest) {
      dest = Object.assign(newAgg(dLat, dLon), { originKeys: new Set<string>() });
      destAgg.set(dKey, dest);
    }
    feed(dest, sev, w, aType, aTarget, dLabel);
    dest.originKeys.add(sKey);
  }

  // ----- arcs (sorted by volume, capped) -----
  const allArcs = [...arcAgg.entries()].sort((a, b) => b[1].count - a[1].count);
  const cappedArcs = Math.max(0, allArcs.length - maxArcs);
  const arcs: Arc[] = allArcs.slice(0, maxArcs).map(([key, a]) => {
    const srcLabelF = a.label || "Unknown origin";
    const dstLabelF = a.dLabel || defaultDest.label;
    const rep = representativeSeverity(a.bySev);
    const tooltipHtml =
      `<div class="tam-tt-title"><span class="tam-dot ${rep.sev}"></span>${escapeHtml(
        srcLabelF,
      )} <span class="tam-arrow">→</span> ${escapeHtml(dstLabelF)}</div>` +
      `<div class="tam-tt-sub">${formatInt(a.count)} attacks · ${formatInt(a.rows)} events</div>` +
      severityRows(a.bySev) +
      (a.byType.size
        ? `<div class="tam-tt-sec">Top attack types</div>${listRows(topEntries(a.byType, 3))}`
        : "") +
      (a.byTarget.size
        ? `<div class="tam-tt-sec">Top targets</div>${listRows(topEntries(a.byTarget, 2))}`
        : "");
    return {
      id: key,
      srcLat: a.lat,
      srcLon: a.lon,
      dstLat: a.dLat,
      dstLon: a.dLon,
      srcLabel: srcLabelF,
      dstLabel: dstLabelF,
      severity: rep.sev,
      severityRank: rep.rank,
      count: a.count,
      rows: a.rows,
      phase: hash01(key),
      tooltipHtml,
    };
  });

  // ----- origins -----
  const origins: OriginPoint[] = [...originAgg.entries()].map(([key, a]) => {
    const labelF = a.label || "Unknown origin";
    const rep = representativeSeverity(a.bySev);
    const tooltipHtml =
      `<div class="tam-tt-title"><span class="tam-dot ${rep.sev}"></span>${escapeHtml(labelF)}</div>` +
      `<div class="tam-tt-sub">Origin · ${formatInt(a.count)} attacks · ${formatInt(a.rows)} events</div>` +
      severityRows(a.bySev) +
      (a.byType.size
        ? `<div class="tam-tt-sec">Top attack types</div>${listRows(topEntries(a.byType, 3))}`
        : "") +
      (a.byTarget.size
        ? `<div class="tam-tt-sec">Top targets</div>${listRows(topEntries(a.byTarget, 2))}`
        : "");
    return {
      id: key,
      lat: a.lat,
      lon: a.lon,
      label: labelF,
      count: a.count,
      rows: a.rows,
      severity: rep.sev,
      severityRank: rep.rank,
      phase: hash01(key),
      tooltipHtml,
    };
  });

  // ----- destinations -----
  const dests: DestPoint[] = [...destAgg.entries()].map(([key, a]) => {
    const labelF = a.label || "Target";
    const originCount = a.originKeys.size;
    const tooltipHtml =
      `<div class="tam-tt-title"><span class="tam-dot target"></span>${escapeHtml(labelF)}</div>` +
      `<div class="tam-tt-sub">Target · ${formatInt(a.count)} inbound attacks</div>` +
      `<div class="tam-tt-row"><span>Origin locations</span><b>${formatInt(originCount)}</b></div>` +
      severityRows(a.bySev) +
      (a.byTarget.size
        ? `<div class="tam-tt-sec">Top targets</div>${listRows(topEntries(a.byTarget, 3))}`
        : "");
    return {
      id: key,
      lat: a.lat,
      lon: a.lon,
      label: labelF,
      count: a.count,
      rows: a.rows,
      origins: originCount,
      tooltipHtml,
    };
  });

  return { arcs, origins, dests, totalRows, unmapped, cappedArcs };
}
