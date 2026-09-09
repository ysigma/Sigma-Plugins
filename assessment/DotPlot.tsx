import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";

export interface DotRow {
  /** Display label shown on the left (Y axis). */
  platform: string;
  /** Normalized stage key used to find the column, or null if unplaced. */
  stageKey: string | null;
  /** Stage label for the tooltip (raw display value). */
  stageLabel: string | null;
}

export interface StageColumn {
  key: string;
  label: string;
}

interface DotPlotProps {
  rows: DotRow[];
  stages: StageColumn[];
  /** Resolved circle color (palette swatch or custom override). */
  color: string;
  /** Circle radius in px. */
  radius: number;
  theme: "dark" | "light";
  showGrid: boolean;
  getTooltipHtml: (row: DotRow) => string;
}

/** Track an element's pixel size with a ResizeObserver. */
function useSize(): [RefObject<HTMLDivElement>, { w: number; h: number }] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

const PAD_RIGHT = 24;
const AXIS_H = 34; // bottom strip that holds the (pinned) stage labels
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function truncate(text: string, maxChars: number): string {
  if (maxChars <= 1) return "…";
  return text.length > maxChars ? text.slice(0, maxChars - 1).trimEnd() + "…" : text;
}

export default function DotPlot({
  rows,
  stages,
  color,
  radius,
  theme,
  showGrid,
  getTooltipHtml,
}: DotPlotProps) {
  const [ref, { w, h }] = useSize();
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);

  const dark = theme === "dark";
  const nRows = Math.max(rows.length, 1);
  const nStages = Math.max(stages.length, 1);

  // Horizontal layout (shared by the scrolling body and the pinned axis strip
  // so columns line up exactly).
  const labelGutter = clamp(w * 0.3, 84, 220);
  const plotLeft = labelGutter;
  const plotRight = Math.max(plotLeft + 1, w - PAD_RIGHT);
  const plotW = plotRight - plotLeft;
  const colX = (i: number) => plotLeft + (plotW * (i + 0.5)) / nStages;
  const colIndex = new Map(stages.map((s, i) => [s.key, i]));

  // Vertical layout. Rows fill the available height; if that would make them
  // tighter than minRow (many platforms in a short tile, or a large dot), the
  // body grows taller than the viewport and scrolls — the axis stays pinned.
  const minRow = Math.max(20, radius * 2 + 8);
  const availBodyH = Math.max(h - AXIS_H, minRow);
  const bodyH = Math.max(availBodyH, nRows * minRow);
  const rowGap = bodyH / nRows;
  const rowY = (i: number) => rowGap * (i + 0.5);

  const rowFont = clamp(rowGap * 0.42, 9, 13);
  const rowMaxChars = Math.floor((labelGutter - 14) / (rowFont * 0.58));
  const axisFont = 12;
  const colBand = plotW / nStages;
  const axisMaxChars = Math.floor((colBand - 8) / (axisFont * 0.56));

  const gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(20,40,80,0.08)";
  const axisColor = dark ? "rgba(255,255,255,0.2)" : "rgba(20,40,80,0.18)";
  const labelColor = dark ? "#d6dae2" : "#3a4654";
  const dotStroke = dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.85)";

  const showTip = (e: ReactMouseEvent, row: DotRow) => {
    const host = ref.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 12, html: getTooltipHtml(row) });
  };

  const tipStyle: CSSProperties = tip
    ? { left: clamp(tip.x, 4, Math.max(4, w - 220)), top: clamp(tip.y, 4, Math.max(4, h - 8)) }
    : {};

  return (
    <div className="adp-plot" ref={ref}>
      <div className="adp-body">
        <svg width={w} height={bodyH} role="img" aria-label="Assessment stage by platform">
          {/* Vertical column gridlines */}
          {showGrid &&
            stages.map((s, i) => (
              <line
                key={`v-${s.key}`}
                x1={colX(i)}
                x2={colX(i)}
                y1={4}
                y2={bodyH - 4}
                stroke={gridColor}
                strokeWidth={1}
              />
            ))}

          {/* One row per platform: faint baseline, label, and (if placed) a dot */}
          {rows.map((row, i) => {
            const y = rowY(i);
            const ci = row.stageKey != null ? colIndex.get(row.stageKey) : undefined;
            return (
              <g key={`${row.platform}-${i}`}>
                {showGrid && (
                  <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={y}
                    y2={y}
                    stroke={gridColor}
                    strokeWidth={1}
                  />
                )}
                <text
                  x={plotLeft - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={rowFont}
                  fill={labelColor}
                >
                  {truncate(row.platform, rowMaxChars)}
                  <title>{row.platform}</title>
                </text>
                {ci !== undefined && (
                  <circle
                    cx={colX(ci)}
                    cy={y}
                    r={radius}
                    fill={color}
                    stroke={dotStroke}
                    strokeWidth={1}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => showTip(e, row)}
                    onMouseMove={(e) => showTip(e, row)}
                    onMouseLeave={() => setTip(null)}
                  >
                    <title>{`${row.platform} — ${row.stageLabel ?? ""}`}</title>
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Pinned x-axis: stage labels, aligned to the same column centers */}
      <div className="adp-axis" style={{ height: AXIS_H }}>
        <svg width={w} height={AXIS_H}>
          <line x1={plotLeft} x2={plotRight} y1={0.5} y2={0.5} stroke={axisColor} strokeWidth={1} />
          {stages.map((s, i) => (
            <g key={`x-${s.key}`}>
              <line x1={colX(i)} x2={colX(i)} y1={0} y2={5} stroke={axisColor} strokeWidth={1} />
              <text
                x={colX(i)}
                y={AXIS_H / 2 + 3}
                textAnchor="middle"
                fontSize={axisFont}
                fontWeight={600}
                fill={labelColor}
              >
                {truncate(s.label, axisMaxChars)}
                <title>{s.label}</title>
              </text>
            </g>
          ))}
        </svg>
      </div>

      {tip && (
        <div
          className={`adp-tooltip ${dark ? "dark" : "light"}`}
          style={tipStyle}
          dangerouslySetInnerHTML={{ __html: tip.html }}
        />
      )}
    </div>
  );
}
