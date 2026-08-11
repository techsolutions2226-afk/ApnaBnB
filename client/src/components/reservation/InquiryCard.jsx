import { useState } from "react";
import { AiFillStar } from "react-icons/ai";
import { FiShield, FiMessageSquare } from "react-icons/fi";
import { formatPrice } from "../../utils/formatters";

const InquiryCard = ({ property, onMessage }) => {
  const { price, rating, reviews, listedBy, purpose } = property || {};
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (typeof onMessage === "function") onMessage(message);
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

      <form className="rv-card-form" onSubmit={handleSubmit}>
        <label className="rv-card-label" htmlFor="pd-inquiry-msg">
          Send inquiry
        </label>
        <textarea
          id="pd-inquiry-msg"
          className="rv-card-textarea"
          rows={4}
          placeholder="Share your budget, timeline, and any questions..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button type="submit" className="rv-card-btn">
          <FiMessageSquare size={17} />
          Message on platform
        </button>
      </form>

      <p className="rv-card-note">
        Contact details stay hidden until a deal is confirmed.
      </p>

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
