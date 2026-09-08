const bars = {
  info: "border-primary bg-primary-tint text-primary",
  success: "border-success bg-success-tint text-success-text",
  warning: "border-warning bg-warning-tint text-warning-text",
  danger: "border-danger bg-danger-tint text-danger-text",
};

export default function Alert({ tone = "info", title, children }) {
  return (
    <div className={`flex flex-col gap-1 border-l-4 rounded-xs px-4 py-3 ${bars[tone]}`}>
      {title && <p className="text-label">{title}</p>}
      {children && <p className="text-small text-ink">{children}</p>}
    </div>
  );
}
