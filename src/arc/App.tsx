import { useEffect, useMemo, type CSSProperties } from "react";
import { useConfig, useElementData, client } from "@sigmacomputing/plugin";
import ThreatMap, { type ThreatMapColors } from "./components/ThreatMap";
import Legend, { type LegendEntry } from "./components/Legend";
import EmptyState from "./components/EmptyState";
import { buildModel } from "./lib/model";
import { ACCENTS, accentColor, hexToRgb, rgba, SEVERITY_LABEL } from "./lib/theme";

function firstId(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function withHash(c: string): string {
  return c && !c.startsWith("#") ? `#${c}` : c;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Default destination: Riyadh, Saudi Arabia. */
const DEFAULT_DEST = { lat: 24.7136, lon: 46.6753, name: "Saudi Arabia" };

const COLOR_DEFAULTS: ThreatMapColors = {
  arc: "#ff5a1f",
  background: "#11141b",
  land: "#2a2f3a",
  border: "#3c4453",
  label: "#c7cdd8",
};

const SPEED: Record<string, number> = { Slow: 0.6, Medium: 1, Fast: 1.6 };
const MAX_ARCS = 240;

export default function App() {
  const config = useConfig() ?? {};
  const sourceId = typeof config.source === "string" ? config.source : undefined;
  const data = useElementData(sourceId ?? "");

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const srcLatId = firstId(config.srcLat);
  const srcLonId = firstId(config.srcLon);
  const srcLabelId = firstId(config.srcLabel);
  const dstLatId = firstId(config.dstLat);
  const dstLonId = firstId(config.dstLon);
  const dstLabelId = firstId(config.dstLabel);
  const severityId = firstId(config.severity);
  const weightId = firstId(config.weight);
  const attackTypeId = firstId(config.attackType);
  const targetId = firstId(config.target);

  const colors: ThreatMapColors = {
    arc: str(config.arcColor) ? withHash(str(config.arcColor)) : COLOR_DEFAULTS.arc,
    background: str(config.backgroundColor)
      ? withHash(str(config.backgroundColor))
      : COLOR_DEFAULTS.background,
    land: str(config.landColor) ? withHash(str(config.landColor)) : COLOR_DEFAULTS.land,
    border: str(config.borderColor) ? withHash(str(config.borderColor)) : COLOR_DEFAULTS.border,
    label: str(config.labelColor) ? withHash(str(config.labelColor)) : COLOR_DEFAULTS.label,
  };

  const flowSpeedMult = SPEED[str(config.flowSpeed)] ?? 1;
  const severityAccents = config.severityAccents !== false;
  const showLabels = config.showLabels !== false;
  const showLegend = config.showLegend !== false;
  const autoFit = config.autoFit !== false;

  // Default destination (used when no dest columns are bound).
  const defaultDest = useMemo(() => {
    const name = str(config.destName).trim() || DEFAULT_DEST.name;
    const parts = str(config.destLatLon)
      .split(",")
      .map((s) => Number(s.trim()));
    const ok =
      parts.length === 2 &&
      isFinite(parts[0]) &&
      isFinite(parts[1]) &&
      Math.abs(parts[0]) <= 90 &&
      Math.abs(parts[1]) <= 180;
    return {
      lat: ok ? parts[0] : DEFAULT_DEST.lat,
      lon: ok ? parts[1] : DEFAULT_DEST.lon,
      label: name,
    };
  }, [config.destName, config.destLatLon]);

  const col = (id: string | undefined): unknown[] | undefined =>
    id && data ? (data[id] as unknown[] | undefined) : undefined;

  const model = useMemo(
    () =>
      buildModel({
        srcLat: col(srcLatId) ?? [],
        srcLon: col(srcLonId) ?? [],
        dstLat: col(dstLatId),
        dstLon: col(dstLonId),
        srcLabel: col(srcLabelId),
        dstLabel: col(dstLabelId),
        severity: col(severityId),
        weight: col(weightId),
        attackType: col(attackTypeId),
        target: col(targetId),
        defaultDest,
        maxArcs: MAX_ARCS,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data,
      srcLatId,
      srcLonId,
      dstLatId,
      dstLonId,
      srcLabelId,
      dstLabelId,
      severityId,
      weightId,
      attackTypeId,
      targetId,
      defaultDest,
    ],
  );

  const legendEntries = useMemo<LegendEntry[]>(() => {
    const base = hexToRgb(colors.arc);
    const out: LegendEntry[] = [];
    if (severityAccents) {
      (["critical", "high", "medium", "low"] as const).forEach((k) => {
        out.push({ label: SEVERITY_LABEL[k], color: rgba(accentColor(base, ACCENTS[k].bright), 1) });
      });
    } else {
      out.push({ label: "Attack flow", color: rgba(base, 1) });
    }
    out.push({ label: defaultDest.label, color: rgba(accentColor(base, 0.5), 1), target: true });
    return out;
  }, [colors.arc, severityAccents, defaultDest.label]);

  const configured = !!sourceId && !!srcLatId && !!srcLonId;
  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign the Source latitude column", done: !!srcLatId },
    { label: "Assign the Source longitude column", done: !!srcLonId },
  ];

  const appStyle: CSSProperties = { background: colors.background };

  const skipped = model.unmapped + model.cappedArcs;

  return (
    <div className="tam-app" style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : (
        <>
          <ThreatMap
            model={model}
            colors={colors}
            flowSpeedMult={flowSpeedMult}
            severityAccents={severityAccents}
            showLabels={showLabels}
            autoFit={autoFit}
          />
          {showLegend && <Legend entries={legendEntries} />}
          {model.totalRows === 0 ? (
            <div className="tam-notice">
              No rows to map yet. Check that the latitude / longitude columns hold
              numeric coordinates.
            </div>
          ) : (
            skipped > 0 && (
              <div className="tam-notice subtle">
                {model.cappedArcs > 0 && (
                  <>Showing the top {MAX_ARCS} routes by volume. </>
                )}
                {model.unmapped > 0 && (
                  <>
                    {model.unmapped} row{model.unmapped === 1 ? "" : "s"} skipped (invalid
                    coordinates).
                  </>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
