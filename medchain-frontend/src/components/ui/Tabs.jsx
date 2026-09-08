export default function Tabs({ items, active, onChange }) {
  return (
    <div className="flex gap-6 border-b border-border">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`pb-3 text-body font-medium border-b-2 -mb-px transition-colors ${
            active === item
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
