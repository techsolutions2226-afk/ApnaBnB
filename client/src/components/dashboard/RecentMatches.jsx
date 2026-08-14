import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { useMyMatches } from "../../hooks/useMatches";
import SectionHeader from "./SectionHeader";

/* Human-readable relationship labels per match type — same naming the
   backend uses on Match.type. */
const TYPE_LABELS = {
  "seller-buyer": "Seller ↔ Buyer",
  "dealer-buyer": "Dealer ↔ Buyer",
  "dealer-dealer": "Dealer ↔ Dealer",
  "seller-dealer": "Seller ↔ Dealer",
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

const matchTypeClass = (type) => {
  switch (type) {
    case "seller-buyer":
      return "rm-type rm-type--sb";
    case "dealer-buyer":
      return "rm-type rm-type--db";
    case "dealer-dealer":
      return "rm-type rm-type--dd";
    case "seller-dealer":
      return "rm-type rm-type--sd";
    default:
      return "rm-type";
  }
};

/** Recent matches summary block.
 *  Pass `limit` to cap how many cards render (default 5).
 *  Pass `emptyMessage` to customise the empty-state copy per role. */
const RecentMatches = ({ limit = 5, emptyMessage }) => {
  const { matches, isLoading, error } = useMyMatches();

  const title = "Recent Matches";

  if (isLoading) {
    return (
      <div className="dash-section">
        <SectionHeader title={title} />
        <div className="rm-loading">Loading matches…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-section">
        <SectionHeader title={title} />
        <div className="rm-error">Failed to load matches: {error}</div>
      </div>
    );
  }

  const visible = (matches || []).slice(0, limit);

  return (
    <div className="dash-section">
      <SectionHeader
        title={title}
        to={matches?.length > 0 ? "/matches" : undefined}
        actionIcon={FiArrowRight}
      />

      {visible.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">🔗</div>
          <p className="dash-empty-text">
            {emptyMessage ||
              "No matches yet. Matches appear automatically when your listings or requirements line up with the platform."}
          </p>
        </div>
      ) : (
        <div className="rm-list">
          {visible.map((match) => {
            const property = match.property || {};
            const requirement = match.requirement || {};
            const location = [
              property.location?.area,
              property.location?.city,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <Link key={match._id} to="/matches" className="rm-card">
                <div className="rm-card-top">
                  <div className="rm-card-main">
                    <div className="rm-card-title">
                      {property.title || "Untitled property"}
                    </div>
                    {location && <div className="rm-card-loc">{location}</div>}
                  </div>
                  <span className={matchTypeClass(match.type)}>
                    {TYPE_LABELS[match.type] || match.type}
                  </span>
                </div>

                <div className="rm-card-meta">
                  <span>
                    <strong>Price:</strong> {formatPrice(property.price)}
                  </span>
                  <span>
                    <strong>Budget:</strong> {formatBudget(requirement.budget)}
                  </span>
                  <span>
                    <strong>Score:</strong>{" "}
                    <span className="rm-score">
                      {Math.round(match.score || 0)}%
                    </span>
                  </span>
                </div>

                {match.aiReason && (
                  <div className="rm-ai">
                    <span className="rm-ai-badge">AI</span>
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