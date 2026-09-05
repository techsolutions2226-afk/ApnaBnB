import { useState, useMemo, useEffect } from "react";
import { AiFillStar } from "react-icons/ai";
import { FaStar } from "react-icons/fa";
import ReviewCard from "../../common/ReviewCard";
import reviewService from "../../../services/reviewService";
import "../../../styles/Review.css";

const CATEGORY_LABELS = {
  cleanliness: "Cleanliness",
  accuracy: "Accuracy",
  documentation: "Documentation",
  communication: "Communication",
  location: "Location",
  value: "Value",
};

/* Read-only property reviews (the "comment section"). Reviews are written
   by visitors after a completed visit — through the Visits page — and this
   section only ever displays them. There is deliberately no write form here,
   so browsing visitors can see comments but not post their own. */
export default function PropertyReviews({
  rating,
  propertyReviews,
  categoryRatings,
  overallAverage,
  showAllReviews,
  onToggleShowAll,
  propertyId,
}) {
  /* ── Live reviews fetched from the API for this property. We still accept
        `propertyReviews` prop for backward-compat, but real data takes precedence
        whenever propertyId is provided. ─────────────────────────────────────── */
  const [apiReviews, setApiReviews] = useState(null); // null = not loaded yet
  const [apiAvg, setApiAvg] = useState(0);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    reviewService
      .getByTarget(propertyId, "property")
      .then((data) => {
        if (cancelled) return;
        setApiReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        setApiAvg(data?.averageRating || 0);
      })
      .catch(() => {
        if (cancelled) return;
        setApiReviews([]); // treat as empty on error so the UI still works
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Normalize any API review (which has reviewer/comment/createdAt) into the
  // shape the rest of this component already expects (userName/text/date).
  const normalizedReviews = useMemo(() => {
    const source = apiReviews ?? propertyReviews;
    return source.map((r) => {
      if (r && r.reviewer) {
        return {
          id: r._id,
          userId: r.reviewer._id,
          userName: r.reviewer.name || "Anonymous",
          userAvatar: r.reviewer.avatar,
          userRole: r.reviewer.role,
          date: r.createdAt,
          rating: r.rating,
          text: r.comment || "",
        };
      }
      return r;
    });
  }, [apiReviews, propertyReviews]);

  const REVIEW_INITIAL = 6;
  const visibleReviews = showAllReviews
    ? normalizedReviews
    : normalizedReviews.slice(0, REVIEW_INITIAL);

  /* ── Star distribution for the overall summary ── */
  const starDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    normalizedReviews.forEach((r) => {
      const star = Math.round(r.rating);
      if (dist[star] !== undefined) dist[star]++;
    });
    return dist;
  }, [normalizedReviews]);

  const totalReviewCount = normalizedReviews.length;
  const liveAverage = apiAvg || overallAverage || rating || 0;

  /* ── Render overall star icons ── */
  const renderStarIcons = (score) => {
    const fullStars = Math.round(score);
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        size={14}
        style={{ color: i < fullStars ? "#222" : "#ddd" }}
      />
    ));
  };

  return (
    <>
      <hr className="pd-divider" />
      <div className="pd-reviews-section">
        {/* ═══ Header ═══ */}
        <div className="pd-reviews-header">
          <h3 className="pd-section-heading">
            <AiFillStar size={18} /> {liveAverage.toFixed(1)} &middot; {totalReviewCount} review
            {totalReviewCount !== 1 ? "s" : ""}
          </h3>
          <p className="pd-reviews-note">
            Reviews are shared by visitors after their visit is completed.
          </p>
        </div>

        {/* ═══ Overall Rating Summary ═══ */}
        {totalReviewCount > 0 && (
          <div className="rev-overall">
            <div className="rev-overall-score">
              <span className="rev-overall-number">
                {liveAverage.toFixed(1)}
              </span>
              <div className="rev-overall-stars">
                {renderStarIcons(liveAverage)}
              </div>
              <span className="rev-overall-label">
                {totalReviewCount} review{totalReviewCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="rev-overall-separator" />
            <div className="rev-overall-breakdown">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = starDistribution[star];
                const pct = totalReviewCount > 0
                  ? (count / totalReviewCount) * 100
                  : 0;
                return (
                  <div key={star} className="rev-overall-bar-row">
                    <span className="rev-overall-bar-label">{star}</span>
                    <div className="rev-overall-bar-track">
                      <div
                        className="rev-overall-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="rev-overall-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Category Ratings ═══ */}
        {categoryRatings && (
          <div className="pd-reviews-categories">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const val = categoryRatings[key];
              if (val == null) return null;
              return (
                <div key={key} className="pd-reviews-cat-row">
                  <span className="pd-reviews-cat-label">{label}</span>
                  <div className="pd-reviews-cat-bar">
                    <div
                      className="pd-reviews-cat-fill"
                      style={{ width: `${(val / 5) * 100}%` }}
                    />
                  </div>
                  <span className="pd-reviews-cat-val">{val.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ Review Cards ═══ */}
        {normalizedReviews.length > 0 ? (
          <>
            <div className="pd-reviews-grid">
              {visibleReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  userName={review.userName}
                  userAvatar={review.userAvatar}
                  userRole={review.userRole}
                  date={review.date}
                  rating={review.rating}
                  text={review.text}
                />
              ))}
            </div>
            {normalizedReviews.length > REVIEW_INITIAL && (
              <button
                className="pd-reviews-show-all"
                onClick={onToggleShowAll}
              >
                {showAllReviews
                  ? "Show less"
                  : `Show all ${normalizedReviews.length} reviews`}
              </button>
            )}
          </>
        ) : (
          <p className="pd-reviews-empty">No reviews yet. They will appear here once visitors complete their visits.</p>
        )}
      </div>
    </>
  );
}