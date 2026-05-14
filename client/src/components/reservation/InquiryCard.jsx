import { useState } from "react";
import { AiFillStar } from "react-icons/ai";
import { FiShield } from "react-icons/fi";

const InquiryCard = ({ property }) => {
  const { price, rating, reviews, listedBy } = property;
  const [message, setMessage] = useState("");

  return (
    <div className="rv-card">
      <div className="rv-card-price">
        <span className="rv-card-amount">PKR {Number(price || 0).toLocaleString()}</span>
        <span className="rv-card-per"> total</span>
      </div>

      <div className="rv-card-rating">
        <AiFillStar size={13} />
        <span>{rating}</span>
        <span className="rv-card-dot">&middot;</span>
        <span className="rv-card-reviews">
          {reviews} review{reviews !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rv-card-inputs">
        <label className="rv-card-label">Send inquiry</label>
        <textarea
          className="rv-card-textarea"
          rows={4}
          placeholder="Share your budget, timeline, and any questions..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <button className="rv-card-btn">Message on platform</button>
      <p className="rv-card-note">
        Contact details stay hidden until a deal is confirmed.
      </p>

      {listedBy?.verified && (
        <div className="rv-card-verified">
          <FiShield size={14} /> Verified listing
        </div>
      )}
    </div>
  );
};

export default InquiryCard;
