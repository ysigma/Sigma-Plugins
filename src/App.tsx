import { useCallback, useEffect, useMemo } from "react";
import { useConfig, useElementColumns, useElementData, client } from "@sigmacomputing/plugin";
import GlobeView from "./components/GlobeView";
import Legend from "./components/Legend";
import EmptyState from "./components/EmptyState";
import { countryFeatures, countryLabels } from "./lib/geo";
import { countryName, resolveCountryCode } from "./lib/countries";
import { buildColorScale, type BucketMethod } from "./lib/color";
import { formatFull } from "./lib/format";

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

export default function App() {
  const config = useConfig() ?? {};
  const sourceId = typeof config.source === "string" ? config.source : undefined;
  const data = useElementData(sourceId ?? "");
  const columns = useElementColumns(sourceId ?? "");

  // Let Sigma know the plugin has finished its initial load.
  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const countryColId = firstId(config.country);
  const metricColId = firstId(config.metric);

  // Style / scale options (with sensible defaults to match the editor panel).
  const darkMode = config.darkMode === true;
  const showLabels = config.showLabels === true;
  const autoRotate = config.autoRotate !== false;
  const showLegend = config.showLegend !== false;
  const palette = typeof config.palette === "string" ? config.palette : "Blues";
  const buckets = parseInt(typeof config.buckets === "string" ? config.buckets : "5", 10);
  const bucketMethod: BucketMethod =
    config.bucketMethod === "Equal interval" ? "Equal interval" : "Quantile";
  const noDataColor =
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

  const scale = useMemo(
    () => buildColorScale(Object.values(valueByCcn3), palette, buckets, bucketMethod),
    [valueByCcn3, palette, buckets, bucketMethod],
  );

  const getColor = useCallback(
    (ccn3: string): string => {
      const value = valueByCcn3[ccn3];
      return value === undefined ? noDataColor : scale.colorFor(value);
    },
    [valueByCcn3, scale, noDataColor],
  );

  const getTooltip = useCallback(
    (ccn3: string, fallbackName?: string): string => {
      const name = countryName(ccn3) ?? fallbackName ?? "Unknown";
      const has = ccn3 in valueByCcn3;
      const valueStr = has ? formatFull(valueByCcn3[ccn3]) : "No data";
      return `<div class="globe-tooltip ${darkMode ? "dark" : "light"}">
        <div class="tt-name">${escapeHtml(name)}</div>
        <div class="tt-metric">${escapeHtml(metricName)}: <b>${escapeHtml(valueStr)}</b></div>
      </div>`;
    },
    [valueByCcn3, metricName, darkMode],
  );

  const configured = !!sourceId && !!countryColId && !!metricColId;

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
              title={metricName}
              entries={scale.legend}
              showNoData
              noDataColor={noDataColor}
            />
          )}
          {matched === 0 ? (
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
