import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useConfig, useElementColumns, useElementData, client } from "@sigmacomputing/plugin";
import SaudiMap from "./components/SaudiMap";
import Legend from "../components/Legend";
import { provinceKey } from "./lib/provinces";
import { isHealthy, type SiteMarker } from "./lib/markers";
import { buildCategoryScale, normalizeTier, parseHexColors } from "../lib/color";
import { formatFull } from "../lib/format";
import {
  DEMO_SITES,
  DEMO_REGION_TIER,
  DEMO_TIER_ORDER,
  DEMO_TIER_NAME,
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

const TILT_DEG: Record<string, number> = { "Top-down": 12, Low: 32, Medium: 55, High: 72 };
const EXTRUDE_DEPTH: Record<string, number> = { Flat: 0.5, Low: 4, Medium: 8, High: 14 };
// Status-friendly defaults for the ?regions=1 demo (Down → Healthy).
const DEMO_SLOT_COLORS = ["#d64545", "#e3a008", "#3f9d52", null, null];

export default function SaudiApp() {
  const config = useConfig() ?? {};
  const regionSourceId = typeof config.regionSource === "string" ? config.regionSource : undefined;
  const siteSourceId = typeof config.siteSource === "string" ? config.siteSource : undefined;
  const regionData = useElementData(regionSourceId ?? "");
  const regionColumns = useElementColumns(regionSourceId ?? "");
  const siteData = useElementData(siteSourceId ?? "");

  const standalone = useMemo(detectStandalone, []);
  const preview = useMemo(() => {
    if (!standalone || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, [standalone]);
  const previewRegions = !!preview && preview.get("regions") === "1";
  const [legendSel, setLegendSel] = useState<string | null>(null);

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const regionId = firstId(config.region);
  const regionTierId = firstId(config.regionTier);
  const regionMetricId = firstId(config.regionMetric);
  const siteLabelId = firstId(config.siteLabel);
  const siteLatId = firstId(config.siteLat);
  const siteLngId = firstId(config.siteLng);
  const siteStatusId = firstId(config.siteStatus);

  // ---- appearance ----
  const background =
    (preview && preview.get("bg") && withHash(preview.get("bg")!)) ||
    (typeof config.backgroundColor === "string" && config.backgroundColor
      ? withHash(config.backgroundColor)
      : "#1c1c20");
  const landColor =
    typeof config.landColor === "string" && config.landColor
      ? withHash(config.landColor)
      : "#cdd2d8";
  const borderColor =
    typeof config.borderColor === "string" && config.borderColor
      ? withHash(config.borderColor)
      : "#ffffff";
  const labelColor = "#22242b";

  const extrudeKey =
    (preview && preview.get("extrude")) ||
    (typeof config.extrude === "string" ? config.extrude : "Medium");
  const extrudeDepth = EXTRUDE_DEPTH[extrudeKey] ?? EXTRUDE_DEPTH.Medium;
  const tiltKey =
    (preview && preview.get("tilt")) ||
    (typeof config.tilt === "string" ? config.tilt : "Medium");
  const tiltDeg = TILT_DEG[tiltKey] ?? TILT_DEG.Medium;
  const allowSpin = preview ? preview.get("spin") === "1" : config.allowSpin === true;
  const showLabels = preview ? preview.get("labels") !== "0" : config.showLabels !== false;
  const showLegend = preview ? preview.get("legend") === "1" : config.showLegend === true;

  // ---- tier color slots ----
  const slotColors = useMemo<(string | null)[]>(() => {
    if (standalone && previewRegions) return DEMO_SLOT_COLORS;
    return [config.color1, config.color2, config.color3, config.color4, config.color5].map(
      (c) => parseHexColors(typeof c === "string" ? c : "")[0] ?? null,
    );
  }, [
    standalone,
    previewRegions,
    config.color1,
    config.color2,
    config.color3,
    config.color4,
    config.color5,
  ]);
  const colorKey = slotColors.join("|");

  const tierName = (regionTierId && regionColumns?.[regionTierId]?.name) || "Status";
  const metricName = (regionMetricId && regionColumns?.[regionMetricId]?.name) || "Value";
  const tierOrder = useMemo(() => parseList(config.regionTierOrder), [config.regionTierOrder]);

  // ---- region tiers + metrics keyed by canonical region key ----
  const { tierByKey, metricByKey } = useMemo(() => {
    const tiers: Record<string, string> = {};
    const metrics: Record<string, number> = {};
    if (standalone) {
      if (previewRegions) Object.assign(tiers, DEMO_REGION_TIER);
      return { tierByKey: tiers, metricByKey: metrics };
    }
    const regionVals: unknown[] = (regionId && regionData?.[regionId]) || [];
    const tierVals: unknown[] = (regionTierId && regionData?.[regionTierId]) || [];
    const metricVals: unknown[] = (regionMetricId && regionData?.[regionMetricId]) || [];
    for (let i = 0; i < regionVals.length; i++) {
      const key = provinceKey(regionVals[i]);
      if (!key) continue;
      const tv = tierVals[i];
      if (tv != null && String(tv).trim() !== "" && !(key in tiers)) tiers[key] = String(tv);
      const mv = Number(metricVals[i]);
      if (isFinite(mv)) metrics[key] = (metrics[key] ?? 0) + mv;
    }
    return { tierByKey: tiers, metricByKey: metrics };
  }, [standalone, previewRegions, regionData, regionId, regionTierId, regionMetricId]);

  const activeTierName = standalone && previewRegions ? DEMO_TIER_NAME : tierName;
  const activeTierOrder = standalone && previewRegions ? DEMO_TIER_ORDER : tierOrder;

  const categories = useMemo(
    () => orderedCategories(Object.values(tierByKey), activeTierOrder),
    [tierByKey, activeTierOrder],
  );
  const scale = useMemo(
    () => buildCategoryScale(categories, slotColors),
    [categories, colorKey],
  );

  // region key -> cap color (only regions that resolved to a tier+color).
  // When a legend section is selected, non-matching regions stay un-colored.
  const legendKeys = useMemo(() => new Set(scale.entries.map((e) => e.key)), [scale]);
  const effSel = legendSel && legendKeys.has(legendSel) ? legendSel : null;
  const capColors = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [key, tier] of Object.entries(tierByKey)) {
      const k = scale.keyForTier(tier);
      if (k == null) continue;
      if (effSel && k !== effSel) continue;
      const c = scale.colorForKey(k);
      if (c) out[key] = c;
    }
    return out;
  }, [tierByKey, scale, effSel]);

  // ---- sites ----
  const sites = useMemo<SiteMarker[]>(() => {
    if (standalone) return DEMO_SITES;
    const labels: unknown[] = (siteLabelId && siteData?.[siteLabelId]) || [];
    const lats: unknown[] = (siteLatId && siteData?.[siteLatId]) || [];
    const lngs: unknown[] = (siteLngId && siteData?.[siteLngId]) || [];
    const statuses: unknown[] = (siteStatusId && siteData?.[siteStatusId]) || [];
    const out: SiteMarker[] = [];
    for (let i = 0; i < labels.length; i++) {
      const lat = Number(lats[i]);
      const lng = Number(lngs[i]);
      if (!isFinite(lat) || !isFinite(lng)) continue;
      const status = statuses[i];
      out.push({
        label: String(labels[i] ?? ""),
        lat,
        lng,
        status: status != null && String(status).trim() !== "" ? String(status) : undefined,
        healthy: isHealthy(status),
      });
    }
    return out;
  }, [standalone, siteData, siteLabelId, siteLatId, siteLngId, siteStatusId]);

  const hasMetric = !!regionMetricId;
  const regionTooltip = useMemo(
    () =>
      (key: string, name: string): string | null => {
        const lines: string[] = [];
        const tier = tierByKey[key];
        if (tier) lines.push(`${escapeHtml(activeTierName)}: <b>${escapeHtml(tier)}</b>`);
        if (hasMetric && metricByKey[key] !== undefined)
          lines.push(`${escapeHtml(metricName)}: <b>${escapeHtml(formatFull(metricByKey[key]))}</b>`);
        return `<div class="tt-name">${escapeHtml(name)}</div>${lines
          .map((l) => `<div class="tt-row">${l}</div>`)
          .join("")}`;
      },
    [tierByKey, metricByKey, activeTierName, metricName, hasMetric],
  );

  const siteTooltip = useMemo(
    () => (s: SiteMarker) => {
      const state = s.healthy ? "Healthy" : "Down";
      const statusLine = s.status ? escapeHtml(s.status) : state;
      return `<div class="tt-name">${escapeHtml(s.label)}</div><div class="tt-row">Status: <b>${statusLine}</b></div>`;
    },
    [],
  );

  const configured =
    standalone ||
    (!!siteSourceId && !!siteLabelId && !!siteLatId && !!siteLngId) ||
    (!!regionSourceId && !!regionId);

  const appStyle: CSSProperties = { background };

  return (
    <div className="sa-app" style={appStyle}>
      <SaudiMap
        capColors={capColors}
        landColor={landColor}
        borderColor={borderColor}
        background={background}
        labelColor={labelColor}
        sites={sites}
        showLabels={showLabels}
        extrudeDepth={extrudeDepth}
        tiltDeg={tiltDeg}
        allowSpin={allowSpin}
        regionTooltip={regionTooltip}
        siteTooltip={siteTooltip}
      />

      {showLegend && scale.hasData && (
        <Legend
          title={activeTierName}
          entries={scale.entries}
          selectedKey={effSel}
          onSelect={(k) => setLegendSel((p) => (p === k ? null : k))}
        />
      )}

      {!configured && (
        <div className="sa-hint">
          <b>Saudi Arabia regions map</b>
          <span>
            Configure <em>Regions</em> and/or <em>Sites</em> in the editor panel
            on the right. Drag to tilt up/down.
          </span>
        </div>
      )}
    </div>
  );
}
