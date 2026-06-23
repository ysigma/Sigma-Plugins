import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useConfig, useElementColumns, useElementData, client } from "@sigmacomputing/plugin";
import GlobeView from "./components/GlobeView";
import Legend, { type LegendVariant } from "./components/Legend";
import EmptyState from "./components/EmptyState";
import { countryFeatures, countryLabels } from "./lib/geo";
import { countryName, resolveCountryCode } from "./lib/countries";
import {
  buildCategoryScale,
  buildMeasureBuckets,
  buildMeasureContinuous,
  parseHexColors,
  type BucketMethod,
  type LegendStyle,
} from "./lib/color";
import { formatFull } from "./lib/format";
import {
  DEMO_METRIC_NAME,
  DEMO_TIER_NAME,
  DEMO_TIER_ORDER,
  demoTierByCcn3,
  demoValueByCcn3,
} from "./lib/demoData";

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

function withHash(c: string): string {
  return c && !c.startsWith("#") ? `#${c}` : c;
}

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

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const countryColId = firstId(config.country);
  const metricColId = firstId(config.metric);
  const tierColId = firstId(config.tier);

  const colorBy: "Measure" | "Tier column" = preview
    ? preview.get("tier") === "1" || preview.get("colorby") === "tier"
      ? "Tier column"
      : "Measure"
    : config.colorBy === "Tier column"
      ? "Tier column"
      : "Measure";
  const tierMode = colorBy === "Tier column";

  const legendStyle: LegendStyle =
    (preview ? preview.get("lstyle") : config.legendStyle) === "Color scale"
      ? "Color scale"
      : "Categorical";
  const useGradient = legendStyle === "Color scale";

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

  // Customizable plugin background + border.
  const customBg =
    (preview && preview.get("bg")) ||
    (typeof config.backgroundColor === "string" && config.backgroundColor) ||
    "";
  const background = customBg ? withHash(customBg) : darkMode ? "#0b1320" : "#ffffff";
  const borderWidth =
    parseInt(
      (preview && preview.get("bw")) ||
        (typeof config.borderWidth === "string" ? config.borderWidth : "0"),
      10,
    ) || 0;
  const borderColorRaw =
    (preview && preview.get("border")) ||
    (typeof config.borderColor === "string" && config.borderColor) ||
    "";
  const borderColor = borderColorRaw
    ? withHash(borderColorRaw)
    : darkMode
      ? "#22344b"
      : "#d0d7e2";
  const appStyle: CSSProperties = {
    background,
    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
  };

  // Custom palette: 5 native color slots (or ?colors= in preview).
  const customColors = useMemo(() => {
    if (preview) return parseHexColors(preview.get("colors"));
    return parseHexColors(
      [config.color1, config.color2, config.color3, config.color4, config.color5]
        .filter((c) => typeof c === "string" && c)
        .join(","),
    );
  }, [preview, config.color1, config.color2, config.color3, config.color4, config.color5]);
  const customKey = customColors.join(",");
  const tierOrder = useMemo(() => parseList(config.tierOrder), [config.tierOrder]);

  const metricName = (metricColId && columns?.[metricColId]?.name) || "Value";
  const tierName = (tierColId && columns?.[tierColId]?.name) || "Tier";

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

  // Demo data when running standalone.
  const activeValues = standalone ? demoValueByCcn3 : valueByCcn3;
  const activeTiers = standalone ? (tierMode ? demoTierByCcn3 : {}) : tierByCcn3;
  const activeMetricName = standalone ? DEMO_METRIC_NAME : metricName;
  const activeTierName = standalone ? DEMO_TIER_NAME : tierName;
  const activeTierOrder = standalone ? DEMO_TIER_ORDER : tierOrder;

  const categories = useMemo(
    () => orderedCategories(Object.values(activeTiers), activeTierOrder),
    [activeTiers, activeTierOrder],
  );
  const categoryScale = useMemo(
    () => buildCategoryScale(categories, palette, customColors, legendStyle),
    [categories, palette, customKey, legendStyle],
  );
  const bucketScale = useMemo(
    () => buildMeasureBuckets(Object.values(activeValues), palette, buckets, bucketMethod, customColors),
    [activeValues, palette, buckets, bucketMethod, customKey],
  );
  const contScale = useMemo(
    () => buildMeasureContinuous(Object.values(activeValues), palette, customColors),
    [activeValues, palette, customKey],
  );

  // Pick the active presentation based on mode + legend style.
  let variant: LegendVariant;
  let legendEntries = bucketScale.entries;
  let continuous: { gradientCss: string; ticks: { pos: number; label: string }[] } | undefined;
  let hasColorData: boolean;
  let legendTitle: string;
  let clickable: boolean;
  let keyForCountry: (ccn3: string) => string | null;
  let baseColorFor: (ccn3: string) => string;

  if (tierMode) {
    variant = useGradient ? "gradient-discrete" : "segments";
    legendEntries = categoryScale.entries;
    hasColorData = categoryScale.hasData;
    legendTitle = activeTierName;
    clickable = true;
    keyForCountry = (ccn3) => activeTiers[ccn3] ?? null;
    baseColorFor = (ccn3) => {
      const t = activeTiers[ccn3];
      return t !== undefined ? categoryScale.colorByKey.get(t) ?? noDataColor : noDataColor;
    };
  } else if (useGradient) {
    variant = "gradient-continuous";
    continuous = { gradientCss: contScale.gradientCss, ticks: contScale.ticks };
    hasColorData = contScale.hasData;
    legendTitle = activeMetricName;
    clickable = false;
    keyForCountry = () => null;
    baseColorFor = (ccn3) => {
      const v = activeValues[ccn3];
      return v === undefined ? noDataColor : contScale.colorForValue(v);
    };
  } else {
    variant = "segments";
    legendEntries = bucketScale.entries;
    hasColorData = bucketScale.hasData;
    legendTitle = activeMetricName;
    clickable = true;
    keyForCountry = (ccn3) => {
      const v = activeValues[ccn3];
      return v === undefined ? null : bucketScale.keyForValue(v);
    };
    baseColorFor = (ccn3) => {
      const v = activeValues[ccn3];
      if (v === undefined) return noDataColor;
      const k = bucketScale.keyForValue(v);
      return k !== null ? bucketScale.colorByKey.get(k) ?? noDataColor : noDataColor;
    };
  }

  // Click-to-filter selection (ignored if it no longer matches the current legend).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const legendKeys = useMemo(() => new Set(legendEntries.map((e) => e.key)), [legendEntries]);
  const effectiveSelected =
    clickable && selectedKey && legendKeys.has(selectedKey) ? selectedKey : null;
  const onSelect = (key: string) => setSelectedKey((prev) => (prev === key ? null : key));

  const getColor = (ccn3: string): string => {
    if (effectiveSelected && keyForCountry(ccn3) !== effectiveSelected) return noDataColor;
    return baseColorFor(ccn3);
  };

  const hasMetric = !!metricColId || standalone;
  const getTooltip = (ccn3: string, fallbackName?: string): string => {
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
  };

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
    <div className={`app ${darkMode ? "dark" : "light"}`} style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : (
        <>
          <div className="globe-wrap">
            <GlobeView
              features={countryFeatures}
              labels={countryLabels}
              showLabels={showLabels}
              autoRotate={autoRotate}
              darkMode={darkMode}
              background={background}
              getColor={getColor}
              getTooltip={getTooltip}
            />
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
          </div>
          {showLegend && hasColorData && (
            <Legend
              title={legendTitle}
              variant={variant}
              entries={legendEntries}
              continuous={continuous}
              selectedKey={effectiveSelected}
              onSelect={clickable ? onSelect : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
