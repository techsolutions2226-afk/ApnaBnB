import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiTrash2 } from "react-icons/fi";
import { useMyMatches } from "../../hooks/useMatches";
import useViewRole from "../../hooks/useViewRole";
import matchService from "../../services/matchService";
import ConfirmDialog from "../common/ConfirmDialog";
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
  const { viewRole } = useViewRole();
  const { matches, isLoading, error, refetch } = useMyMatches(viewRole);

  // Match queued for deletion (drives the confirm dialog).
  const [matchToDelete, setMatchToDelete] = useState(null);
  // Ids removed this session — hidden immediately for a snappy feel, so the
  // card disappears the instant the delete succeeds without a full reload.
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const title = "Recent Matches";

  const requestDelete = (e, match) => {
    // The card is a Link — don't navigate when the trash icon is clicked.
    e.preventDefault();
    e.stopPropagation();
    setDeleteError(null);
    setMatchToDelete(match);
  };

  const confirmDelete = async () => {
    if (!matchToDelete) return;
    const id = matchToDelete._id;
    setDeleting(true);
    setDeleteError(null);
    try {
      await matchService.remove(id);
      setRemovedIds((prev) => new Set(prev).add(id));
      setMatchToDelete(null);
      // Re-sync with the server in the background (keeps counts elsewhere honest).
      refetch?.();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete match.");
    } finally {
      setDeleting(false);
    }
  };

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

  const all = (matches || []).filter((m) => !removedIds.has(m._id));
  const visible = all.slice(0, limit);

  return (
    <div className="dash-section">
      <SectionHeader
        title={title}
        to={all.length > 0 ? "/matches" : undefined}
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
              <Link
                key={match._id}
                to="/matches"
                className="rm-card"
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  className="rm-delete-btn"
                  title="Delete match"
                  aria-label="Delete match"
                  onClick={(e) => requestDelete(e, match)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    color: "#9aa4ae",
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fdecec";
                    e.currentTarget.style.color = "#d33";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#9aa4ae";
                  }}
                >
                  <FiTrash2 size={15} />
                </button>

                <div className="rm-card-top">
                  <div className="rm-card-main">
                    <div className="rm-card-title">
                      {property.title || "Untitled property"}
                    </div>
                    {location && <div className="rm-card-loc">{location}</div>}
                  </div>
                  <span
                    className={matchTypeClass(match.type)}
                    style={{ marginRight: 32 }}
                  >
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

      <ConfirmDialog
        isOpen={!!matchToDelete}
        onClose={() => {
          if (!deleting) {
            setMatchToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Delete this match?"
        message={
          deleteError ? (
            <span style={{ color: "#d33" }}>{deleteError}</span>
          ) : (
            "This removes the match for both parties and cannot be undone."
          )
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
        icon="🗑️"
      />
    </div>
  );
};

export default RecentMatches;
