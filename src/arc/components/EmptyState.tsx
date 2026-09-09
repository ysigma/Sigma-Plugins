export interface SetupStep {
  label: string;
  done: boolean;
}

interface EmptyStateProps {
  steps: SetupStep[];
}

/** Setup instructions shown until the plugin has the columns it needs. */
export default function EmptyState({ steps }: EmptyStateProps) {
  return (
    <div className="tam-empty">
      <div className="tam-empty-card">
        <div className="tam-empty-icon" aria-hidden>
          🎯
        </div>
        <h2>Global Threat-Origin Arc Map</h2>
        <p>Configure the plugin in the editor panel on the right:</p>
        <ul className="tam-empty-steps">
          {steps.map((s, i) => (
            <li key={i} className={s.done ? "done" : ""}>
              <span className="tam-check">{s.done ? "✓" : "•"}</span>
              {s.label}
            </li>
          ))}
        </ul>
        <p className="tam-empty-hint">
          Destination coordinates are optional — without them every arc flows to
          your default destination (Riyadh, Saudi Arabia).
        </p>
      </div>
    </div>
  );
}
