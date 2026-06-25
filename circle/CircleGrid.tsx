import { type CSSProperties } from "react";
import { formatNumber } from "./format";

/** Default ring/label/value color — the muted gold of the reference wireframe. */
export const DEFAULT_COLOR = "#D4AF37";
/** Default canvas — near-black, so the gold reads exactly like the wireframe. */
export const DEFAULT_BG = "#0B0B0B";

export interface CircleItem {
  label: string;
  value: number | null;
}

export interface CircleGridProps {
  items: CircleItem[];
  /** The single color that drives rings, labels and values together. */
  color: string;
  /** Stroke width in SVG user units (viewBox is 100×100), so it scales. */
  ringThickness: number;
  /** Circle diameter in px. */
  diameter: number;
  /** Fixed column count, or "auto" to fit as many as the width allows. */
  columns: number | "auto";
  /** Grid gap in px. */
  gap: number;
  showValue: boolean;
  /** Whether a measure column is bound (drives whether the value row renders). */
  hasMeasure: boolean;
  uppercase: boolean;
  decimals: number | "auto";
}

export default function CircleGrid({
  items,
  color,
  ringThickness,
  diameter,
  columns,
  gap,
  showValue,
  hasMeasure,
  uppercase,
  decimals,
}: CircleGridProps) {
  // Outer edge of the stroke lands exactly on the viewBox edge → no clipping.
  const r = 50 - ringThickness / 2;

  const gridStyle: CSSProperties = {
    gap: `${gap}px`,
    gridTemplateColumns:
      columns === "auto"
        ? `repeat(auto-fit, minmax(${diameter}px, 1fr))`
        : `repeat(${columns}, minmax(0, 1fr))`,
    // Drives the proportional font sizes of labels & values in CSS.
    ["--cg-d" as string]: `${diameter}px`,
  };

  const showValueRow = showValue && hasMeasure;

  return (
    <div className="cg-grid" style={gridStyle}>
      {items.map((it, i) => (
        <div className="cg-cell" key={i}>
          <div className="cg-ring-wrap">
            <svg
              className="cg-ring"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              shapeRendering="geometricPrecision"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={ringThickness}
              />
            </svg>
            <div
              className={`cg-label${uppercase ? " upper" : ""}`}
              style={{ color }}
              title={it.label}
            >
              <span className="cg-label-inner">{it.label}</span>
            </div>
          </div>
          {showValueRow && (
            <div className="cg-value" style={{ color }}>
              {it.value == null ? "–" : formatNumber(it.value, decimals)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
