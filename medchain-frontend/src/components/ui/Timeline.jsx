// Renders a vertical chain-of-custody timeline. Each step is one of:
// "done" (filled navy), "current" (filled amber), "pending" (hollow gray).
export default function Timeline({ steps }) {
  return (
    <ol className="relative pl-8">
      <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-border" />
      {steps.map((step, i) => (
        <li key={i} className="relative pb-8 last:pb-0">
          <span
            className={`absolute -left-8 top-0.5 w-4 h-4 rounded-full border-2 ${
              step.state === "done"
                ? "bg-primary border-primary"
                : step.state === "current"
                ? "bg-warning border-warning"
                : "bg-surface border-border"
            }`}
          />
          <p className="text-h3 text-ink">{step.title}</p>
          {step.timestamp && (
            <p className="text-small font-mono text-ink-muted mt-0.5">{step.timestamp}</p>
          )}
          {step.description && (
            <p className="text-small text-ink-muted mt-1">{step.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
