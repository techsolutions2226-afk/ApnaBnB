import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AiFillStar } from "react-icons/ai";
import { FaStar } from "react-icons/fa";
import { FiEdit3, FiLogIn, FiCheckCircle } from "react-icons/fi";
import ReviewCard from "../../common/ReviewCard";
import StarRating from "../../common/StarRating";
import { useAuth } from "../../../context/AuthContext";
import "../../../styles/Review.css";

const CATEGORY_LABELS = {
  cleanliness: "Cleanliness",
  accuracy: "Accuracy",
  documentation: "Documentation",
  communication: "Communication",
  location: "Location",
  value: "Value",
};

const MAX_REVIEW_LENGTH = 500;

export default function PropertyReviews({
  rating,
  reviews,
  propertyReviews,
  categoryRatings,
  overallAverage,
  showAllReviews,
  onToggleShowAll,
  propertyId,
}) {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const REVIEW_INITIAL = 6;
  const visibleReviews = showAllReviews
    ? propertyReviews
    : propertyReviews.slice(0, REVIEW_INITIAL);

  /* ── Write Review State ── */
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [categoryScores, setCategoryScores] = useState({});
  const [submitted, setSubmitted] = useState(false);

  /* ── Star distribution for the overall summary ── */
  const starDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    propertyReviews.forEach((r) => {
      const star = Math.round(r.rating);
      if (dist[star] !== undefined) dist[star]++;
    });
    return dist;
  }, [propertyReviews]);

  const totalReviewCount = propertyReviews.length;

  /* ── Check if current user already reviewed ── */
  const hasAlreadyReviewed = isAuthenticated && currentUser
    ? propertyReviews.some((r) => r.userId === currentUser.id)
    : false;

  /* ── Check if current user is the property owner ── */
  const isOwnProperty = false; /* Would check listing.ownerId === currentUser.id in real app */

  /* ── Handlers ── */
  const handleCategoryScore = (category, value) => {
    setCategoryScores((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (reviewRating === 0) {
      toast.error("Please select an overall rating");
      return;
    }
    if (reviewText.trim().length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }
    if (reviewText.length > MAX_REVIEW_LENGTH) {
      toast.error("Review is too long");
      return;
    }

    /* In a real app, this would POST to API. For mock, just show success. */
    setSubmitted(true);
    toast.success("Review submitted successfully!");
    setShowWriteForm(false);
  };

  const handleCancelReview = () => {
    setShowWriteForm(false);
    setReviewRating(0);
    setReviewText("");
    setCategoryScores({});
  };

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
            <AiFillStar size={18} /> {rating} &middot; {reviews} review
            {reviews !== 1 ? "s" : ""}
          </h3>
        </div>

        {/* ═══ Overall Rating Summary ═══ */}
        {totalReviewCount > 0 && (
          <div className="rev-overall">
            <div className="rev-overall-score">
              <span className="rev-overall-number">
                {overallAverage || rating}
              </span>
              <div className="rev-overall-stars">
                {renderStarIcons(overallAverage || rating)}
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
        {propertyReviews.length > 0 ? (
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
            {propertyReviews.length > REVIEW_INITIAL && (
              <button
                className="pd-reviews-show-all"
                onClick={onToggleShowAll}
              >
                {showAllReviews
                  ? "Show less"
                  : `Show all ${propertyReviews.length} reviews`}
              </button>
            )}
          </>
        ) : (
          <p className="pd-reviews-empty">No reviews yet. Be the first to share your experience!</p>
        )}

        {/* ═══ Write a Review Section ═══ */}
        {isAuthenticated && currentUser ? (
          <>
            {submitted ? (
              <div className="rev-write-success">
                <span className="rev-write-success-icon">
                  <FiCheckCircle size={20} />
                </span>
                <span className="rev-write-success-text">
                  Thank you! Your review has been submitted and will appear shortly.
                </span>
              </div>
            ) : hasAlreadyReviewed ? (
              /* User already reviewed — don't show form */
              null
            ) : !showWriteForm ? (
              <div className="rev-write-section">
                <button
                  className="pd-reviews-show-all"
                  onClick={() => setShowWriteForm(true)}
                >
                  <FiEdit3 size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Write a review
                </button>
              </div>
            ) : (
              <div className="rev-write-section">
                <h4 className="rev-write-heading">Share your experience</h4>
                <form className="rev-write-form" onSubmit={handleSubmitReview}>
                  {/* Overall rating */}
                  <div className="rev-write-field">
                    <label className="rev-write-label">Overall rating</label>
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                  </div>

                  {/* Category ratings */}
                  <div className="rev-write-field">
                    <label className="rev-write-label">Rate by category</label>
                    <div className="rev-write-categories">
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <div key={key} className="rev-write-cat-row">
                          <span className="rev-write-cat-label">{label}</span>
                          <div className="rev-write-cat-stars">
                            <StarRating
                              value={categoryScores[key] || 0}
                              onChange={(val) => handleCategoryScore(key, val)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review text */}
                  <div className="rev-write-field">
                    <label className="rev-write-label">Your review</label>
                    <textarea
                      className="rev-write-textarea"
                      placeholder="Tell others about your experience with this property..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      maxLength={MAX_REVIEW_LENGTH + 50}
                    />
                    <div
                      className={`rev-write-char-count${reviewText.length > MAX_REVIEW_LENGTH ? " rev-write-char-count--over" : ""}`}
                    >
                      {reviewText.length}/{MAX_REVIEW_LENGTH}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="rev-write-actions">
                    <button
                      type="submit"
                      className="rev-write-submit"
                      disabled={reviewRating === 0 || reviewText.trim().length < 10}
                    >
                      Submit review
                    </button>
                    <button
                      type="button"
                      className="rev-write-cancel"
                      onClick={handleCancelReview}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="rev-write-login">
            <span className="rev-write-login-icon">
              <FiLogIn size={24} />
            </span>
            <div className="rev-write-login-text">
              <p className="rev-write-login-title">Want to share your experience?</p>
              <p className="rev-write-login-desc">
                Log in to write a review for this property.
              </p>
            </div>
            <button
              className="rev-write-login-btn"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
          </div>
        )}
      </div>
    </>
  );
}
