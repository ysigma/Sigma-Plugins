import type { Status } from "../lib/status";

export interface Cell {
  key: number;
  color: string;
  status: Status;
  title: string;
}

interface Props {
  label: string;
  href: string | null;
  cells: Cell[];
}

export default function StatusRow({ label, href, cells }: Props) {
  return (
    <div className="sst-row">
      <div className="sst-label" title={label}>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ) : (
          label
        )}
      </div>
      <div className="sst-track">
        {cells.map((c) => (
          <div
            key={c.key}
            className={`sst-cell sst-${c.status}`}
            style={{ background: c.color }}
            title={c.title}
          />
        ))}
      </div>
    </div>
  );
}
