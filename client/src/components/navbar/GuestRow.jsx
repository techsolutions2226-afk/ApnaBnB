import { FiMinus, FiPlus } from "react-icons/fi";

/* ─── Guest Counter Row ─── */
function GuestRow({ label, sublabel, count, onInc, onDec, minVal = 0, link }) {
  return (
    <div className="guest-row">
      <div className="guest-info">
        <span className="guest-label">{label}</span>
        <span className="guest-sub">{sublabel}</span>
        {link && (
          <a href="#" className="guest-link">
            {link}
          </a>
        )}
      </div>
      <div className="guest-counter">
        <button
          type="button"
          className={`guest-btn ${count <= minVal ? "guest-btn--disabled" : ""}`}
          onClick={() => count > minVal && onDec()}
          disabled={count <= minVal}
        >
          <FiMinus size={14} />
        </button>
        <span className="guest-count">{count}</span>
        <button type="button" className="guest-btn" onClick={onInc}>
          <FiPlus size={14} />
        </button>
      </div>
    </div>
  );
}

export function buildGuestSummary(adults, children, infants, pets) {
  const parts = [];
  const guests = adults + children;
  if (guests > 0) parts.push(`${guests} guest${guests !== 1 ? "s" : ""}`);
  if (infants > 0) parts.push(`${infants} infant${infants !== 1 ? "s" : ""}`);
  if (pets > 0) parts.push(`${pets} pet${pets !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

export default GuestRow;
