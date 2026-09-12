import { AiFillStar } from "react-icons/ai";
import { FiShield, FiPhone, FiCalendar, FiMail } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/formatters";

/* Sidebar card on a property page: price, rating, and CTAs. Owner contact is
   public and rendered inline when present, so the only primary action left is
   the visit flow. */
const InquiryCard = ({ property, contact, onVisit }) => {
  const { price, rating, reviews, listedBy, purpose } = property || {};
  const ownerId = listedBy?._id || property?.listedById;

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

      {(contact?.phone || contact?.email) && (
        <div className="rv-card-contact">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="rv-card-contact-item">
              <FiPhone size={15} /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="rv-card-contact-item">
              <FiMail size={15} /> {contact.email}
            </a>
          )}
        </div>
      )}

      <p className="rv-card-note">
        Feel free to contact the owner directly or confirm a visit below.
      </p>

      {listedBy && (
        <div className="rv-card-verified">
          <FiShield size={14} />
          {listedBy.role === "dealer"
            ? "Verified agent listing"
            : "Verified owner listing"}
        </div>
      )}

      {ownerId && (
        <Link to={`/users/${ownerId}`} className="rv-card-view-profile">
          <FiShield size={14} />
          View owner profile
        </Link>
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