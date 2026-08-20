/* DealRoomPanel — the header of a match-linked Deal Room.
 *
 * Shows the deal context (property ↔ requirement + score + status), reveals the
 * counterpart's contact once the match is accepted, lets a party mark the deal
 * closed, and prompts both sides to rate each other after closing.
 */
import { useEffect, useState } from "react";
import { FiPhone, FiMail, FiUser, FiLock, FiCheckCircle, FiStar, FiChevronDown } from "react-icons/fi";
import { toast } from "react-toastify";
import matchService from "../../services/matchService";
import reviewService from "../../services/reviewService";
import { formatPrice } from "../../utils/formatters";

const STATUS_BADGE = {
  pending: { bg: "#fff8e1", color: "#8d6e00", label: "Pending" },
  accepted: { bg: "#e6f4ea", color: "#1e7e34", label: "Accepted" },
  closed: { bg: "#eef2f7", color: "var(--brand-navy, #1a3d5c)", label: "Closed" },
  rejected: { bg: "#fdecea", color: "#c62828", label: "Rejected" },
};

const partyIds = (match) => ({
  ownerId: match?.property?.listedBy?._id || match?.property?.listedBy || null,
  seekerId: match?.requirement?.requiredBy?._id || match?.requirement?.requiredBy || null,
});

const DealRoomPanel = ({ match, currentUser, onMatchChange }) => {
  const [contact, setContact] = useState(null);
  const [closing, setClosing] = useState(false);
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(false);
  const [rated, setRated] = useState(false);
  const [expanded, setExpanded] = useState(false); // collapsed by default — compact summary

  const status = match?.status || "pending";
  const revealed = status === "accepted" || status === "closed";

  const { ownerId, seekerId } = partyIds(match);
  const counterpartId = ownerId && ownerId !== currentUser?.id ? ownerId : seekerId;

  // Fetch the counterpart's contact once the match is accepted/closed.
  useEffect(() => {
    let cancelled = false;
    if (!revealed || !match?._id) {
      setContact(null);
      return;
    }
    matchService
      .getContact(match._id)
      .then((res) => { if (!cancelled && res?.revealed) setContact(res.contact); })
      .catch(() => { /* stays locked */ });
    return () => { cancelled = true; };
  }, [revealed, match?._id]);

  const property = match?.property || {};
  const requirement = match?.requirement || {};
  const badge = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const loc = [property.location?.area, property.location?.city].filter(Boolean).join(", ");

  const handleClose = async () => {
    setClosing(true);
    try {
      await matchService.updateStatus(match._id, "closed");
      onMatchChange?.({ status: "closed" });
      toast.success("Deal marked as closed. You can now rate your counterpart.");
    } catch (e) {
      toast.error(e.message || "Could not close the deal.");
    } finally {
      setClosing(false);
    }
  };

  const handleRate = async () => {
    if (!stars) { toast.info("Pick a star rating first."); return; }
    if (!counterpartId) { toast.error("Counterpart not found."); return; }
    setRating(true);
    try {
      await reviewService.create({
        target: counterpartId,
        targetType: "user",
        rating: stars,
        comment: comment.trim(),
      });
      setRated(true);
      toast.success("Thanks for rating your counterpart!");
    } catch (e) {
      if (/already reviewed/i.test(e.message || "")) {
        setRated(true);
        toast.info("You've already rated this person.");
      } else {
        toast.error(e.message || "Could not submit rating.");
      }
    } finally {
      setRating(false);
    }
  };

  return (
    <div className="deal-panel">
      {/* Compact summary header — always visible; click to expand full details */}
      <div
        className="deal-panel-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="deal-panel-head-main">
          <div className="deal-panel-title-row">
            <span className="deal-panel-eyebrow">DEAL ROOM</span>
            <span className="deal-panel-badge" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
            <span className="deal-panel-score">{Math.round(match?.score || 0)}% match</span>
          </div>
          <div className="deal-panel-summary-line">
            <strong>{property.title || "Property"}</strong>
            {property.price ? <span> · PKR {formatPrice(property.price)}</span> : null}
            {loc ? <span className="deal-panel-summary-loc"> · {loc}</span> : null}
          </div>
        </div>
        <FiChevronDown
          className={`deal-panel-caret${expanded ? " deal-panel-caret--open" : ""}`}
          size={20}
          aria-hidden="true"
        />
      </div>

      {/* Expandable full property + owner/contact details */}
      {expanded && (
        <div className="deal-panel-details">
          <div className="deal-panel-req">
            Needs: {requirement.title || requirement.propertyType || "—"}
          </div>

          {/* Contact reveal */}
          <div className="deal-panel-contact">
            {revealed ? (
              contact ? (
                <>
                  <span className="deal-panel-contact-head">
                    <FiCheckCircle size={14} /> Contact revealed
                  </span>
                  <div className="deal-panel-contact-rows">
                    <span><FiUser size={13} /> {contact.name || "—"}</span>
                    {contact.phone && <span><FiPhone size={13} /> {contact.phone}</span>}
                    {contact.email && <span><FiMail size={13} /> {contact.email}</span>}
                  </div>
                </>
              ) : (
                <span className="deal-panel-contact-head">Loading contact…</span>
              )
            ) : (
              <span className="deal-panel-locked">
                <FiLock size={13} /> Contact details unlock once the match is accepted.
              </span>
            )}
          </div>

          {/* Actions */}
          {status === "accepted" && (
            <div className="deal-panel-actions">
              <button type="button" className="deal-panel-btn" disabled={closing} onClick={handleClose}>
                {closing ? "Closing…" : "Mark deal as closed"}
              </button>
            </div>
          )}

          {status === "closed" && !rated && (
            <div className="deal-panel-rate">
              <span className="deal-panel-rate-label">Rate your counterpart:</span>
              <div className="deal-panel-stars" onMouseLeave={() => setHoverStars(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="deal-panel-star"
                    onMouseEnter={() => setHoverStars(n)}
                    onClick={() => setStars(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <FiStar
                      size={20}
                      fill={(hoverStars || stars) >= n ? "#f5a623" : "none"}
                      color={(hoverStars || stars) >= n ? "#f5a623" : "#bbb"}
                    />
                  </button>
                ))}
              </div>
              <input
                className="deal-panel-comment"
                placeholder="Add a short comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
              />
              <button type="button" className="deal-panel-btn" disabled={rating} onClick={handleRate}>
                {rating ? "Submitting…" : "Submit rating"}
              </button>
            </div>
          )}

          {status === "closed" && rated && (
            <div className="deal-panel-rated"><FiCheckCircle size={14} /> Thanks — your rating is in.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DealRoomPanel;
