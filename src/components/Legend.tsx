import type { LegendEntry } from "../lib/color";

interface LegendProps {
  title?: string;
  entries: LegendEntry[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}

/**
 * Legend as a single contiguous bar along the bottom: one distinct color
 * section per category/bucket, with labels beneath. Click a section to filter
 * the globe to it.
 */
export default function Legend({ title, entries, selectedKey = null, onSelect }: LegendProps) {
  if (entries.length === 0) return null;
  return (
    <div className="legend-bar">
      {title && <div className="legend-title">{title}</div>}
      <div className="legend-blocks">
        {entries.map((e) => (
          <button
            key={e.key}
            type="button"
            className={`legend-col ${selectedKey && selectedKey !== e.key ? "dim" : ""} ${
              selectedKey === e.key ? "sel" : ""
            }`}
            onClick={() => onSelect?.(e.key)}
            title="Click to filter the globe to this category"
          >
            <span className="legend-block" style={{ background: e.color }} />
            <span className="legend-col-label">{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
