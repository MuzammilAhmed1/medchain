export default function Input({ label, error, hint, className = "", id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`h-10 rounded-xs border px-3 text-body text-ink bg-surface placeholder:text-ink-faint
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          disabled:bg-canvas disabled:text-ink-faint
          ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-small text-danger">{error}</p>
      ) : hint ? (
        <p className="text-small text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
