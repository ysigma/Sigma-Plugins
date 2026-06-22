import { useCallback, useEffect, useMemo } from "react";
import { useConfig, useElementColumns, useElementData, client } from "@sigmacomputing/plugin";
import GlobeView from "./components/GlobeView";
import Legend from "./components/Legend";
import EmptyState from "./components/EmptyState";
import { countryFeatures, countryLabels } from "./lib/geo";
import { countryName, resolveCountryCode } from "./lib/countries";
import { buildCategoryScale, buildColorScale, parseHexColors, type BucketMethod } from "./lib/color";
import { formatFull } from "./lib/format";
import {
  DEMO_METRIC_NAME,
  DEMO_TIER_NAME,
  DEMO_TIER_ORDER,
  demoTierByCcn3,
  demoValueByCcn3,
} from "./lib/demoData";

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

/** Comma-separated list -> trimmed non-empty strings. */
function parseList(input: string | undefined | null): string[] {
  if (!input) return [];
  return input
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ordered distinct categories: preferred order first, then any extras seen in data. */
function orderedCategories(values: string[], preferred: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of preferred) {
    if (!seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  }
  for (const v of values) {
    if (v && !seen.has(v)) {
      seen.add(v);
      result.push(v);
    }
  }
  return result;
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

export default function App() {
  const config = useConfig() ?? {};
  const sourceId = typeof config.source === "string" ? config.source : undefined;
  const data = useElementData(sourceId ?? "");
  const columns = useElementColumns(sourceId ?? "");

  const standalone = useMemo(detectStandalone, []);
  const preview = useMemo(() => {
    if (!standalone || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, [standalone]);

  // Let Sigma know the plugin has finished its initial load.
  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const countryColId = firstId(config.country);
  const metricColId = firstId(config.metric);
  const tierColId = firstId(config.tier);

  // Color mode (preview: ?tier=1 or ?colorby=tier forces tier mode).
  const colorBy: "Measure" | "Tier column" = preview
    ? preview.get("tier") === "1" || preview.get("colorby") === "tier"
      ? "Tier column"
      : "Measure"
    : config.colorBy === "Tier column"
      ? "Tier column"
      : "Measure";
  const tierMode = colorBy === "Tier column";

  // Style / scale options (preview allows quick overrides via URL).
  const darkMode = preview ? preview.get("dark") === "1" : config.darkMode === true;
  const showLabels = preview ? preview.get("labels") === "1" : config.showLabels === true;
  const autoRotate = preview ? preview.get("rotate") !== "0" : config.autoRotate !== false;
  const showLegend = preview ? preview.get("legend") !== "0" : config.showLegend !== false;
  const palette =
    (preview && preview.get("palette")) ||
    (typeof config.palette === "string" ? config.palette : "Blues");
  const customColorsRaw =
    (preview && preview.get("colors")) ||
    (typeof config.customColors === "string" ? config.customColors : "");
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

  const customColors = useMemo(() => parseHexColors(customColorsRaw), [customColorsRaw]);
  const tierOrder = useMemo(() => parseList(config.tierOrder), [config.tierOrder]);

  const metricName = (metricColId && columns?.[metricColId]?.name) || "Value";
  const tierName = (tierColId && columns?.[tierColId]?.name) || "Tier";

  // Build per-country measure values and tier values from the Sigma data.
  const { valueByCcn3, tierByCcn3, matched, unmatched } = useMemo(() => {
    const values: Record<string, number> = {};
    const tiers: Record<string, string> = {};
    let matched = 0;
    let unmatched = 0;
    const countryVals: unknown[] = (countryColId && data?.[countryColId]) || [];
    const metricVals: unknown[] = (metricColId && data?.[metricColId]) || [];
    const tierVals: unknown[] = (tierColId && data?.[tierColId]) || [];
    const n = countryVals.length;
    for (let i = 0; i < n; i++) {
      const ccn3 = resolveCountryCode(countryVals[i]);
      if (!ccn3) {
        if (countryVals[i] != null && String(countryVals[i]).trim() !== "") unmatched++;
        continue;
      }
      let counted = false;
      const value = Number(metricVals[i]);
      if (isFinite(value)) {
        values[ccn3] = (values[ccn3] ?? 0) + value;
        counted = true;
      }
      const tv = tierVals[i];
      if (tv != null && String(tv).trim() !== "" && !(ccn3 in tiers)) {
        tiers[ccn3] = String(tv);
        counted = true;
      }
      if (counted) matched++;
    }
    return { valueByCcn3: values, tierByCcn3: tiers, matched, unmatched };
  }, [data, countryColId, metricColId, tierColId]);

  // Resolve the active datasets (real Sigma data, or demo data when standalone).
  const activeValues = standalone ? demoValueByCcn3 : valueByCcn3;
  const activeTiers = standalone
    ? tierMode
      ? demoTierByCcn3
      : {}
    : tierByCcn3;
  const activeMetricName = standalone ? DEMO_METRIC_NAME : metricName;
  const activeTierName = standalone ? DEMO_TIER_NAME : tierName;
  const activeTierOrder = standalone ? DEMO_TIER_ORDER : tierOrder;

  const customKey = customColors.join(",");

  const measureScale = useMemo(
    () => buildColorScale(Object.values(activeValues), palette, buckets, bucketMethod, customColors),
    [activeValues, palette, buckets, bucketMethod, customKey],
  );

  const categories = useMemo(
    () => orderedCategories(Object.values(activeTiers), activeTierOrder),
    [activeTiers, activeTierOrder],
  );
  const categoryScale = useMemo(
    () => buildCategoryScale(categories, palette, customColors),
    [categories, palette, customKey],
  );

  const legendTitle = tierMode ? activeTierName : activeMetricName;
  const legendEntries = tierMode ? categoryScale.legend : measureScale.legend;
  const hasColorData = tierMode ? categoryScale.hasData : measureScale.hasData;

  const getColor = useCallback(
    (ccn3: string): string => {
      if (tierMode) {
        const t = activeTiers[ccn3];
        return t === undefined ? noDataColor : categoryScale.colorFor(t);
      }
      const value = activeValues[ccn3];
      return value === undefined ? noDataColor : measureScale.colorFor(value);
    },
    [tierMode, activeTiers, activeValues, categoryScale, measureScale, noDataColor],
  );

  const hasMetric = !!metricColId || standalone;
  const getTooltip = useCallback(
    (ccn3: string, fallbackName?: string): string => {
      const name = countryName(ccn3) ?? fallbackName ?? "Unknown";
      const lines: string[] = [];
      if (tierMode) {
        const t = activeTiers[ccn3];
        lines.push(`${escapeHtml(activeTierName)}: <b>${escapeHtml(t ?? "No data")}</b>`);
      }
      if (hasMetric) {
        const v = activeValues[ccn3];
        const valueStr = v !== undefined ? formatFull(v) : "No data";
        lines.push(`${escapeHtml(activeMetricName)}: <b>${escapeHtml(valueStr)}</b>`);
      }
      return `<div class="globe-tooltip ${darkMode ? "dark" : "light"}">
        <div class="tt-name">${escapeHtml(name)}</div>
        ${lines.map((l) => `<div class="tt-metric">${l}</div>`).join("")}
      </div>`;
    },
    [tierMode, activeTiers, activeValues, activeTierName, activeMetricName, hasMetric, darkMode],
  );

  const configured =
    standalone ||
    (!!sourceId && !!countryColId && (tierMode ? !!tierColId : !!metricColId));

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign a Country dimension (names or ISO codes)", done: !!countryColId },
    tierMode
      ? { label: "Assign a Tier column to color by", done: !!tierColId }
      : { label: "Assign a Measure to color by", done: !!metricColId },
  ];

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      {!configured ? (
        <EmptyState steps={steps} />
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
          {showLegend && hasColorData && (
            <Legend
              title={legendTitle}
              entries={legendEntries}
              showNoData
              noDataColor={noDataColor}
            />
          )}
          {standalone ? (
            <div className="notice subtle">
              Demo data{tierMode ? " (color by tier)" : ""} — embed in Sigma for live data.
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
