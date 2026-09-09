import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { formatNumber } from "./format";

/** Default ring/label/value color — the muted gold of the reference wireframe. */
export const DEFAULT_COLOR = "#D4AF37";
/** Default canvas — near-black, so the gold reads exactly like the wireframe. */
export const DEFAULT_BG = "#0B0B0B";

export interface CircleItem {
  label: string;
  value: number | null;
}

/** Label sizing: either auto-fit (shrink to fit the ring) or a fixed px size. */
export interface LabelSizing {
  autoFit: boolean;
  /** Starting/maximum font size in px (auto-fit shrinks down from here). */
  maxPx: number;
  /** Floor for auto-fit, in px. */
  minPx: number;
  /** Fixed font size in px (used when autoFit is false). */
  fixedPx: number;
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
  labelSizing: LabelSizing;
}

interface CircleCellProps {
  item: CircleItem;
  color: string;
  ringThickness: number;
  showValue: boolean;
  uppercase: boolean;
  decimals: number | "auto";
  sizing: LabelSizing;
}

function CircleCell({
  item,
  color,
  ringThickness,
  showValue,
  uppercase,
  decimals,
  sizing,
}: CircleCellProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // Outer edge of the stroke lands exactly on the viewBox edge → no clipping.
  const r = 50 - ringThickness / 2;
  const { autoFit, maxPx, minPx, fixedPx } = sizing;

  // Size the label so whole words never split: in auto-fit mode we shrink the
  // font until the (space-wrapped) text fits inside the ring's inscribed box.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    const fit = () => {
      let s = autoFit ? maxPx : fixedPx;
      text.style.fontSize = `${s}px`;
      if (!autoFit) return;
      let guard = 120;
      while (
        guard-- > 0 &&
        s > minPx &&
        (text.scrollHeight > box.clientHeight + 0.5 ||
          text.scrollWidth > box.clientWidth + 0.5)
      ) {
        s -= 0.5;
        text.style.fontSize = `${s}px`;
      }
    };

    fit();
    // Re-fit if the tile (and thus the ring) is resized.
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [item.label, autoFit, maxPx, minPx, fixedPx]);

  return (
    <div className="cg-cell">
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
        <div className="cg-label" ref={boxRef} style={{ color }} title={item.label}>
          <span
            className={`cg-label-text${uppercase ? " upper" : ""}`}
            ref={textRef}
            style={{ fontSize: `${autoFit ? maxPx : fixedPx}px` }}
          >
            {item.label}
          </span>
        </div>
      </div>
      {showValue && (
        <div className="cg-value" style={{ color }}>
          {item.value == null ? "–" : formatNumber(item.value, decimals)}
        </div>
      )}
    </div>
  );
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
  labelSizing,
}: CircleGridProps) {
  const gridStyle: CSSProperties = {
    gap: `${gap}px`,
    gridTemplateColumns:
      columns === "auto"
        ? `repeat(auto-fit, minmax(${diameter}px, 1fr))`
        : `repeat(${columns}, minmax(0, 1fr))`,
    // Drives the proportional sizes of the value text in CSS.
    ["--cg-d" as string]: `${diameter}px`,
  };

  const showValueRow = showValue && hasMeasure;

  return (
    <div className="cg-grid" style={gridStyle}>
      {items.map((it, i) => (
        <CircleCell
          key={i}
          item={it}
          color={color}
          ringThickness={ringThickness}
          showValue={showValueRow}
          uppercase={uppercase}
          decimals={decimals}
          sizing={labelSizing}
        />
      ))}
    </div>
  );
}
