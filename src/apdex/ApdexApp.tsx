import { useEffect, useMemo, type CSSProperties } from "react";
import {
  useConfig,
  useElementColumns,
  useElementData,
  client,
} from "@sigmacomputing/plugin";
import { resolveColors, toColor, DEFAULTS, type ConditionRule } from "./colors";
import { NUM_CONDITIONS } from "./sigmaConfig";
import "./styles.css";

/** A config column value is an array of column IDs; grab the first one. */
function firstId(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Running outside Sigma (top-level window or ?demo) → show demo content. */
function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("demo")) return true;
    return window.self === window.top;
  } catch {
    return false;
  }
}

function formatValue(v: number, decimals: string): string {
  if (!isFinite(v)) return "—";
  const opts: Intl.NumberFormatOptions =
    decimals === "Auto" || decimals === ""
      ? { maximumFractionDigits: 6 }
      : { minimumFractionDigits: Number(decimals), maximumFractionDigits: Number(decimals) };
  return new Intl.NumberFormat(undefined, opts).format(v);
}

/** Font sizes & padding for the three badge sizes (px). */
const SIZES: Record<string, { value: number; text: number; padV: number; padH: number; gap: number }> = {
  Small: { value: 14, text: 12.5, padV: 4, padH: 11, gap: 7 },
  Medium: { value: 17, text: 14.5, padV: 6, padH: 15, gap: 9 },
  Large: { value: 24, text: 19, padV: 9, padH: 22, gap: 12 },
};

export default function ApdexApp() {
  const config = useConfig() ?? {};
  const sourceId = firstId(config.source);
  const data = useElementData(sourceId ?? "");
  const columns = useElementColumns(sourceId ?? "");

  const standalone = useMemo(detectStandalone, []);
  const preview = useMemo(
    () => (standalone && typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null),
    [standalone],
  );

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const valueColId = firstId(config.value);
  const categoryColId = firstId(config.category);

  // Pull the value + category from the source (first row with a finite value).
  const live = useMemo(() => {
    const values: unknown[] = (valueColId && data?.[valueColId]) || [];
    const cats: unknown[] = (categoryColId && data?.[categoryColId]) || [];
    let idx = values.findIndex((v) => v != null && v !== "" && Number.isFinite(Number(v)));
    if (idx < 0) idx = 0;
    return {
      value: values.length ? Number(values[idx]) : NaN,
      category: cats.length ? (cats[idx] ?? cats[0]) : undefined,
    };
  }, [data, valueColId, categoryColId]);

  // Condition rules (category value → accent + background).
  const rules = useMemo<ConditionRule[]>(() => {
    const out: ConditionRule[] = [];
    for (let i = 1; i <= NUM_CONDITIONS; i++) {
      const value = str(config[`cond${i}Value`]);
      const accent = str(config[`cond${i}Border`]);
      const background = str(config[`cond${i}Bg`]);
      if (value || accent || background) out.push({ value, accent, background });
    }
    return out;
  }, [config]);

  // Resolve the active data: demo values when standalone, else live.
  const valueColName = (valueColId && columns?.[valueColId]?.name) || "";
  const activeValue = standalone
    ? Number(preview?.get("value") ?? "0.92")
    : live.value;
  const activeCategory = standalone
    ? preview?.get("category") ?? "Excellent"
    : live.category;
  const activeLabel =
    str(config.label).trim() ||
    valueColName ||
    (standalone ? preview?.get("label") ?? "Overall Apdex" : "");

  // Display options.
  const sizeKey = str(config.size) || "Medium";
  const size = SIZES[sizeKey] ?? SIZES.Medium;
  const decimals = str(config.decimals) || "Auto";
  const showCategory = config.showCategory !== false;
  const separator = config.separator === undefined ? "·" : str(config.separator);
  const borderWidth = Number(str(config.borderWidth) || "1") || 0;
  const radius = Number(str(config.cornerRadius) || "999") || 0;
  const valueColor = toColor(config.valueColor) ?? DEFAULTS.value;

  // Resolve accent + background from the conditions.
  const colors = resolveColors(
    activeCategory,
    rules,
    toColor(config.defaultBorder),
    toColor(config.defaultBg),
  );

  const configured = standalone || (!!sourceId && !!valueColId);

  if (!configured) {
    const steps = [
      { label: "Pick a Data source element", done: !!sourceId },
      { label: "Assign the Value (measure)", done: !!valueColId },
      { label: "Assign the Category (dimension) for conditional colors", done: !!categoryColId },
    ];
    return (
      <div className="apx-root">
        <div className="apx-setup">
          <h2>Apdex badge</h2>
          <p>Configure the plugin in the editor panel on the right:</p>
          <ul>
            {steps.map((s, i) => (
              <li key={i} className={s.done ? "done" : ""}>
                <span className="check">{s.done ? "✓" : "•"}</span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const badgeStyle: CSSProperties = {
    background: colors.background,
    borderColor: colors.accent,
    borderWidth,
    borderStyle: "solid",
    borderRadius: radius,
    padding: `${size.padV}px ${size.padH}px`,
    gap: size.gap,
  };
  const hasCategory = activeCategory != null && String(activeCategory).trim() !== "";
  const categoryText = separator
    ? `${separator} ${activeCategory}`
    : String(activeCategory);

  return (
    <div className="apx-root">
      <div className="apx-badge" style={badgeStyle}>
        {activeLabel && (
          <span className="apx-label" style={{ color: colors.accent, fontSize: size.text }}>
            {activeLabel}
          </span>
        )}
        <span className="apx-value" style={{ color: valueColor, fontSize: size.value }}>
          {formatValue(activeValue, decimals)}
        </span>
        {showCategory && hasCategory && (
          <span className="apx-category" style={{ color: colors.accent, fontSize: size.text }}>
            {categoryText}
          </span>
        )}
      </div>
    </div>
  );
}
