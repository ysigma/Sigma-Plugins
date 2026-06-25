import { useEffect, useMemo, type CSSProperties } from "react";
import {
  useConfig,
  useElementColumns,
  useElementData,
  usePluginStyle,
  client,
} from "@sigmacomputing/plugin";
import DotPlot, { type DotRow, type StageColumn } from "./DotPlot";
import EmptyState from "./EmptyState";
import { resolveDotColor, DEFAULT_PALETTE, DEFAULT_BG } from "./palette";
import { DEMO_ROWS, DEMO_STAGE_ORDER, DEMO_STAGE_NAME } from "./demoData";

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

/** Normalize a stage value for matching (trim + lowercase + collapse spaces). */
function normalizeStage(value: unknown): string {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function parseList(input: unknown): string[] {
  if (typeof input !== "string" || !input) return [];
  return input
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ordered stage labels: the user's typed order first, then any extras in data. */
function orderedStages(values: unknown[], preferred: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of preferred) {
    const k = normalizeStage(p);
    if (p && !seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  for (const v of values) {
    if (v == null || String(v).trim() === "") continue;
    const k = normalizeStage(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(String(v).trim());
    }
  }
  return out;
}

interface Model {
  rows: DotRow[];
  stages: StageColumn[];
  unplaced: number;
}

/**
 * Collapse the raw columns into one row per platform (first non-empty stage
 * wins) and the ordered set of stage columns. Re-pointing the stage column in
 * Sigma re-runs this and moves each circle to its new column.
 */
function buildModel(platformVals: unknown[], stageVals: unknown[], preferred: string[]): Model {
  const map = new Map<string, { platform: string; stageRaw: string | null }>();
  const order: string[] = [];
  const n = platformVals.length;
  for (let i = 0; i < n; i++) {
    const pv = platformVals[i];
    if (pv == null || String(pv).trim() === "") continue;
    const k = normalizeStage(pv);
    let row = map.get(k);
    if (!row) {
      row = { platform: String(pv).trim(), stageRaw: null };
      map.set(k, row);
      order.push(k);
    }
    const sv = stageVals[i];
    if (row.stageRaw == null && sv != null && String(sv).trim() !== "") {
      row.stageRaw = String(sv).trim();
    }
  }
  const platformRows = order.map((k) => map.get(k)!);
  const stageLabels = orderedStages(
    platformRows.map((r) => r.stageRaw),
    preferred,
  );
  const labelByKey = new Map(stageLabels.map((l) => [normalizeStage(l), l]));
  const stages: StageColumn[] = stageLabels.map((l) => ({ key: normalizeStage(l), label: l }));

  let unplaced = 0;
  const rows: DotRow[] = platformRows.map((r) => {
    const key = r.stageRaw != null ? normalizeStage(r.stageRaw) : null;
    if (key == null) unplaced++;
    return {
      platform: r.platform,
      stageKey: key,
      stageLabel: key != null ? labelByKey.get(key) ?? r.stageRaw : null,
    };
  });
  return { rows, stages, unplaced };
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

// Named circle sizes → dot radius in px (the px override takes precedence).
const SIZE_PX: Record<string, number> = {
  "Extra small": 4,
  Small: 6,
  Medium: 9,
  Large: 13,
  "Extra large": 18,
};

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

  const platformColId = firstId(config.platform);
  const stageColId = firstId(config.stage);

  // --- Color: palette swatch, with an optional custom override ------------
  const dotColor = useMemo(() => {
    const paletteName = preview
      ? preview.get("palette") || DEFAULT_PALETTE
      : typeof config.palette === "string"
        ? config.palette
        : DEFAULT_PALETTE;
    const customRaw = preview
      ? preview.get("color")
      : typeof config.dotColor === "string"
        ? config.dotColor
        : "";
    return resolveDotColor(paletteName, customRaw ? withHash(customRaw) : undefined);
  }, [preview, config.palette, config.dotColor]);

  // --- Background: config → workbook style → dark default -----------------
  const bgRaw =
    (preview && preview.get("bg")) ||
    (typeof config.backgroundColor === "string" && config.backgroundColor) ||
    "";
  const workbookBg =
    !standalone && typeof pluginStyle?.backgroundColor === "string" ? pluginStyle.backgroundColor : "";
  const background = bgRaw ? withHash(bgRaw) : workbookBg || DEFAULT_BG;
  const theme: "dark" | "light" = isDarkBg(background) ? "dark" : "light";

  // --- Circle size: named size, or an exact px-radius override ------------
  const sizeKey = (preview ? preview.get("size") : (config.circleSize as string)) || "Small";
  const sizeOverride = toNum(preview ? preview.get("px") : config.circleSizePx);
  const radius =
    sizeOverride && sizeOverride > 0
      ? Math.max(2, Math.min(40, sizeOverride))
      : SIZE_PX[sizeKey] ?? SIZE_PX.Small;

  const showGrid = preview ? preview.get("grid") !== "0" : config.showGrid !== false;

  const stageOrder = useMemo(() => parseList(config.stageOrder), [config.stageOrder]);
  const stageName =
    (standalone ? DEMO_STAGE_NAME : stageColId && columns?.[stageColId]?.name) || "Stage";

  const model = useMemo<Model>(() => {
    if (standalone) {
      return buildModel(
        DEMO_ROWS.map((r) => r[0]),
        DEMO_ROWS.map((r) => r[1]),
        parseList(DEMO_STAGE_ORDER),
      );
    }
    const platformVals: unknown[] = (platformColId && data?.[platformColId]) || [];
    const stageVals: unknown[] = (stageColId && data?.[stageColId]) || [];
    return buildModel(platformVals, stageVals, stageOrder);
  }, [standalone, data, platformColId, stageColId, stageOrder]);

  const getTooltipHtml = (row: DotRow): string =>
    `<div class="tt-name">${escapeHtml(row.platform)}</div>` +
    `<div class="tt-meta">${escapeHtml(stageName)}: <b>${escapeHtml(
      row.stageLabel ?? "Not set",
    )}</b></div>`;

  const appStyle: CSSProperties = { background };
  const configured = standalone || (!!sourceId && !!platformColId && !!stageColId);

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign a Platform dimension (the rows)", done: !!platformColId },
    { label: "Assign a Stage dimension (the x-axis)", done: !!stageColId },
  ];

  return (
    <div className={`app ${theme}`} style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : (
        <div className="adp-wrap">
          <DotPlot
            rows={model.rows}
            stages={model.stages}
            color={dotColor}
            radius={radius}
            theme={theme}
            showGrid={showGrid}
            getTooltipHtml={getTooltipHtml}
          />
          {standalone ? (
            <div className="adp-note corner">Demo data — embed in Sigma for live data.</div>
          ) : model.rows.length === 0 ? (
            <div className="adp-note">No platform rows found. Check the Platform dimension.</div>
          ) : model.stages.length === 0 ? (
            <div className="adp-note">
              No stage values found. Assign a Stage column (or set the Stage order).
            </div>
          ) : (
            model.unplaced > 0 && (
              <div className="adp-note subtle">
                {model.unplaced} platform{model.unplaced === 1 ? "" : "s"} have no stage value.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
