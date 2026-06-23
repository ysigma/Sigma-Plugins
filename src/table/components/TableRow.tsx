interface Props {
  primary: string;
  secondary: string;
  formatted: string;
  proportion: number;
}

export default function TableRow({ primary, secondary, formatted, proportion }: Props) {
  const pct = `${Math.max(0, Math.min(1, proportion)) * 100}%`;
  return (
    <div className="mbt-row">
      <div className="mbt-row-labels">
        <div className="mbt-row-primary" title={primary}>
          {primary}
        </div>
        {secondary && (
          <div className="mbt-row-secondary" title={secondary}>
            {secondary}
          </div>
        )}
      </div>
      <div className="mbt-row-value">
        <div className="mbt-row-number">{formatted}</div>
        <div className="mbt-bar-track">
          <div className="mbt-bar-fill" style={{ width: pct }} />
        </div>
      </div>
    </div>
  );
}
