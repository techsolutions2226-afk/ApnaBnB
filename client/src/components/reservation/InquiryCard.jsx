import { AiFillStar } from "react-icons/ai";
import { FiShield, FiPhone, FiCalendar } from "react-icons/fi";
import { formatPrice } from "../../utils/formatters";

/* Sidebar card on a property page: price, rating, and two CTAs. The primary
   action sends the viewer to the visit page to propose a schedule; the
   secondary "Get contact info" hands off to the owner profile / plans gate,
   as before. Contact details are never rendered here. */
const InquiryCard = ({ property, onMessage, onVisit }) => {
  const { price, rating, reviews, listedBy, purpose } = property || {};

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (typeof onMessage === "function") onMessage();
  };

  const handleVisit = () => {
    if (typeof onVisit === "function") onVisit();
  };

  return (
    <div className="rv-card">
      <div className="rv-card-price">
        <span className="rv-card-amount">
          {formatPrice(price || 0, { prefix: true })}
        </span>
        {purpose === "rent" && <span className="rv-card-per"> / month</span>}
      </div>

      {(rating > 0 || reviews > 0) && (
        <div className="rv-card-rating">
          <AiFillStar size={13} />
          <span>{Number(rating || 0).toFixed(1)}</span>
          <span className="rv-card-dot">·</span>
          <span className="rv-card-reviews">
            {reviews || 0} review{(reviews || 0) !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <button type="button" className="rv-card-btn" onClick={handleVisit}>
        <FiCalendar size={17} />
        Confirm visit
      </button>

      <button
        type="button"
        className="rv-card-btn rv-card-btn--secondary"
        onClick={handleSubmit}
      >
        <FiPhone size={17} />
        Get contact info
      </button>

      <p className="rv-card-note">
        Phone and email are revealed to you and the other side once the visit
        is confirmed by both parties.
      </p>

      {listedBy && (
        <div className="rv-card-verified">
          <FiShield size={14} />
          {listedBy.role === "dealer"
            ? "Verified agent listing"
            : "Verified owner listing"}
        </div>
      )}

      <div className="rv-card-visit-fee">
        <FiShield size={14} />
        ₹200 refundable visit fee — returned if the owner no-shows or the
        listing is fake.
      </div>
    </div>
  );
};

export default InquiryCard;
