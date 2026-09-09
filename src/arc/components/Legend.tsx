export interface LegendEntry {
  label: string;
  /** Any CSS colour string. */
  color: string;
  /** Render as a ringed target marker instead of a flow dash. */
  target?: boolean;
}

interface LegendProps {
  entries: LegendEntry[];
}

/** Compact bottom-left legend matching the map's orange flow theme. */
export default function Legend({ entries }: LegendProps) {
  return (
    <div className="tam-legend">
      {entries.map((e, i) => (
        <div className="tam-legend-row" key={i}>
          <span
            className={e.target ? "tam-legend-target" : "tam-legend-dash"}
            style={{ background: e.color }}
          />
          <span className="tam-legend-label">{e.label}</span>
        </div>
      ))}
    </div>
  );
}
