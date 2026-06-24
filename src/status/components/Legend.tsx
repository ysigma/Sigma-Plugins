import type { Palette, Status } from "../lib/status";
import { STATUS_LABEL } from "../lib/status";

interface Props {
  palette: Palette;
  /** Which states to show (e.g. hide "degraded" when unused). */
  states: Status[];
}

export default function Legend({ palette, states }: Props) {
  return (
    <div className="sst-legend">
      {states.map((s) => (
        <span key={s} className="sst-legend-item">
          <span className="sst-swatch" style={{ background: palette[s] }} />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
