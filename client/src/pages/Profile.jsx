import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import reviewService from "../services/reviewService";
import listingService from "../services/listingService";
import Avatar from "../components/common/Avatar";
import ReviewCard from "../components/common/ReviewCard";
import { FiHome } from "react-icons/fi";
import {
  FiCheck,
  FiStar,
  FiCalendar,
  FiMessageSquare,
  FiShield,
} from "react-icons/fi";
import "../styles/Profile.css";

export default function Profile() {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const isOwnProfile = currentUser?.id === id;

  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAvatarFull, setShowAvatarFull] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsLoading(true);
    setNotFound(false);

    const loadUser = isOwnProfile
      ? Promise.resolve({
          _id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          verified: currentUser.verified,
          createdAt: currentUser.createdAt,
        })
      : userService.getById(id);

    Promise.all([
      loadUser,
      // Reviews left ON this user's properties — what visitors care about
      // when sizing up a dealer/seller, not reviews this user has written.
      reviewService.getForUserProperties(id).catch(() => ({ reviews: [] })),
      listingService.getUserListings(id).catch(() => []),
    ])
      .then(([fetchedUser, reviewResp, fetchedListings]) => {
        if (cancelled) return;
        setUser(fetchedUser);
        setReviews(reviewResp.reviews || []);
        setListings(Array.isArray(fetchedListings) ? fetchedListings : []);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isOwnProfile, currentUser]);

  // Close the full-screen avatar on Esc.
  useEffect(() => {
    if (!showAvatarFull) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowAvatarFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAvatarFull]);

  if (isLoading) {
    return (
      <div className="pf-page">
        <div className="pf-container">
          <div style={{ padding: "40px", textAlign: "center" }}>
            <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="pf-page">
        <div className="pf-container">
          <h1 className="pf-title">User not found</h1>
          <p>
            This profile doesn&apos;t exist.{" "}
            <Link to="/" className="pf-link">
              Go home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const firstName = (user.name || "").split(" ")[0] || user.name || "User";
  const joinYear = user.createdAt
    ? new Date(user.createdAt).getFullYear()
    : null;

  return (
    <div className="pf-page">
      <div className="pf-container">
        <div className="pf-layout">
          {/* Left — Identity Card */}
          <aside className="pf-sidebar">
            <div className="pf-identity-card">
              <button
                type="button"
                onClick={() => {
                  if (user.avatar) setShowAvatarFull(true);
                }}
                aria-label={user.avatar ? `View ${firstName}'s photo full screen` : `${firstName}'s photo`}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: user.avatar ? "zoom-in" : "default",
                }}
              >
                <Avatar
                  src={user.avatar}
                  name={firstName}
                  size="xl"
                  isSuperhost={user.role === "dealer"}
                />
              </button>
              <h1 className="pf-name">{firstName}</h1>
              {user.role && (
                <span className="pf-superhost-badge">{user.role}</span>
              )}
            </div>

            {/* Stats */}
            <div className="pf-stats">
              <div className="pf-stat">
                <span className="pf-stat-value">{reviews.length}</span>
                <span className="pf-stat-label">Reviews</span>
              </div>
              {joinYear && (
                <>
                  <div className="pf-stat-divider" />
                  <div className="pf-stat">
                    <span className="pf-stat-value">{joinYear}</span>
                    <span className="pf-stat-label">Joined</span>
                  </div>
                </>
              )}
            </div>

            {/* Verified */}
            {user.verified && (
              <div className="pf-verified">
                <h3 className="pf-verified-title">
                  <FiShield size={18} /> Confirmed information
                </h3>
                <ul className="pf-verified-list">
                  <li>
                    <FiCheck size={16} /> Identity verified
                  </li>
                </ul>
              </div>
            )}
          </aside>

          {/* Right — About & Reviews */}
          <main className="pf-main">
            <h2 className="pf-about-title">About {firstName}</h2>

            <div className="pf-details">
              {joinYear && (
                <p className="pf-detail">
                  <FiCalendar size={16} /> Joined in {joinYear}
                </p>
              )}
              <p className="pf-detail">
                <FiMessageSquare size={16} /> {user.role || "user"} on the platform
              </p>
            </div>

            {isOwnProfile && (
              <Link to="/account/personal-info" className="pf-edit-link">
                Edit profile
              </Link>
            )}

            {/* Listings */}
            <section
              className="pf-reviews-section"
              style={{ marginBottom: 32 }}
            >
              <h2 className="pf-reviews-title">
                <FiHome size={20} /> {listings.length} listing
                {listings.length !== 1 ? "s" : ""} by {firstName}
              </h2>
              {listings.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                >
                  {listings.map((listing) => {
                    const prop =
                      listing.property && typeof listing.property === "object"
                        ? listing.property
                        : null;
                    const photo = prop?.photos?.[0];
                    const title = prop?.title || "Property";
                    const city = prop?.location?.city || "";
                    const area = prop?.location?.area || "";
                    const price = prop?.price;
                    return (
                      <Link
                        key={listing._id}
                        to={`/property/${prop?._id || ""}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          border: "1px solid #e0e0e0",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#fff",
                          display: "block",
                        }}
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt={title}
                            style={{
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: 140,
                              background: "#f0f0f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#999",
                              fontSize: 13,
                            }}
                          >
                            No photo
                          </div>
                        )}
                        <div style={{ padding: 12 }}>
                          <p
                            style={{
                              margin: "0 0 4px",
                              fontWeight: 600,
                              fontSize: 14,
                              color: "#222",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {title}
                          </p>
                          {(city || area) && (
                            <p
                              style={{
                                margin: "0 0 6px",
                                fontSize: 13,
                                color: "#717171",
                              }}
                            >
                              {[area, city].filter(Boolean).join(", ")}
                            </p>
                          )}
                          {price && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#222",
                              }}
                            >
                              PKR {Number(price).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="pf-no-reviews">
                  {isOwnProfile
                    ? "You haven't posted any listings yet."
                    : `${firstName} hasn't posted any listings yet.`}
                </p>
              )}
            </section>

            {/* Reviews on this user's properties */}
            <section className="pf-reviews-section">
              <h2 className="pf-reviews-title">
                <FiStar size={20} /> {reviews.length} review
                {reviews.length !== 1 ? "s" : ""} on {firstName}'s propert
                {reviews.length === 1 ? "y" : "ies"}
              </h2>
              {reviews.length > 0 ? (
                <div className="pf-reviews-grid">
                  {reviews.map((review) => {
                    const propName =
                      review.property?.title || "this property";
                    const tooltip = `Review on ${propName}`;
                    return (
                      <div
                        key={review._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <ReviewCard
                            userName={review.reviewer?.name || "Buyer"}
                            userAvatar={review.reviewer?.avatar}
                            userRole={review.reviewer?.role}
                            date={
                              review.createdAt
                                ? new Date(review.createdAt).toLocaleDateString()
                                : ""
                            }
                            rating={review.rating}
                            text={review.comment}
                          />
                        </div>
                        {review.property?._id && (
                          <Link
                            to={`/property/${review.property._id}`}
                            title={tooltip}
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 14px",
                              borderRadius: 999,
                              border: "1px solid #e0e0e0",
                              background: "#fafafa",
                              textDecoration: "none",
                              color: "#222",
                              fontSize: 14,
                              fontWeight: 500,
                              transition: "background 0.15s, border-color 0.15s",
                              maxWidth: 280,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f0f0f0";
                              e.currentTarget.style.borderColor = "#bbb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#fafafa";
                              e.currentTarget.style.borderColor = "#e0e0e0";
                            }}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 200,
                              }}
                            >
                              {propName}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                color: "#FFB400",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ★<span style={{ color: "#222" }}>{review.rating}</span>
                            </span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="pf-no-reviews">
                  {isOwnProfile
                    ? "No reviews on your properties yet."
                    : `${firstName} hasn't received any reviews yet.`}
                </p>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* Full-screen avatar overlay */}
      {showAvatarFull && user.avatar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${firstName}'s photo`}
          onClick={() => setShowAvatarFull(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAvatarFull(false);
            }}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#fff",
              width: 40,
              height: 40,
              borderRadius: "50%",
              fontSize: 22,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ×
          </button>
          <img
            src={user.avatar}
            alt={`${firstName}'s photo`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              cursor: "default",
            }}
          />
        </div>
      )}
    </div>
  );
}
