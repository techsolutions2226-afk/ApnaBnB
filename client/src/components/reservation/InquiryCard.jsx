import { useState } from "react";
import { AiFillStar } from "react-icons/ai";
import { FiShield, FiMessageSquare, FiPhone } from "react-icons/fi";
import { formatPrice } from "../../utils/formatters";
import { MESSAGING_ENABLED } from "../../config/features";

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

      {MESSAGING_ENABLED ? (
        <>
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
        </>
      ) : (
        /* Chat is shelved: the inquiry form had nowhere to send to, so the card
           now leads to the paid contact reveal instead. The old note promised
           the opposite of what happens here, so it is replaced too. */
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
