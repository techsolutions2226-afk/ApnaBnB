export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 bg-slate-200 rounded-md animate-pulse"
          style={{ width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "md", className = "" }) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-slate-200 animate-pulse shrink-0 ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs ${className}`}>
      <div className="aspect-[4/3] bg-slate-200 rounded-lg animate-pulse mb-3" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonStat({ className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-3.5 w-20 bg-slate-200 rounded-md animate-pulse" />
        <div className="h-9 w-9 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="h-7 w-28 bg-slate-200 rounded-md animate-pulse mb-1.5" />
      <div className="h-3 w-16 bg-slate-100 rounded-md animate-pulse" />
    </div>
  );
}

export default function Skeleton({ variant = "text", ...props }) {
  const components = {
    text: SkeletonText,
    avatar: SkeletonAvatar,
    card: SkeletonCard,
    stat: SkeletonStat,
  };
  const Component = components[variant] || SkeletonText;
  return <Component {...props} />;
}
