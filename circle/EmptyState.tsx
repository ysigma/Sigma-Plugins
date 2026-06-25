export interface SetupStep {
  label: string;
  done: boolean;
}

interface EmptyStateProps {
  steps: SetupStep[];
}

/** Setup instructions shown until the plugin has everything it needs to render. */
export default function EmptyState({ steps }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-card">
        <div className="empty-icon" aria-hidden>
          ⭕
        </div>
        <h2>Circle Grid</h2>
        <p>Configure the plugin in the editor panel on the right:</p>
        <ul className="empty-steps">
          {steps.map((s, i) => (
            <li key={i} className={s.done ? "done" : ""}>
              <span className="check">{s.done ? "✓" : "•"}</span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
