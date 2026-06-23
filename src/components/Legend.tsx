import type { CSSProperties } from "react";
import type { LegendEntry } from "../lib/color";

export type LegendVariant = "segments" | "gradient-discrete" | "gradient-continuous";

interface ContinuousLegend {
  gradientCss: string;
  ticks: { pos: number; label: string }[];
}

interface LegendProps {
  title?: string;
  variant: LegendVariant;
  entries?: LegendEntry[];
  continuous?: ContinuousLegend;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}

function tickStyle(pos: number): CSSProperties {
  if (pos <= 0) return { left: "0%", transform: "translateX(0)" };
  if (pos >= 1) return { left: "100%", transform: "translateX(-100%)" };
  return { left: `${pos * 100}%`, transform: "translateX(-50%)" };
}

/** Legend rendered as a bar along the bottom of the plugin. */
export default function Legend({
  title,
  variant,
  entries = [],
  continuous,
  selectedKey = null,
  onSelect,
}: LegendProps) {
  // Continuous gradient (measure, color-scale style) — not clickable.
  if (variant === "gradient-continuous") {
    if (!continuous) return null;
    return (
      <div className="legend-bar">
        {title && <div className="legend-title">{title}</div>}
        <div className="legend-cont">
          <div className="legend-cont-bar" style={{ background: continuous.gradientCss }} />
          <div className="legend-cont-ticks">
            {continuous.ticks.map((t, i) => (
              <span key={i} className="legend-tick" style={tickStyle(t.pos)}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) return null;

  // Discrete categories/buckets rendered as a smooth gradient bar with labels.
  if (variant === "gradient-discrete") {
    const stops = entries
      .map((e, i) => `${e.color} ${((i / Math.max(1, entries.length - 1)) * 100).toFixed(1)}%`)
      .join(", ");
    return (
      <div className="legend-bar">
        {title && <div className="legend-title">{title}</div>}
        <div
          className="legend-grad-bar"
          style={{ background: `linear-gradient(to right, ${stops})` }}
        />
        <div className="legend-grad-labels">
          {entries.map((e) => (
            <button
              key={e.key}
              type="button"
              className={`legend-lab ${selectedKey && selectedKey !== e.key ? "dim" : ""} ${
                selectedKey === e.key ? "sel" : ""
              }`}
              onClick={() => onSelect?.(e.key)}
              title="Click to filter the globe to this category"
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Discrete categories/buckets as distinct swatches.
  return (
    <div className="legend-bar">
      {title && <div className="legend-title">{title}</div>}
      <div className="legend-segments">
        {entries.map((e) => (
          <button
            key={e.key}
            type="button"
            className={`legend-seg ${selectedKey && selectedKey !== e.key ? "dim" : ""} ${
              selectedKey === e.key ? "sel" : ""
            }`}
            onClick={() => onSelect?.(e.key)}
            title="Click to filter the globe to this category"
          >
            <span className="legend-swatch" style={{ background: e.color }} />
            <span className="legend-label">{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
