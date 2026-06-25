import { useEffect, useMemo, type CSSProperties } from "react";
import {
  useConfig,
  useElementData,
  usePluginStyle,
  client,
} from "@sigmacomputing/plugin";
import CircleGrid, {
  DEFAULT_COLOR,
  DEFAULT_BG,
  type CircleItem,
  type LabelSizing,
} from "./CircleGrid";
import EmptyState from "./EmptyState";
import { DEMO_ROWS } from "./demoData";

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

/** Is a (hex) background dark enough to want light chrome text? */
function isDarkBg(bg: string): boolean {
  const hex = bg.replace("#", "");
  if (hex.length < 6) return true; // non-hex / transparent → assume dark default
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return true;
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L < 0.5;
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

const SIZE_PX: Record<string, number> = {
  "Extra small": 56,
  Small: 80,
  Medium: 112,
  Large: 152,
  "Extra large": 204,
};
const THICKNESS_UNITS: Record<string, number> = { Thin: 3, Medium: 4.5, Thick: 6.5 };
// Fixed label sizes as a fraction of the circle diameter.
const LABEL_PROP: Record<string, number> = {
  Small: 0.085,
  Medium: 0.105,
  Large: 0.125,
  "Extra large": 0.15,
};

export default function App() {
  const config = useConfig() ?? {};
  const pluginStyle = usePluginStyle();
  const sourceId = typeof config.source === "string" ? config.source : undefined;
  const data = useElementData(sourceId ?? "");

  const standalone = useMemo(detectStandalone, []);
  const preview = useMemo(() => {
    if (!standalone || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, [standalone]);

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const labelColId = firstId(config.label);
  const valueColId = firstId(config.value);

  // --- Build one circle item per row of the bound data ---------------------
  const liveItems = useMemo<CircleItem[]>(() => {
    if (!labelColId) return [];
    const labels: unknown[] = data?.[labelColId] ?? [];
    const values: unknown[] = (valueColId && data?.[valueColId]) || [];
    const out: CircleItem[] = [];
    for (let i = 0; i < labels.length; i++) {
      const lab = labels[i];
      if (lab == null || String(lab).trim() === "") continue;
      out.push({ label: String(lab), value: valueColId ? toNum(values[i]) : null });
    }
    return out;
  }, [data, labelColId, valueColId]);

  const items = standalone ? (DEMO_ROWS as CircleItem[]) : liveItems;
  const hasMeasure = standalone ? true : !!valueColId;

  // --- Color: ONE selector drives rings, labels & values -------------------
  const colorRaw =
    (preview && preview.get("color")) ||
    (typeof config.color === "string" && config.color) ||
    "";
  const color = colorRaw ? withHash(colorRaw) : DEFAULT_COLOR;

  // --- Background: config → workbook style → dark default (matches wireframe)
  const bgRaw =
    (preview && preview.get("bg")) ||
    (typeof config.backgroundColor === "string" && config.backgroundColor) ||
    "";
  const workbookBg = !standalone && typeof pluginStyle?.backgroundColor === "string"
    ? pluginStyle.backgroundColor
    : "";
  const background = bgRaw ? withHash(bgRaw) : workbookBg || DEFAULT_BG;
  const theme = isDarkBg(background) ? "dark" : "light";

  // --- Layout --------------------------------------------------------------
  const sizeKey = (preview ? preview.get("size") : (config.circleSize as string)) || "Small";
  const sizeOverride = toNum(preview ? preview.get("px") : config.circleSizePx);
  const diameter =
    sizeOverride && sizeOverride > 0
      ? Math.max(24, Math.min(600, sizeOverride))
      : SIZE_PX[sizeKey] ?? SIZE_PX.Small;

  const colsRaw = (preview ? preview.get("cols") : (config.columns as string)) || "Auto";
  const gridColumns: number | "auto" =
    colsRaw === "Auto" || !colsRaw ? "auto" : parseInt(colsRaw, 10) || "auto";

  const thickKey = (preview ? preview.get("thick") : (config.ringThickness as string)) || "Medium";
  const ringThickness = THICKNESS_UNITS[thickKey] ?? THICKNESS_UNITS.Medium;

  // Label sizing: "Auto-fit" shrinks each label to fit its ring (no mid-word
  // breaks); the fixed sizes give direct manual control.
  const labelSizeKey = (preview ? preview.get("lsize") : (config.labelSize as string)) || "Auto-fit";
  const labelSizing: LabelSizing = {
    autoFit: labelSizeKey === "Auto-fit" || !(labelSizeKey in LABEL_PROP),
    maxPx: diameter * 0.13,
    minPx: Math.max(7, diameter * 0.05),
    fixedPx: diameter * (LABEL_PROP[labelSizeKey] ?? LABEL_PROP.Medium),
  };

  // --- Display -------------------------------------------------------------
  const showValue = preview ? preview.get("novalue") !== "1" : config.showValue !== false;
  const uppercase = preview ? preview.get("upper") === "1" : config.uppercase === true;
  const decimalsRaw = typeof config.decimals === "string" ? config.decimals : "Auto";
  const decimals: number | "auto" = decimalsRaw === "Auto" ? "auto" : parseInt(decimalsRaw, 10);

  const appStyle: CSSProperties = { background };
  const gap = Math.round(diameter * 0.22);

  const configured = standalone || (!!sourceId && !!labelColId);

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign a Label dimension (one circle per value)", done: !!labelColId },
    { label: "Assign a Measure (optional, shown below)", done: !!valueColId },
  ];

  return (
    <div className={`app ${theme}`} style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : items.length === 0 ? (
        <div className="cg-note" style={{ color }}>
          No rows to display. Check the Label dimension.
        </div>
      ) : (
        <CircleGrid
          items={items}
          color={color}
          ringThickness={ringThickness}
          diameter={diameter}
          columns={gridColumns}
          gap={gap}
          showValue={showValue}
          hasMeasure={hasMeasure}
          uppercase={uppercase}
          decimals={decimals}
          labelSizing={labelSizing}
        />
      )}
    </div>
  );
}
