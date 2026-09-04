import { AiFillStar } from "react-icons/ai";
import { FiShield, FiPhone } from "react-icons/fi";
import { formatPrice } from "../../utils/formatters";

/* Sidebar card on a property page: price, rating, and the call-to-action that
   leads to the lister. Contact details are never rendered here — the button
   hands off to PropertyDetail, which routes to the owner profile or to /plans
   depending on whether the viewer holds one. */
const InquiryCard = ({ property, onMessage }) => {
  const { price, rating, reviews, listedBy, purpose } = property || {};

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (typeof onMessage === "function") onMessage();
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

      <button type="button" className="rv-card-btn" onClick={handleSubmit}>
        <FiPhone size={17} />
        Get contact info
      </button>

      <p className="rv-card-note">
        Phone and email are shown to members on an active plan.
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
