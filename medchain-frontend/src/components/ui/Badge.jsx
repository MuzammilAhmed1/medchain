const styles = {
  neutral: "bg-neutralBadge-tint text-neutralBadge-text",
  info: "bg-teal-tint text-teal-text",
  success: "bg-success-tint text-success-text",
  warning: "bg-warning-tint text-warning-text",
  danger: "bg-danger-tint text-danger-text",
};

const statusTone = {
  CREATED: "neutral",
  IN_TRANSIT: "warning",
  RECEIVED: "info",
  VERIFIED: "success",
  RECALLED: "danger",
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

export default function Badge({ status, tone, children }) {
  const resolved = tone || statusTone[status] || "neutral";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-label ${styles[resolved]}`}
    >
      {children || status}
    </span>
  );
}
