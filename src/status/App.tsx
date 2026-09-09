import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  useConfig,
  useActionTrigger,
  client,
  type WorkbookElementData,
} from "@sigmacomputing/plugin";
import EmptyState from "./components/EmptyState";
import StatusRow, { type Cell } from "./components/StatusRow";
import TimeAxis from "./components/TimeAxis";
import Legend from "./components/Legend";
import {
  bucketMsForLabel,
  buildBucketRange,
  formatFull,
  toEpochMs,
  truncateToBucket,
} from "./lib/time";
import {
  aggregate,
  colorFor,
  makeClassifier,
  parseAggregation,
  parseTokenList,
  STATUS_LABEL,
  type Palette,
  type Reading,
  type Status,
} from "./lib/status";
import { buildDemoData, DEMO_DEGRADED_VALUES, DEMO_TITLE } from "./lib/demoData";

function firstId(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function withHash(c: string): string {
  if (!c) return c;
  return c.startsWith("#") || c.startsWith("rgb") ? c : `#${c}`;
}

const URL_RE = /(https?:\/\/[^\s]+)/;
function extractUrl(label: string): string | null {
  const m = label.match(URL_RE);
  return m ? m[1] : null;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("demo")) return true;
    return window.self === window.top;
  } catch {
    return false;
  }
}

interface AppRow {
  label: string;
  href: string | null;
  cells: Cell[];
}

