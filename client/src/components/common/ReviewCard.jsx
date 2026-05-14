import { useState } from "react";
import Avatar from "./Avatar";
import { StarRatingDisplay } from "./StarRating";
import "../../styles/Common.css";
import "../../styles/Review.css";

const ROLE_LABELS = {
  seller: "Seller",
  buyer: "Buyer",
  dealer: "Dealer",
};

export default function ReviewCard({
  userName,
  userAvatar,
  userRole,
  date,
  rating,
  text,
  truncateLength = 150,
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.length > truncateLength;

  /* Format date string to "Month Year" */
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="cm-review">
      <div className="cm-review-header">
        <Avatar src={userAvatar} name={userName} size="md" />
        <div className="cm-review-meta">
          <div className="cm-review-name-row">
            <span className="cm-review-name">{userName}</span>
            {userRole && ROLE_LABELS[userRole] && (
              <span className={`rev-role-badge rev-role-badge--${userRole}`}>
                {ROLE_LABELS[userRole]}
              </span>
            )}
          </div>
          <span className="cm-review-date">{formatDate(date)}</span>
        </div>
      </div>
      {rating && (
        <div className="cm-review-stars">
          <StarRatingDisplay rating={rating} showCount={false} />
        </div>
      )}
      <p
        className={`cm-review-text${!expanded && shouldTruncate ? " cm-review-text--truncated" : ""}`}
      >
        {text}
      </p>
      {shouldTruncate && (
        <button
          className="cm-review-show-more"
          onClick={() => setExpanded(!expanded)}
        >
          Show {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
