import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useConfig, useElementColumns, useElementData, client } from "@sigmacomputing/plugin";
import GlobeView from "./components/GlobeView";
import Legend from "./components/Legend";
import EmptyState from "./components/EmptyState";
import { countryFeatures, countryLabels } from "./lib/geo";
import { countryName, resolveCountryCode } from "./lib/countries";
import { buildCategoryScale, normalizeTier, parseHexColors } from "./lib/color";
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

/** Ordered tier labels: the typed order first, then any extras seen in data. */
function orderedCategories(tierValues: unknown[], preferred: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of preferred) {
    const k = normalizeTier(p);
    if (p && !seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  for (const v of tierValues) {
    if (v == null || String(v).trim() === "") continue;
    const k = normalizeTier(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(String(v));
    }
  }
  return out;
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
  const tierColId = firstId(config.tier);
  const metricColId = firstId(config.metric);

  const darkMode = preview ? preview.get("dark") === "1" : config.darkMode === true;
  const showLabels = preview ? preview.get("labels") === "1" : config.showLabels === true;
  const autoRotate = preview ? preview.get("rotate") !== "0" : config.autoRotate !== false;
  const showLegend = preview ? preview.get("legend") !== "0" : config.showLegend !== false;
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

  // Color slots mapped POSITIONALLY to the tier order (empty -> default).
  const slotColors = useMemo<(string | null)[]>(() => {
    if (preview) return parseHexColors(preview.get("colors"));
    return [config.color1, config.color2, config.color3, config.color4, config.color5].map(
      (c) => parseHexColors(typeof c === "string" ? c : "")[0] ?? null,
    );
  }, [preview, config.color1, config.color2, config.color3, config.color4, config.color5]);
  const colorKey = slotColors.join("|");

  const tierOrder = useMemo(() => parseList(config.tierOrder), [config.tierOrder]);

  const tierName = (tierColId && columns?.[tierColId]?.name) || "Tier";
  const metricName = (metricColId && columns?.[metricColId]?.name) || "Value";

  const { tierByCcn3, valueByCcn3, matched, unmatched } = useMemo(() => {
    const tiers: Record<string, string> = {};
    const values: Record<string, number> = {};
    let matched = 0;
    let unmatched = 0;
    const countryVals: unknown[] = (countryColId && data?.[countryColId]) || [];
    const tierVals: unknown[] = (tierColId && data?.[tierColId]) || [];
    const metricVals: unknown[] = (metricColId && data?.[metricColId]) || [];
    const n = countryVals.length;
    for (let i = 0; i < n; i++) {
      const ccn3 = resolveCountryCode(countryVals[i]);
      if (!ccn3) {
        if (countryVals[i] != null && String(countryVals[i]).trim() !== "") unmatched++;
        continue;
      }
      let counted = false;
      const tv = tierVals[i];
      if (tv != null && String(tv).trim() !== "" && !(ccn3 in tiers)) {
        tiers[ccn3] = String(tv);
        counted = true;
      }
      const value = Number(metricVals[i]);
      if (isFinite(value)) {
        values[ccn3] = (values[ccn3] ?? 0) + value;
        counted = true;
      }
      if (counted) matched++;
    }
    return { tierByCcn3: tiers, valueByCcn3: values, matched, unmatched };
  }, [data, countryColId, tierColId, metricColId]);

  // Demo data when running standalone.
  const activeTiers = standalone ? demoTierByCcn3 : tierByCcn3;
  const activeValues = standalone ? demoValueByCcn3 : valueByCcn3;
  const activeTierName = standalone ? DEMO_TIER_NAME : tierName;
  const activeMetricName = standalone ? DEMO_METRIC_NAME : metricName;
  const activeTierOrder = standalone ? DEMO_TIER_ORDER : tierOrder;

  const categories = useMemo(
    () => orderedCategories(Object.values(activeTiers), activeTierOrder),
    [activeTiers, activeTierOrder],
  );
  const scale = useMemo(
    () => buildCategoryScale(categories, slotColors),
    [categories, colorKey],
  );

  const keyForCountry = (ccn3: string): string | null => scale.keyForTier(activeTiers[ccn3]);
  const baseColorFor = (ccn3: string): string => {
    const k = scale.keyForTier(activeTiers[ccn3]);
    return k != null ? scale.colorForKey(k) ?? noDataColor : noDataColor;
  };

  // Click-to-filter selection (ignored if it no longer matches the legend).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const legendKeys = useMemo(() => new Set(scale.entries.map((e) => e.key)), [scale]);
  const effectiveSelected = selectedKey && legendKeys.has(selectedKey) ? selectedKey : null;
  const onSelect = (key: string) => setSelectedKey((prev) => (prev === key ? null : key));

  const getColor = (ccn3: string): string => {
    if (effectiveSelected && keyForCountry(ccn3) !== effectiveSelected) return noDataColor;
    return baseColorFor(ccn3);
  };

  const hasMetric = !!metricColId || standalone;
  const getTooltip = (ccn3: string, fallbackName?: string): string => {
    const name = countryName(ccn3) ?? fallbackName ?? "Unknown";
    const lines: string[] = [];
    const t = activeTiers[ccn3];
    lines.push(`${escapeHtml(activeTierName)}: <b>${escapeHtml(t ?? "No data")}</b>`);
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

  const configured = standalone || (!!sourceId && !!countryColId && !!tierColId);

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign a Country dimension (names or ISO codes)", done: !!countryColId },
    { label: "Assign a Tier column to color by", done: !!tierColId },
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
              <div className="notice subtle">Demo data — embed in Sigma for live data.</div>
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
          {showLegend && scale.hasData && (
            <Legend
              title={activeTierName}
              entries={scale.entries}
              selectedKey={effectiveSelected}
              onSelect={onSelect}
            />
          )}
        </>
      )}
    </div>
  );
}
