import { AiFillStar } from "react-icons/ai";
import { FiShield, FiPhone, FiMail } from "react-icons/fi";
import { formatPrice } from "../../utils/formatters";

const InquiryCard = ({ property, onMessage, contact }) => {
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
        {purpose === "rent" && (
          <span className="rv-card-per"> / month</span>
        )}
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

      {contact ? (
        <div className="rv-card-contact">
          {contact.phone && (
            <a className="rv-card-contact-row" href={`tel:${contact.phone}`}>
              <FiPhone size={15} />
              <span>{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <a className="rv-card-contact-row" href={`mailto:${contact.email}`}>
              <FiMail size={15} />
              <span>{contact.email}</span>
            </a>
          )}
          {!contact.phone && !contact.email && (
            <p className="rv-card-note">
              This owner hasn&apos;t added contact details yet.
            </p>
          )}
        </div>
      ) : (
        <>
          <button type="button" className="rv-card-btn" onClick={handleSubmit}>
            <FiPhone size={17} />
            Get contact info
          </button>

          <p className="rv-card-note">
            Contact details are available with an active plan.
          </p>
        </>
      )}

      {listedBy && (
        <div className="rv-card-verified">
          <FiShield size={14} />
          {listedBy.role === "dealer" ? "Verified agent listing" : "Verified owner listing"}
        </div>
      )}
    </div>
  );
};

export default InquiryCard;
