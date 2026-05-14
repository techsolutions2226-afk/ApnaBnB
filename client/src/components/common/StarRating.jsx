import { useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";
import "../../styles/Common.css";

/* Display-only star rating */
export function StarRatingDisplay({ rating, count, showCount = true }) {
  return (
    <span className="cm-star-display">
      <FaStar size={12} />
      <span className="cm-star-display-value">{rating}</span>
      {showCount && count != null && (
        <span className="cm-star-display-count">
          ({count} review{count !== 1 ? "s" : ""})
        </span>
      )}
    </span>
  );
}

/* Interactive star rating input */
export default function StarRating({ value = 0, onChange, max = 5 }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="cm-star-input" onMouseLeave={() => setHovered(0)}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= (hovered || value);
        return (
          <button
            key={starValue}
            type="button"
            className={`cm-star-input-btn ${filled ? "cm-star-input-btn--filled" : "cm-star-input-btn--empty"}`}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
          >
            {filled ? <FaStar /> : <FaRegStar />}
          </button>
        );
      })}
    </div>
  );
}
