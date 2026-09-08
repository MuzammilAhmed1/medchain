const variants = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-border disabled:text-ink-faint",
  secondary:
    "border border-primary text-primary bg-transparent hover:bg-primary-tint disabled:border-border disabled:text-ink-faint",
  ghost:
    "text-primary bg-transparent hover:bg-primary-tint disabled:text-ink-faint",
  danger:
    "bg-danger text-white hover:bg-danger-text active:bg-danger-text disabled:bg-border disabled:text-ink-faint",
  accent:
    "bg-accent text-white hover:bg-accent-hover disabled:bg-border disabled:text-ink-faint",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const sizes = {
    sm: "h-8 px-3 text-small",
    md: "h-10 px-4 text-body",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xs font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
