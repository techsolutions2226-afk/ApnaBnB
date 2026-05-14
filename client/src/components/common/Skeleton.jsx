import "../../styles/Common.css";

/* Single skeleton block */
export function SkeletonBlock({
  width = "100%",
  height = "16px",
  borderRadius,
  circle = false,
  className = "",
}) {
  return (
    <div
      className={`cm-skeleton ${circle ? "cm-skeleton--circle" : ""} ${className}`}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: borderRadius || undefined,
      }}
    />
  );
}

/* Pre-built property card skeleton */
export default function Skeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="cm-skeleton-card">
          <div className="cm-skeleton cm-skeleton-card-image" />
          <div className="cm-skeleton-card-row">
            <SkeletonBlock width="60%" height="14px" />
            <SkeletonBlock width="15%" height="14px" />
          </div>
          <SkeletonBlock width="40%" height="12px" />
          <SkeletonBlock width="30%" height="14px" />
        </div>
      ))}
    </>
  );
}
