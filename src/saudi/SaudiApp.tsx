import { useEffect, useMemo, type CSSProperties } from "react";
import { useConfig, useElementData, client } from "@sigmacomputing/plugin";
import SaudiMap from "./components/SaudiMap";
import { isHealthy, type SiteMarker } from "./lib/markers";
import { FIXED_SITES, normalizeLabel } from "./lib/fixedSites";

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

export default function SaudiApp() {
  const config = useConfig() ?? {};
  const siteSourceId = typeof config.siteSource === "string" ? config.siteSource : undefined;
  const siteData = useElementData(siteSourceId ?? "");

  const standalone = useMemo(detectStandalone, []);
  const preview = useMemo(() => {
    if (!standalone || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, [standalone]);

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const siteLabelId = firstId(config.siteLabel);
  const siteStatusId = firstId(config.siteStatus);

  const background =
    (preview && preview.get("bg") && withHash(preview.get("bg")!)) ||
    (typeof config.backgroundColor === "string" && config.backgroundColor
      ? withHash(config.backgroundColor)
      : "#1c1c20");
  const pinColor =
    (preview && preview.get("pin") && withHash(preview.get("pin")!)) ||
    (typeof config.pinColor === "string" && config.pinColor
      ? withHash(config.pinColor)
      : "#cbb06a");

  const extrudeKey =
    (preview && preview.get("extrude")) ||
    (typeof config.extrude === "string" ? config.extrude : "Medium");
  const extrudeDepth = EXTRUDE_DEPTH[extrudeKey] ?? EXTRUDE_DEPTH.Medium;
  const tiltKey =
    (preview && preview.get("tilt")) || (typeof config.tilt === "string" ? config.tilt : "Low");
  const tiltDeg = TILT_DEG[tiltKey] ?? TILT_DEG.Low;
  const allowSpin = preview ? preview.get("spin") === "1" : config.allowSpin === true;
  const showLabels = preview ? preview.get("labels") !== "0" : config.showLabels !== false;

  // Pins sit at fixed positions matching the reference design. Their
  // healthy/down status is optionally driven from data, matched by label;
  // unmatched pins (and the standalone preview) default to healthy.
  const sites = useMemo<SiteMarker[]>(() => {
    const statusByLabel = new Map<string, unknown>();
    if (!standalone) {
      const labels: unknown[] = (siteLabelId && siteData?.[siteLabelId]) || [];
      const statuses: unknown[] = (siteStatusId && siteData?.[siteStatusId]) || [];
      for (let i = 0; i < labels.length; i++) {
        const key = normalizeLabel(labels[i]);
        if (key) statusByLabel.set(key, statuses[i]);
      }
    }
    return FIXED_SITES.map((s) => {
      const raw = statusByLabel.get(normalizeLabel(s.label));
      return {
        label: s.label,
        lng: s.lng,
        lat: s.lat,
        status: raw != null && String(raw).trim() !== "" ? String(raw) : undefined,
        healthy: isHealthy(raw),
      };
    });
  }, [standalone, siteData, siteLabelId, siteStatusId]);

  const siteTooltip = useMemo(
    () => (s: SiteMarker) => {
      const state = s.healthy ? "Healthy" : "Down";
      const statusLine = s.status ? escapeHtml(s.status) : state;
      return `<div class="tt-name">${escapeHtml(s.label)}</div><div class="tt-row">Status: <b>${statusLine}</b></div>`;
    },
    [],
  );

  const appStyle: CSSProperties = { background };

  return (
    <div className="sa-app" style={appStyle}>
      <SaudiMap
        background={background}
        pinColor={pinColor}
        sites={sites}
        showLabels={showLabels}
        extrudeDepth={extrudeDepth}
        tiltDeg={tiltDeg}
        allowSpin={allowSpin}
        siteTooltip={siteTooltip}
      />
    </div>
  );
}
