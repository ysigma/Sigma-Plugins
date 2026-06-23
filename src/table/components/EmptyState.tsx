interface Step {
  label: string;
  done: boolean;
}

export default function EmptyState({ steps }: { steps: Step[] }) {
  return (
    <div className="mbt-empty">
      <div className="mbt-empty-card">
        <h2>Mini Bar Table</h2>
        <p>Configure the plugin to get started:</p>
        <ul className="mbt-empty-steps">
          {steps.map((s, i) => (
            <li key={i} className={s.done ? "done" : ""}>
              <span className="check">{s.done ? "✓" : i + 1}</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
