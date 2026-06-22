interface EmptyStateProps {
  hasSource: boolean;
  hasCountry: boolean;
  hasMetric: boolean;
}

/** Setup instructions shown until the plugin has everything it needs to render. */
export default function EmptyState({ hasSource, hasCountry, hasMetric }: EmptyStateProps) {
  const steps: Array<{ done: boolean; text: string }> = [
    { done: hasSource, text: "Pick a Data source element" },
    { done: hasCountry, text: "Assign a Country dimension (names or ISO codes)" },
    { done: hasMetric, text: "Assign a Color metric (a measure)" },
  ];

  return (
    <div className="empty-state">
      <div className="empty-card">
        <div className="empty-globe" aria-hidden>🌍</div>
        <h2>3D Globe</h2>
        <p>Configure the plugin in the editor panel on the right:</p>
        <ul className="empty-steps">
          {steps.map((s, i) => (
            <li key={i} className={s.done ? "done" : ""}>
              <span className="check">{s.done ? "✓" : "•"}</span>
              {s.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
