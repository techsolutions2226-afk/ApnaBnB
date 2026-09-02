const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const bgColors = [
  "bg-primary-100 text-primary-700",
  "bg-accent-100 text-accent-700",
  "bg-warning-100 text-warning-600",
  "bg-danger-100 text-danger-700",
  "bg-slate-200 text-slate-600",
];

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColorFromName(name) {
  if (!name) return bgColors[4];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgColors[Math.abs(hash) % bgColors.length];
}

export default function Avatar({
  src,
  alt = "",
  name,
  size = "md",
  className = "",
}) {
  const sizeClass = sizeMap[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || "Avatar"}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold shrink-0 ${getColorFromName(name)} ${className}`}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
