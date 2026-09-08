export default function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-body text-ink-muted">{label}</p>
    </div>
  );
}
