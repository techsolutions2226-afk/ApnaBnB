import { Link } from "react-router-dom";
import { useMyMatches } from "../../hooks/useMatches";

/* Human-readable relationship labels per match type — same naming the
   backend uses on Match.type. */
const TYPE_LABELS = {
  "seller-buyer": "Seller ↔ Buyer",
  "dealer-buyer": "Dealer ↔ Buyer",
  "dealer-dealer": "Dealer ↔ Dealer",
  "seller-dealer": "Seller ↔ Dealer",
};

/* Pill colours per match type — distinct hue per relationship so users
   recognise the role pairing at a glance. */
const TYPE_STYLES = {
  "seller-buyer": { bg: "#e6f4ea", color: "#1e7e34" },
  "dealer-buyer": { bg: "#e3f2fd", color: "#1565c0" },
  "dealer-dealer": { bg: "#f3e5f5", color: "#6a1b9a" },
  "seller-dealer": { bg: "#fff3e0", color: "#e65100" },
};

const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(Number(price))) return "—";
  return `PKR ${Number(price).toLocaleString()}`;
};

const formatBudget = (budget) => {
  if (!budget) return "—";
  const { min, max } = budget;
  if (min && max) {
    return `PKR ${Number(min).toLocaleString()} – ${Number(max).toLocaleString()}`;
  }
  if (max) return `Up to PKR ${Number(max).toLocaleString()}`;
  if (min) return `From PKR ${Number(min).toLocaleString()}`;
  return "—";
};

/** Recent matches summary block.
 *  Pass `limit` to cap how many cards render (default 5).
 *  Pass `emptyMessage` to customise the empty-state copy per role. */
const RecentMatches = ({ limit = 5, emptyMessage }) => {
  const { matches, isLoading, error } = useMyMatches();

  if (isLoading) {
    return (
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Recent Matches</h2>
        </div>
        <div style={{ padding: 16, color: "#717171", fontSize: 14 }}>
          Loading matches…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Recent Matches</h2>
        </div>
        <div style={{ padding: 16, color: "#d32f2f", fontSize: 14 }}>
          Failed to load matches: {error}
        </div>
      </div>
    );
  }

  const visible = (matches || []).slice(0, limit);

  return (
    <div className="dash-section">
      <div className="dash-section-header">
        <h2 className="dash-section-title">Recent Matches</h2>
        {matches?.length > 0 && (
          <Link to="/matches" className="dash-section-link">
            View all
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">🔗</div>
          <p className="dash-empty-text">
            {emptyMessage ||
              "No matches yet. Matches appear automatically when your listings or requirements line up with the platform."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((match) => {
            const typeLabel = TYPE_LABELS[match.type] || match.type;
            const typeStyle =
              TYPE_STYLES[match.type] || { bg: "#eee", color: "#222" };
            const property = match.property || {};
            const requirement = match.requirement || {};
            const location = [
              property.location?.area,
              property.location?.city,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <Link
                key={match._id}
                to="/matches"
                style={{
                  display: "block",
                  padding: 16,
                  background: "#fff",
                  border: "1px solid #ebebeb",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#bdbdbd";
                  e.currentTarget.style.boxShadow =
                    "0 2px 6px rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#ebebeb";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#222",
                        fontSize: 15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {property.title || "Untitled property"}
                    </div>
                    {location && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#717171",
                          marginTop: 2,
                        }}
                      >
                        {location}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: typeStyle.bg,
                      color: typeStyle.color,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {typeLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px 16px",
                    fontSize: 13,
                    color: "#555",
                  }}
                >
                  <span>
                    <strong style={{ color: "#222" }}>Price:</strong>{" "}
                    {formatPrice(property.price)}
                  </span>
                  <span>
                    <strong style={{ color: "#222" }}>Budget:</strong>{" "}
                    {formatBudget(requirement.budget)}
                  </span>
                  <span>
                    <strong style={{ color: "#222" }}>Score:</strong>{" "}
                    {Math.round(match.score || 0)}%
                  </span>
                </div>

                {match.aiReason && (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      fontSize: 12,
                      color: "#3b4252",
                      background: "#f3f6fb",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "#135332",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        marginTop: 1,
                      }}
                    >
                      AI
                    </span>
                    <span>{match.aiReason}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentMatches;
