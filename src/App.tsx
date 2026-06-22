import { useCallback, useEffect, useMemo } from "react";
import { useConfig, useElementColumns, useElementData, client } from "@sigmacomputing/plugin";
import GlobeView from "./components/GlobeView";
import Legend from "./components/Legend";
import EmptyState from "./components/EmptyState";
import { countryFeatures, countryLabels } from "./lib/geo";
import { countryName, resolveCountryCode } from "./lib/countries";
import { buildColorScale, type BucketMethod } from "./lib/color";
import { formatFull } from "./lib/format";
import { DEMO_METRIC_NAME, demoValueByCcn3 } from "./lib/demoData";

/** Column configs may come back as a single id or an array of ids. */
function firstId(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * True when the page is opened directly in a browser rather than embedded in
 * Sigma's iframe (or when ?demo is present). Used to show sample data so the
 * globe is visible without configuring Sigma.
 */
function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("demo")) return true;
    return window.self === window.top;
  } catch {
    return false;
  }
}

export default function App() {
  const config = useConfig() ?? {};
  const sourceId = typeof config.source === "string" ? config.source : undefined;
  const data = useElementData(sourceId ?? "");
  const columns = useElementColumns(sourceId ?? "");

  const standalone = useMemo(detectStandalone, []);

  // Let Sigma know the plugin has finished its initial load.
  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const countryColId = firstId(config.country);
  const metricColId = firstId(config.metric);

  // In standalone preview, allow quick style overrides via URL, e.g.
  // ?demo=1&dark=1&labels=1&rotate=0&palette=Greens&buckets=6
  const preview = useMemo(() => {
    if (!standalone || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, [standalone]);

  // Style / scale options (with sensible defaults to match the editor panel).
  const darkMode = preview ? preview.get("dark") === "1" : config.darkMode === true;
  const showLabels = preview ? preview.get("labels") === "1" : config.showLabels === true;
  const autoRotate = preview ? preview.get("rotate") !== "0" : config.autoRotate !== false;
  const showLegend = preview ? preview.get("legend") !== "0" : config.showLegend !== false;
  const palette =
    (preview && preview.get("palette")) ||
    (typeof config.palette === "string" ? config.palette : "Blues");
  const buckets = parseInt(
    (preview && preview.get("buckets")) ||
      (typeof config.buckets === "string" ? config.buckets : "5"),
    10,
  );
  const bucketMethod: BucketMethod =
    (preview ? preview.get("method") : config.bucketMethod) === "Equal interval"
      ? "Equal interval"
      : "Quantile";
  const noDataColor =
    (preview && preview.get("nodata")) ||
    (typeof config.noDataColor === "string" && config.noDataColor) ||
    (darkMode ? "#243245" : "#e3e8ef");

  const metricName = (metricColId && columns?.[metricColId]?.name) || "Value";

  // Aggregate the chosen metric per matched country (summing duplicate rows).
  const { valueByCcn3, matched, unmatched } = useMemo(() => {
    const result: Record<string, number> = {};
    let matched = 0;
    let unmatched = 0;
    const countryVals: unknown[] = (countryColId && data?.[countryColId]) || [];
    const metricVals: unknown[] = (metricColId && data?.[metricColId]) || [];
    const n = Math.min(countryVals.length, metricVals.length);
    for (let i = 0; i < n; i++) {
      const ccn3 = resolveCountryCode(countryVals[i]);
      if (!ccn3) {
        if (countryVals[i] != null && String(countryVals[i]).trim() !== "") unmatched++;
        continue;
      }
      const value = Number(metricVals[i]);
      if (!isFinite(value)) continue;
      result[ccn3] = (result[ccn3] ?? 0) + value;
      matched++;
    }
    return { valueByCcn3: result, matched, unmatched };
  }, [data, countryColId, metricColId]);

  // In standalone preview, fall back to the bundled sample data.
  const activeValues = standalone ? demoValueByCcn3 : valueByCcn3;
  const activeMetricName = standalone ? DEMO_METRIC_NAME : metricName;

  const scale = useMemo(
    () => buildColorScale(Object.values(activeValues), palette, buckets, bucketMethod),
    [activeValues, palette, buckets, bucketMethod],
  );

  const getColor = useCallback(
    (ccn3: string): string => {
      const value = activeValues[ccn3];
      return value === undefined ? noDataColor : scale.colorFor(value);
    },
    [activeValues, scale, noDataColor],
  );

  const getTooltip = useCallback(
    (ccn3: string, fallbackName?: string): string => {
      const name = countryName(ccn3) ?? fallbackName ?? "Unknown";
      const has = ccn3 in activeValues;
      const valueStr = has ? formatFull(activeValues[ccn3]) : "No data";
      return `<div class="globe-tooltip ${darkMode ? "dark" : "light"}">
        <div class="tt-name">${escapeHtml(name)}</div>
        <div class="tt-metric">${escapeHtml(activeMetricName)}: <b>${escapeHtml(valueStr)}</b></div>
      </div>`;
    },
    [activeValues, activeMetricName, darkMode],
  );

  const configured = standalone || (!!sourceId && !!countryColId && !!metricColId);

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      {!configured ? (
        <EmptyState
          hasSource={!!sourceId}
          hasCountry={!!countryColId}
          hasMetric={!!metricColId}
        />
      ) : (
        <>
          <GlobeView
            features={countryFeatures}
            labels={countryLabels}
            showLabels={showLabels}
            autoRotate={autoRotate}
            darkMode={darkMode}
            getColor={getColor}
            getTooltip={getTooltip}
          />
          {showLegend && scale.hasData && (
            <Legend
              title={activeMetricName}
              entries={scale.legend}
              showNoData
              noDataColor={noDataColor}
            />
          )}
          {standalone ? (
            <div className="notice subtle">
              Demo data — embed in Sigma and assign a Country + metric for live data.
            </div>
          ) : matched === 0 ? (
            <div className="notice">
              No rows matched a country. Make sure the Country column holds
              country names or ISO codes.
            </div>
          ) : (
            unmatched > 0 && (
              <div className="notice subtle">
                {unmatched} row{unmatched === 1 ? "" : "s"} didn’t match a country.
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
