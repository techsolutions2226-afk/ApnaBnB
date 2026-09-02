const colorMap = {
  primary: "bg-primary-50 text-primary-700",
  success: "bg-accent-50 text-accent-700",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-700",
  neutral: "bg-slate-100 text-slate-600",
};

const dotColorMap = {
  primary: "bg-primary-500",
  success: "bg-accent-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  neutral: "bg-slate-400",
};

export default function Badge({
  children,
  color = "neutral",
  dot = false,
  size = "sm",
  className = "",
}) {
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${colorMap[color]}
        ${sizeClasses[size]}
        ${className}
      `.trim()}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColorMap[color]}`} />
      )}
      {children}
    </span>
  );
}
