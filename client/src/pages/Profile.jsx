import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import reviewService from "../services/reviewService";
import Avatar from "../components/common/Avatar";
import ReviewCard from "../components/common/ReviewCard";
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
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      reviewService.getByUser(id).catch(() => ({ reviews: [] })),
    ])
      .then(([fetchedUser, reviewResp]) => {
        if (cancelled) return;
        setUser(fetchedUser);
        setReviews(reviewResp.reviews || []);
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
              <Avatar
                src={user.avatar}
                name={firstName}
                size="xl"
                isSuperhost={user.role === "dealer"}
              />
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

            {/* Reviews */}
            <section className="pf-reviews-section">
              <h2 className="pf-reviews-title">
                <FiStar size={20} /> {reviews.length} review
                {reviews.length !== 1 ? "s" : ""} by {firstName}
              </h2>
              {reviews.length > 0 ? (
                <div className="pf-reviews-grid">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review._id}
                      userName={review.reviewer?.name || firstName}
                      date={
                        review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ""
                      }
                      rating={review.rating}
                      text={review.comment}
                    />
                  ))}
                </div>
              ) : (
                <p className="pf-no-reviews">
                  {isOwnProfile
                    ? "You haven't written any reviews yet."
                    : `${firstName} hasn't written any reviews yet.`}
                </p>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
