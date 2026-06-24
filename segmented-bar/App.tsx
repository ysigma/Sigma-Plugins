import { useEffect, useMemo, type CSSProperties } from "react";
import {
  useConfig,
  useElementColumns,
  useElementData,
  usePluginStyle,
  client,
} from "@sigmacomputing/plugin";
import SegmentedBar, { DEFAULT_SECTION_COLORS } from "./SegmentedBar";
import EmptyState from "./EmptyState";

function firstId(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function withHash(c: string): string {
  return c && !c.startsWith("#") ? `#${c}` : c;
}

/** Parse a possibly-formatted string/number into a finite number, or null. */
function toNum(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.replace(/,/g, "").trim();
    if (s === "") return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  }
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Pick a readable text color (dark/light) for a known hex background. */
function readableText(bg: string): string | null {
  const hex = bg.replace("#", "");
  if (hex.length < 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6 ? "#1f2733" : "#f2f5fa";
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
  const pluginStyle = usePluginStyle();
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

  const valueColId = firstId(config.value);
  const valueName = (valueColId && columns?.[valueColId]?.name) || "Value";

  // --- Value (from the measure, or the demo/preview) -----------------------
  const liveValue = useMemo<number | null>(() => {
    if (!valueColId) return null;
    const arr: unknown[] = data?.[valueColId] ?? [];
    for (const v of arr) {
      const n = toNum(v);
      if (n != null) return n;
    }
    return null;
  }, [data, valueColId]);

  // --- Scale & thresholds --------------------------------------------------
  const rawMin = preview ? toNum(preview.get("min")) : toNum(config.min);
  const rawMax = preview ? toNum(preview.get("max")) : toNum(config.max);
  const minIn = rawMin ?? (standalone ? 0 : 0);
  const maxIn = rawMax ?? (standalone ? 100 : 100);
  const invalidRange = maxIn <= minIn;
  const min = Math.min(minIn, maxIn);
  const max = invalidRange ? Math.max(minIn, maxIn, min + 1) : maxIn;
  const span = max - min || 1;

  const previewThresholds = preview
    ? (preview.get("t") ?? "").split(",").map((s) => toNum(s))
    : [];
  // Standalone demo mirrors the reference screenshot's unequal section widths.
  const demoT: (number | null)[] = standalone ? [31, 57, 79] : [];
  const t1 = preview ? previewThresholds[0] ?? demoT[0] ?? null : toNum(config.threshold1);
  const t2 = preview ? previewThresholds[1] ?? demoT[1] ?? null : toNum(config.threshold2);
  const t3 = preview ? previewThresholds[2] ?? demoT[2] ?? null : toNum(config.threshold3);

  const bounds = useMemo<[number, number, number]>(() => {
    const defaults = [min + span * 0.25, min + span * 0.5, min + span * 0.75];
    const picked = [t1 ?? defaults[0], t2 ?? defaults[1], t3 ?? defaults[2]].map((x) =>
      clamp(x, min, max),
    );
    picked.sort((a, b) => a - b);
    return [picked[0], picked[1], picked[2]];
  }, [t1, t2, t3, min, max, span]);

  // --- Colors --------------------------------------------------------------
  const colors = useMemo<[string, string, string, string]>(() => {
    const previewColors = preview
      ? (preview.get("colors") ?? "").split(",").map((s) => s.trim())
      : [];
    const picks = preview
      ? previewColors
      : [config.color1, config.color2, config.color3, config.color4].map((c) =>
          typeof c === "string" ? c : "",
        );
    return DEFAULT_SECTION_COLORS.map((def, i) =>
      picks[i] ? withHash(picks[i] as string) : def,
    ) as [string, string, string, string];
  }, [preview, config.color1, config.color2, config.color3, config.color4]);

  // --- Display options -----------------------------------------------------
  const title = preview ? preview.get("title") ?? "" : typeof config.title === "string" ? config.title : "";
  const showValueLabel = preview
    ? preview.get("label") !== "0"
    : config.showValueLabel !== false;
  const showScale = preview ? preview.get("scale") !== "0" : config.showScale !== false;

  const decimalsRaw = typeof config.decimals === "string" ? config.decimals : "Auto";
  const decimals: number | "auto" = decimalsRaw === "Auto" ? "auto" : parseInt(decimalsRaw, 10);

  const barHeight =
    parseInt(preview ? preview.get("h") ?? "28" : (config.barHeight as string) ?? "28", 10) || 28;

  const markerColor =
    (preview && preview.get("marker") && withHash(preview.get("marker")!)) ||
    (typeof config.markerColor === "string" && config.markerColor
      ? withHash(config.markerColor)
      : "");

  // Background: explicit config → Sigma workbook style → transparent.
  // Demo/preview uses a dark canvas to mirror the reference screenshot.
  const demoDark = preview ? preview.get("light") !== "1" : standalone;
  const bgConfig =
    (preview && preview.get("bg") && withHash(preview.get("bg")!)) ||
    (typeof config.backgroundColor === "string" && config.backgroundColor
      ? withHash(config.backgroundColor)
      : "");
  const bgStyle = pluginStyle?.backgroundColor;
  const background = bgConfig || (standalone ? (demoDark ? "#0b1320" : "#ffffff") : bgStyle || "transparent");

  const textColor =
    (typeof config.textColor === "string" && config.textColor && withHash(config.textColor)) ||
    readableText(background) ||
    "#1f2733";

  // --- Demo values (standalone preview only) -------------------------------
  const value = standalone && liveValue == null ? toNum(preview?.get("value")) ?? 25 : liveValue;
  const demoTitle = standalone && !title ? "Threat Level" : title;

  const appStyle: CSSProperties = { background, color: textColor };

  const configured = standalone || (!!sourceId && !!valueColId);

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign a Value measure", done: !!valueColId },
    { label: "Set scale min/max & thresholds (optional)", done: false },
  ];

  return (
    <div className="app" style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : (
        <div className="sbm-wrap">
          {demoTitle ? <div className="sbm-title">{demoTitle}</div> : null}
          <SegmentedBar
            min={min}
            max={max}
            bounds={bounds}
            colors={colors}
            value={value}
            valueName={valueName}
            showValueLabel={showValueLabel}
            showScale={showScale}
            markerColor={markerColor}
            barHeight={barHeight}
            decimals={decimals}
            textColor={textColor}
          />
          {invalidRange && !standalone && (
            <div className="sbm-note">Scale maximum must be greater than minimum.</div>
          )}
        </div>
      )}
    </div>
  );
}
