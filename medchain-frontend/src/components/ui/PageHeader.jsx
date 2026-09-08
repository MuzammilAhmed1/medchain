export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-h2 text-ink">{title}</h1>
        {description && <p className="text-body text-ink-muted mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
