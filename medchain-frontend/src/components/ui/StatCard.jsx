export default function StatCard({ label, value, tone = "default" }) {
  const toneText = {
    default: "text-ink",
    success: "text-success-text",
    warning: "text-warning-text",
    danger: "text-danger-text",
  };
  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <p className="text-label text-ink-muted">{label}</p>
      <p className={`text-h1 mt-1 ${toneText[tone]}`}>{value}</p>
    </div>
  );
}
