export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`bg-surface border border-border rounded-md p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between border-b border-border pb-4 mb-4">
      <div>
        <h3 className="text-h3 text-ink">{title}</h3>
        {subtitle && <p className="text-small text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
