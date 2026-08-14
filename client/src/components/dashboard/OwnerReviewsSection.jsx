/* OwnerReviewsSection — dashboard section that shows reviews left on any
   property listed by the current user. Used on the seller + dealer dashboards. */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiStar } from "react-icons/fi";
import reviewService from "../../services/reviewService";
import Avatar from "../common/Avatar";
import SectionHeader from "./SectionHeader";

const PREVIEW_LIMIT = 5;

export default function OwnerReviewsSection({ userId }) {
  const [reviews, setReviews] = useState([]);
  const [count, setCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    reviewService
      .getForUserProperties(userId)
      .then((data) => {
        if (cancelled) return;
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        setCount(data?.count || 0);
        setAverageRating(data?.averageRating || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load reviews");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visible = showAll ? reviews : reviews.slice(0, PREVIEW_LIMIT);

  return (
    <div className="dash-section">
      <div className="dash-section-header">
        <h2 className="dash-section-title">
          <FiStar size={16} style={{ color: "#e1a100" }} />
          Reviews on My Properties
        </h2>
        {count > 0 && (
          <span className="dash-reviews-avg">
            <FiStar size={14} /> {averageRating.toFixed(1)} · {count} review
            {count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="dash-empty">
          <p className="dash-empty-text">Loading reviews…</p>
        </div>
      ) : error ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">⚠️</div>
          <p className="dash-empty-text">{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">⭐</div>
          <p className="dash-empty-text">
            No reviews yet on your properties. Reviews from buyers will show here.
          </p>
        </div>
      ) : (
        <div className="dash-reviews-list">
          {visible.map((r) => (
            <div className="dash-review-card" key={r._id}>
              <Avatar src={r.reviewer?.avatar} name={r.reviewer?.name || "U"} size="md" />
              <div className="dash-review-main">
                <div className="dash-review-top">
                  <div className="dash-review-ident">
                    <span className="dash-review-name">
                      {r.reviewer?.name || "Anonymous"}
                    </span>
                    <span className="dash-review-stars">
                      {"★".repeat(Math.min(5, r.rating))}
                      <span className="dash-review-stars-empty">
                        {"★".repeat(Math.max(0, 5 - Math.min(5, r.rating)))}
                      </span>
                    </span>
                    {r.property?._id && (
                      <Link
                        to={`/property/${r.property._id}`}
                        className="dash-review-property"
                      >
                        on "{r.property.title || "property"}"
                      </Link>
                    )}
                  </div>
                  <span className="dash-review-date">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                {r.comment && (
                  <p className="dash-review-comment">{r.comment}</p>
                )}
              </div>
            </div>
          ))}

          {reviews.length > PREVIEW_LIMIT && (
            <button
              type="button"
              className="dash-review-toggle"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}