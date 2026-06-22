import type { LegendEntry } from "../lib/color";

interface LegendProps {
  title: string;
  entries: LegendEntry[];
  showNoData: boolean;
  noDataColor: string;
}

/** Stepped legend matching the discrete color buckets. */
export default function Legend({ title, entries, showNoData, noDataColor }: LegendProps) {
  if (entries.length === 0) return null;
  return (
    <div className="legend">
      <div className="legend-title" title={title}>
        {title}
      </div>
      {entries.map((e, i) => (
        <div className="legend-row" key={i}>
          <span className="legend-swatch" style={{ background: e.color }} />
          <span className="legend-label">{e.label}</span>
        </div>
      ))}
      {showNoData && (
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: noDataColor }} />
          <span className="legend-label">No data</span>
        </div>
      )}
    </div>
  );
}