export default function App() {
  const config = useConfig() ?? {};
  const sourceId = typeof config.source === "string" ? config.source : undefined;

  const standalone = useMemo(detectStandalone, []);

  // Auto-refresh. A plugin can't query the warehouse itself; it only re-renders
  // when the Sigma host pushes data. So on each interval we ask the host to
  // re-provide the data two ways: (1) fire an optional "Refresh element" workbook
  // action (forces the source element to re-query — the same path Sigma's native
  // refresh uses), and (2) re-subscribe to the element data (pulls the host's
  // current snapshot). Off by default. See the README "Auto-refresh" section.
  const autoRefreshRaw =
    typeof config.autoRefreshSeconds === "string" ? config.autoRefreshSeconds : "Off";
  const autoRefreshSec = autoRefreshRaw === "Off" ? 0 : parseInt(autoRefreshRaw, 10) || 0;
  const intervalMs = autoRefreshSec > 0 ? autoRefreshSec * 1000 : 0;

  const fireRefresh = useActionTrigger("refreshAction");
  const fireRefreshRef = useRef(fireRefresh);
  fireRefreshRef.current = fireRefresh;

  const [data, setData] = useState<WorkbookElementData>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Subscribe to the source element's data; re-subscribes when refreshTick bumps.
  // Old data stays on screen until the new snapshot arrives (no flash).
  useEffect(() => {
    if (standalone || !sourceId) {
      setData({});
      return;
    }
    return client.elements.subscribeToElementData(sourceId, (d) => {
      setData(d);
      setLastUpdated(Date.now());
    });
  }, [standalone, sourceId, refreshTick]);

  // Drive the refresh on the configured interval.
  useEffect(() => {
    if (standalone || !sourceId || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      fireRefreshRef.current();
      setRefreshTick((t) => t + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [standalone, sourceId, intervalMs]);

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const applicationId = firstId(config.application);
  const timestampId = firstId(config.timestamp);
  const statusId = firstId(config.status);

  // Appearance — dark defaults that match a typical status board.
  const background = withHash(
    (typeof config.backgroundColor === "string" && config.backgroundColor) || "#0e1116",
  );
  const textColor = withHash(
    (typeof config.textColor === "string" && config.textColor) || "#e6eaf0",
  );
  const palette = useMemo<Palette>(
    () => ({
      up: withHash((typeof config.upColor === "string" && config.upColor) || "#3ecf6b"),
      degraded: withHash(
        (typeof config.degradedColor === "string" && config.degradedColor) || "#f5a623",
      ),
      down: withHash((typeof config.downColor === "string" && config.downColor) || "#e5484d"),
      nodata: withHash(
        (typeof config.noDataColor === "string" && config.noDataColor) || "#1b2128",
      ),
    }),
    [config.upColor, config.degradedColor, config.downColor, config.noDataColor],
  );

  const labelWidth =
    parseInt(typeof config.labelWidth === "string" ? config.labelWidth : "320", 10) || 320;
  const rowHeight =
    parseInt(typeof config.rowHeight === "string" ? config.rowHeight : "18", 10) || 18;
  const linkify = config.linkifyUrls !== false;
  const showLegend = config.showLegend === true;

  const bucketMs = bucketMsForLabel(
    typeof config.bucketSize === "string" ? config.bucketSize : undefined,
  );
  const aggregation = parseAggregation(
    typeof config.aggregation === "string" ? config.aggregation : undefined,
  );

  const downValues = useMemo(
    () => parseTokenList(typeof config.downValues === "string" ? config.downValues : ""),
    [config.downValues],
  );
  const degradedValues = useMemo(() => {
    const user = parseTokenList(
      typeof config.degradedValues === "string" ? config.degradedValues : "",
    );
    return standalone ? [...user, ...parseTokenList(DEMO_DEGRADED_VALUES)] : user;
  }, [config.degradedValues, standalone]);

  const classifier = useMemo(
    () => makeClassifier(downValues, degradedValues),
    [downValues, degradedValues],
  );

  const titleText = typeof config.title === "string" ? config.title.trim() : "";
  const displayTitle = titleText || (standalone ? DEMO_TITLE : "");

  const { rows, buckets, truncated, invalidTs, hasDegraded, hasData } = useMemo(() => {
    const demo = standalone ? buildDemoData() : null;
    const appVals: unknown[] = demo ? demo.application : (applicationId && data?.[applicationId]) || [];
    const tsVals: unknown[] = demo ? demo.timestamp : (timestampId && data?.[timestampId]) || [];
    const stVals: unknown[] = demo ? demo.status : (statusId && data?.[statusId]) || [];

    const order: string[] = [];
    const byApp = new Map<string, Map<number, Reading[]>>();
    let minMs = Infinity;
    let maxMs = -Infinity;
    let invalid = 0;

    const n = Math.max(appVals.length, tsVals.length, stVals.length);
    for (let i = 0; i < n; i++) {
      const label = appVals[i] != null ? String(appVals[i]) : "";
      if (label === "") continue;
      const ms = toEpochMs(tsVals[i]);
      if (ms == null) {
        invalid++;
        continue;
      }
      const bStart = truncateToBucket(ms, bucketMs);
      if (ms < minMs) minMs = ms;
      if (ms > maxMs) maxMs = ms;

      let appBuckets = byApp.get(label);
      if (!appBuckets) {
        appBuckets = new Map();
        byApp.set(label, appBuckets);
        order.push(label);
      }
      const arr = appBuckets.get(bStart);
      if (arr) arr.push({ ms, raw: stVals[i] });
      else appBuckets.set(bStart, [{ ms, raw: stVals[i] }]);
    }

    if (!isFinite(minMs) || !isFinite(maxMs)) {
      return {
        rows: [] as AppRow[],
        buckets: [] as number[],
        truncated: false,
        invalidTs: invalid,
        hasDegraded: false,
        hasData: false,
      };
    }

    const { buckets: bucketStarts, truncated: wasTruncated } = buildBucketRange(
      minMs,
      maxMs,
      bucketMs,
    );

    let anyDegraded = false;
    const builtRows: AppRow[] = order.map((label) => {
      const perBucket = byApp.get(label)!;
      const cells: Cell[] = bucketStarts.map((bStart, idx) => {
        const readings = perBucket.get(bStart) ?? [];
        const status = aggregate(readings, aggregation, classifier);
        if (status === "degraded") anyDegraded = true;
        const count = readings.length;
        const title = `${label}\n${formatFull(bStart)} — ${STATUS_LABEL[status]}${
          count ? ` (${count} reading${count === 1 ? "" : "s"})` : ""
        }`;
        return { key: idx, color: colorFor(status, palette), status, title };
      });
      return { label, href: linkify ? extractUrl(label) : null, cells };
    });

    return {
      rows: builtRows,
      buckets: bucketStarts,
      truncated: wasTruncated,
      invalidTs: invalid,
      hasDegraded: anyDegraded,
      hasData: true,
    };
  }, [
    standalone,
    data,
    applicationId,
    timestampId,
    statusId,
    bucketMs,
    aggregation,
    classifier,
    palette,
    linkify,
  ]);

  const appStyle: CSSProperties = {
    background,
    color: textColor,
    ["--sst-bg" as string]: background,
    ["--sst-text" as string]: textColor,
    ["--sst-label-w" as string]: `${labelWidth}px`,
    ["--sst-row-h" as string]: `${rowHeight}px`,
  };

  const configured =
    standalone || (!!sourceId && !!applicationId && !!timestampId && !!statusId);

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign an Application / URL column", done: !!applicationId },
    { label: "Assign a Timestamp column", done: !!timestampId },
    { label: "Assign a Status measure", done: !!statusId },
  ];

  const legendStates: Status[] = hasDegraded ? ["up", "degraded", "down"] : ["up", "down"];

  const showRefreshBadge = !standalone && intervalMs > 0;
  const lastUpdatedStr =
    lastUpdated != null
      ? new Date(lastUpdated).toLocaleTimeString(undefined, { hour12: false })
      : null;

  return (
    <div className="sst-app" style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : (
        <>
          {(displayTitle || showLegend || showRefreshBadge) && (
            <div className="sst-header">
              <div className="sst-title">{displayTitle}</div>
              <div className="sst-header-right">
                {showRefreshBadge && (
                  <span
                    className="sst-refresh"
                    title={`Auto-refreshing every ${autoRefreshSec}s`}
                  >
                    ⟳ {lastUpdatedStr ?? "…"}
                  </span>
                )}
                {showLegend && <Legend palette={palette} states={legendStates} />}
              </div>
            </div>
          )}
          {!hasData || rows.length === 0 ? (
            <div className="sst-empty-rows">
              {invalidTs > 0
                ? "No readings with a valid timestamp. Check the Timestamp column."
                : "No rows to display."}
            </div>
          ) : (
            <>
              <div className="sst-grid">
                {rows.map((r, i) => (
                  <StatusRow key={`${r.label}-${i}`} label={r.label} href={r.href} cells={r.cells} />
                ))}
                <div className="sst-row sst-axis-row">
                  <div className="sst-label" />
                  <TimeAxis buckets={buckets} bucketMs={bucketMs} />
                </div>
              </div>
              {(standalone || truncated || invalidTs > 0) && (
                <div className="sst-notice">
                  {standalone
                    ? "Demo data — embed in Sigma for live data."
                    : truncated
                      ? `Showing the most recent ${buckets.length} time buckets — increase “Time per square” to see the full range.`
                      : `${invalidTs} reading${invalidTs === 1 ? "" : "s"} had no valid timestamp.`}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
