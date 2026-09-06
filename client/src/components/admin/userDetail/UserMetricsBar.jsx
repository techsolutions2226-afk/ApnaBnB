import { FiHome, FiFileText, FiMapPin, FiLink, FiStar } from "react-icons/fi";

const METRICS = [
  { key: "listings", label: "Total Listings", icon: FiHome },
  { key: "activeRequirements", label: "Active Requirements", icon: FiFileText },
  { key: "visits", label: "Property Visits", icon: FiMapPin },
  { key: "matches", label: "Matches", icon: FiLink },
  { key: "reviews", label: "Reviews", icon: FiStar },
];

/** Metrics bar — five quick counters above the tabbed sections. */
export default function UserMetricsBar({ counts = {} }) {
  return (
    <div className="aud-metrics" role="group" aria-label="User metrics">
      {METRICS.map(({ key, label, icon: Icon }) => (
        <div className="aud-metric" key={key}>
          <div className="aud-metric-icon">
            <Icon size={18} aria-hidden="true" />
          </div>
          <div className="aud-metric-body">
            <div className="aud-metric-value">{counts[key] ?? 0}</div>
            <div className="aud-metric-label">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
