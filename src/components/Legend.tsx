import type { LegendEntry } from "../lib/color";

interface LegendProps {
  title: string;
  entries: LegendEntry[];
}

/** Stepped legend matching the discrete color buckets / tier categories. */
export default function Legend({ title, entries }: LegendProps) {
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
    </div>
  );
}
