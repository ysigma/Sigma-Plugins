import { type CSSProperties } from "react";
import { formatNumber } from "./format";

/** Good → bad defaults, matching the green/olive/orange/red reference. */
export const DEFAULT_SECTION_COLORS: [string, string, string, string] = [
  "#3aa655", // green
  "#c9b13a", // olive / amber
  "#e08a3c", // orange
  "#cf4436", // red
];

export interface SegmentedBarProps {
  min: number;
  max: number;
  /** The three inner thresholds, already clamped to [min,max] and sorted. */
  bounds: [number, number, number];
  colors: [string, string, string, string];
  value: number | null;
  valueName: string;
  showValueLabel: boolean;
  showScale: boolean;
  markerColor: string; // "" → use the color of the section the value sits in
  barHeight: number;
  decimals: number | "auto";
  textColor: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export default function SegmentedBar({
  min,
  max,
  bounds,
  colors,
  value,
  valueName,
  showValueLabel,
  showScale,
  markerColor,
  barHeight,
  decimals,
  textColor,
}: SegmentedBarProps) {
  const span = max - min || 1;
  const pct = (v: number) => clamp(((v - min) / span) * 100, 0, 100);

  // Section boundaries: [min, t1, t2, t3, max] → four segments.
  const boundsFull = [min, bounds[0], bounds[1], bounds[2], max];
  const segments = colors.map((color, i) => {
    const lo = boundsFull[i];
    const hi = boundsFull[i + 1];
    return { color, width: Math.max(0, pct(hi) - pct(lo)) };
  });

  const hasValue = value != null && isFinite(value);
  const valuePos = hasValue ? pct(value as number) : 0;
  const outOfRange = hasValue && ((value as number) < min || (value as number) > max);

  // Which section does the value fall in? (drives the default marker color)
  let activeIdx = 0;
  if (hasValue) {
    const v = value as number;
    if (v >= max) {
      activeIdx = 3;
    } else {
      for (let i = 0; i < 4; i++) {
        if (v < boundsFull[i + 1]) {
          activeIdx = i;
          break;
        }
      }
    }
  }
  const coreColor = markerColor || colors[activeIdx];

  const meterStyle: CSSProperties = { color: textColor || undefined };
  const barStyle: CSSProperties = { height: `${barHeight}px` };
  const valueText = hasValue ? formatNumber(value as number, decimals) : "–";

  return (
    <div className="sbm-meter" style={meterStyle}>
      <div className="sbm-bar" style={barStyle}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="sbm-seg"
            style={{ width: `${seg.width}%`, background: seg.color }}
          />
        ))}

        {/* Threshold tick marks on the bar's top edge. */}
        {showScale &&
          bounds.map((b, i) => (
            <span key={i} className="sbm-tick" style={{ left: `${pct(b)}%` }} />
          ))}

        {/* Value marker (needle). */}
        {hasValue && (
          <div
            className={`sbm-needle${outOfRange ? " oor" : ""}`}
            style={{ left: `${valuePos}%` }}
            role="img"
            aria-label={`${valueName}: ${valueText}`}
          >
            <span className="sbm-needle-core" style={{ background: coreColor }} />
          </div>
        )}
      </div>

      {/* Value pill, horizontally aligned to the needle. */}
      {showValueLabel && (
        <div className="sbm-value-row">
          {hasValue ? (
            <div className="sbm-value" style={{ left: `${valuePos}%` }}>
              <span className="sbm-value-text">{valueText}</span>
            </div>
          ) : (
            <div className="sbm-value sbm-value-static">
              <span className="sbm-value-text muted">No value</span>
            </div>
          )}
        </div>
      )}

      {/* Scale: min / thresholds / max. */}
      {showScale && (
        <div className="sbm-scale-row">
          <span className="sbm-scale-label sbm-scale-min" style={{ left: "0%" }}>
            {formatNumber(min, decimals)}
          </span>
          {bounds.map((b, i) => (
            <span
              key={i}
              className="sbm-scale-label sbm-scale-mid"
              style={{ left: `${pct(b)}%` }}
            >
              {formatNumber(b, decimals)}
            </span>
          ))}
          <span className="sbm-scale-label sbm-scale-max" style={{ left: "100%" }}>
            {formatNumber(max, decimals)}
          </span>
        </div>
      )}
    </div>
  );
}
