/* OwnerReviewsSection — dashboard section that shows reviews left on any
   property listed by the current user. Used on the seller + dealer dashboards. */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiStar } from "react-icons/fi";
import { AiFillStar } from "react-icons/ai";
import reviewService from "../../services/reviewService";
import Avatar from "../common/Avatar";

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
    setIsLoading(true);
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
          <FiStar style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Reviews on My Properties
        </h2>
        {count > 0 && (
          <span style={{ fontSize: 14, color: "#717171" }}>
            <AiFillStar style={{ color: "#FFB400", verticalAlign: "-2px" }} />{" "}
            {averageRating.toFixed(1)} · {count} review{count !== 1 ? "s" : ""}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((r) => (
            <div
              key={r._id}
              style={{
                display: "flex",
                gap: 12,
                padding: 14,
                border: "1px solid #e0e0e0",
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <Avatar src={r.reviewer?.avatar} name={r.reviewer?.name || "U"} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14, color: "#222" }}>
                      {r.reviewer?.name || "Anonymous"}
                    </strong>
                    <span style={{ fontSize: 13, color: "#FFB400" }}>
                      {"★".repeat(r.rating)}
                      <span style={{ color: "#ddd" }}>{"★".repeat(5 - r.rating)}</span>
                    </span>
                    {r.property?._id && (
                      <Link
                        to={`/property/${r.property._id}`}
                        style={{ fontSize: 12, color: "#1976d2", textDecoration: "none" }}
                      >
                        on "{r.property.title || "property"}"
                      </Link>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                {r.comment && (
                  <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.5 }}>
                    {r.comment}
                  </p>
                )}
              </div>
            </div>
          ))}

          {reviews.length > PREVIEW_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              style={{
                alignSelf: "flex-start",
                background: "none",
                border: "1px solid #222",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
