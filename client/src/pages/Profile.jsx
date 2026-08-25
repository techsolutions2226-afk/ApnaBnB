import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import reviewService from "../services/reviewService";
import listingService from "../services/listingService";
import Avatar from "../components/common/Avatar";
import ReviewCard from "../components/common/ReviewCard";
import { toast } from "react-toastify";
import { formatPrice } from "../utils/formatters";
import {
  FiCheck,
  FiStar,
  FiCalendar,
  FiMessageSquare,
  FiPhone,
  FiMapPin,
  FiShield,
  FiMail,
  FiLock,
  FiBriefcase,
  FiEye,
  FiClock,
  FiUnlock,
  FiHome,
  FiMaximize2,
  FiDroplet,
  FiLayers,
} from "react-icons/fi";
import "../styles/Profile.css";
import "../styles/Common.css";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, subscription } = useAuth();

  const isOwnProfile = currentUser?.id === id;
  /* `subscription.plan` is only set once a payment is approved, so it holds for
     every role — `subscription.active` is true for buyers who never paid. */
  const hasPlan = !!subscription?.plan;

  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAvatarFull, setShowAvatarFull] = useState(false);
  /* The paid half of the profile: contact details, coverage and counts. Null
     until the gated endpoint succeeds — the public payload carries none of it,
     so there is nothing to hide in the DOM. */
  const [full, setFull] = useState(null);

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
          avatar: currentUser.avatar,
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

  /* Contact details come from a separate, gated endpoint. A 402 simply leaves
     `full` null and the locked card renders — no redirect, since the visitor
     may have landed here directly and the public half is still worth showing. */
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    if (!isOwnProfile && !hasPlan) return;
    let cancelled = false;
    userService
      .getProfile(id)
      .then((data) => {
        if (!cancelled) setFull(data);
      })
      .catch(() => {
        /* 402 or transient failure — the locked card is the correct fallback. */
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, isOwnProfile, hasPlan]);

  const unlock = () => {
    if (!isAuthenticated) {
      toast.info("Please log in to see contact details.");
      navigate("/login");
      return;
    }
    navigate(`/plans?from=contact&user=${id}`);
  };

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
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div className="cm-spinner" style={{ margin: "0 auto 20px" }} />
            <p style={{ color: "#6b7280", fontSize: "15px" }}>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="pf-page">
        <div className="pf-container">
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <h1 className="pf-name" style={{ marginBottom: "12px" }}>User not found</h1>
            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              This profile doesn&apos;t exist.{" "}
            </p>
            <Link to="/" className="pf-btn-primary" style={{ display: "inline-block", width: "auto", padding: "10px 24px" }}>
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstName = (user.name || "").split(" ")[0] || user.name || "User";
  const fullName = user.name || "User";
  const userRole = (user.role || "member").toUpperCase();
  const roleBadgeLabel = `VERIFIED ${userRole}`;

  const listingsCount = full?._count?.listings ?? listings.length;
  const reviewsCount = full?._count?.reviews ?? reviews.length;
  const needsCount = full?._count?.requirements ?? full?._count?.needs ?? 0;

  // Contact details fallback to current user info if viewing own profile
  const contactPhone = full?.phone || (isOwnProfile ? currentUser?.phone : null);
  const contactEmail = full?.email || (isOwnProfile ? currentUser?.email : null);
  const contactLocation = full?.location || (isOwnProfile ? currentUser?.location : null);

  return (
    <div className="pf-page">
      <div className="pf-container">
        <div className="pf-layout">
          {/* ════════════════ LEFT SIDEBAR ════════════════ */}
          <aside className="pf-sidebar">
            {/* Identity Card */}
            <div className="pf-identity-card">
              <div className="pf-card-banner" />
              <div className="pf-avatar-section">
                <div className="pf-avatar-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (user.avatar) setShowAvatarFull(true);
                    }}
                    aria-label={user.avatar ? `View ${firstName}'s photo full screen` : `${firstName}'s photo`}
                    className="pf-avatar-btn"
                  >
                    <Avatar
                      src={user.avatar}
                      name={fullName}
                      size="xl"
                      isSuperhost={false}
                    />
                  </button>
                  <div className="pf-verified-badge" title="Identity Verified">
                    <FiCheck size={12} strokeWidth={3} />
                  </div>
                </div>

                <h1 className="pf-name">{fullName}</h1>
                <div className="pf-role-pill">
                  {roleBadgeLabel}
                </div>

                {/* Stats Row (Listings, Reviews, Needs) */}
                <div className="pf-stats-row">
                  <div className="pf-stat-item">
                    <span className="pf-stat-number">{listingsCount}</span>
                    <span className="pf-stat-text">Listings</span>
                  </div>
                  <div className="pf-stat-item">
                    <span className="pf-stat-number">{reviewsCount}</span>
                    <span className="pf-stat-text">Reviews</span>
                  </div>
                  <div className="pf-stat-item">
                    <span className="pf-stat-number">{needsCount}</span>
                    <span className="pf-stat-text">Needs</span>
                  </div>
                </div>

                {/* Profile Action Button */}
                {isOwnProfile ? (
                  <Link to="/account/personal-info" className="pf-btn-action">
                    Edit profile
                  </Link>
                ) : !full ? (
                  <button type="button" onClick={unlock} className="pf-btn-action">
                    <FiUnlock size={15} style={{ marginRight: 6 }} /> Choose plan to unlock
                  </button>
                ) : contactPhone ? (
                  <a href={`tel:${contactPhone}`} className="pf-btn-action">
                    <FiPhone size={15} style={{ marginRight: 6 }} /> Contact {firstName}
                  </a>
                ) : (
                  <button type="button" disabled className="pf-btn-action" style={{ opacity: 0.85 }}>
                    Verified Profile
                  </button>
                )}
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="pf-contact-card">
              <h3 className="pf-contact-header">Contact Information</h3>

              {full || isOwnProfile ? (
                <div className="pf-contact-list">
                  {contactPhone ? (
                    <a className="pf-contact-item" href={`tel:${contactPhone}`}>
                      <div className="pf-contact-icon-box">
                        <FiPhone size={17} />
                      </div>
                      <div className="pf-contact-item-content">
                        <span className="pf-contact-item-label">PHONE</span>
                        <span className="pf-contact-item-value">{contactPhone}</span>
                      </div>
                    </a>
                  ) : (
                    <div className="pf-contact-item pf-contact-item--static">
                      <div className="pf-contact-icon-box">
                        <FiPhone size={17} />
                      </div>
                      <div className="pf-contact-item-content">
                        <span className="pf-contact-item-label">PHONE</span>
                        <span className="pf-contact-item-value pf-muted">Not provided</span>
                      </div>
                    </div>
                  )}

                  {contactEmail ? (
                    <a className="pf-contact-item" href={`mailto:${contactEmail}`}>
                      <div className="pf-contact-icon-box">
                        <FiMail size={17} />
                      </div>
                      <div className="pf-contact-item-content">
                        <span className="pf-contact-item-label">EMAIL</span>
                        <span className="pf-contact-item-value">{contactEmail}</span>
                      </div>
                    </a>
                  ) : (
                    <div className="pf-contact-item pf-contact-item--static">
                      <div className="pf-contact-icon-box">
                        <FiMail size={17} />
                      </div>
                      <div className="pf-contact-item-content">
                        <span className="pf-contact-item-label">EMAIL</span>
                        <span className="pf-contact-item-value pf-muted">Not provided</span>
                      </div>
                    </div>
                  )}

                  {contactLocation ? (
                    <div className="pf-contact-item pf-contact-item--static">
                      <div className="pf-contact-icon-box">
                        <FiMapPin size={17} />
                      </div>
                      <div className="pf-contact-item-content">
                        <span className="pf-contact-item-label">LOCATION</span>
                        <span className="pf-contact-item-value">{contactLocation}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pf-contact-item pf-contact-item--static">
                      <div className="pf-contact-icon-box">
                        <FiMapPin size={17} />
                      </div>
                      <div className="pf-contact-item-content">
                        <span className="pf-contact-item-label">LOCATION</span>
                        <span className="pf-contact-item-value pf-muted">Pakistan</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pf-contact-locked-state">
                  <div className="pf-locked-icon-wrap">
                    <FiLock size={20} />
                  </div>
                  <p className="pf-locked-text">
                    Contact details are available to members on an active plan.
                  </p>
                  <button type="button" onClick={unlock} className="pf-btn-unlock-small">
                    <FiUnlock size={14} /> Unlock Details
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ════════════════ RIGHT MAIN CONTENT ════════════════ */}
          <main className="pf-main">
            {/* Active Listings Section */}
            <section className="pf-section">
              <div className="pf-section-header">
                <h2 className="pf-section-title">Active Listings</h2>
                <Link to="/search" className="pf-view-all">View all</Link>
              </div>

              {listings.length > 0 ? (
                <div className="pf-listings-grid">
                  {listings.map((listing) => {
                    const prop =
                      listing.property && typeof listing.property === "object"
                        ? listing.property
                        : null;
                    const photo = prop?.photos?.[0] || prop?.gallery?.[0] || listing.photos?.[0] || listing.image;
                    const title = prop?.title || listing.title || "Property";
                    const city = prop?.location?.city || listing.location?.city || "";
                    const area = prop?.location?.area || listing.location?.area || "";
                    const locationText = [area, city].filter(Boolean).join(", ") || city || "Pakistan";
                    const price = prop?.price ?? listing.price;
                    const rawPrice = Number(price);
                    const formattedPrice = !Number.isNaN(rawPrice) && rawPrice > 0
                      ? formatPrice(rawPrice)
                      : "Price on request";
                    
                    const isNeed = prop?.purpose === "buy" || listing.purpose === "buy" || prop?.type === "need" || listing.type === "need";
                    const badgeText = isNeed ? "NEED" : "HAVE";

                    const beds = prop?.bedrooms || prop?.features?.bedrooms || prop?.beds;
                    const baths = prop?.bathrooms || prop?.features?.bathrooms || prop?.baths;
                    const sizeVal = prop?.size || prop?.area;
                    const sizeUnitVal = prop?.sizeUnit || "sqft";
                    const sizeText = sizeVal ? `${sizeVal} ${sizeUnitVal}` : null;
                    const floorText = prop?.floor || prop?.features?.floor || null;

                    return (
                      <Link
                        key={listing._id || listing.id}
                        to={`/property/${prop?._id || listing.propertyId || listing._id || ""}`}
                        className="pf-card"
                      >
                        <div className="pf-card-img-container">
                          {photo ? (
                            <img
                              src={photo}
                              alt={title}
                              className="pf-card-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="pf-card-img-fallback">
                              No photo
                            </div>
                          )}
                          <span className="pf-card-badge">{badgeText}</span>
                        </div>

                        <div className="pf-card-content">
                          <div className="pf-card-heading-row">
                            <h4 className="pf-card-title" title={title}>
                              {title}
                            </h4>
                            <span className={`pf-card-price ${!isNeed ? "pf-card-price--green" : ""}`}>
                              {formattedPrice.startsWith("Rs") || formattedPrice.startsWith("PKR")
                                ? formattedPrice
                                : `Rs ${formattedPrice}`}
                            </span>
                          </div>

                          <div className="pf-card-location-row">
                            <FiMapPin size={13} className="pf-card-pin" />
                            <span>{locationText}</span>
                          </div>

                          <div className="pf-card-divider" />

                          <div className="pf-card-features">
                            {beds ? (
                              <span className="pf-card-feat">
                                <FiHome size={13} /> {beds} Bed{beds !== 1 ? "s" : ""}
                              </span>
                            ) : null}
                            {baths ? (
                              <span className="pf-card-feat">
                                <FiDroplet size={13} /> {baths} Bath{baths !== 1 ? "s" : ""}
                              </span>
                            ) : null}
                            {sizeText ? (
                              <span className="pf-card-feat">
                                <FiMaximize2 size={13} /> {sizeText}
                              </span>
                            ) : null}
                            {!beds && floorText ? (
                              <span className="pf-card-feat">
                                <FiLayers size={13} /> {floorText}
                              </span>
                            ) : null}
                            {!beds && !baths && !sizeText && (
                              <span className="pf-card-feat">
                                <FiHome size={13} /> Verified Listing
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="pf-empty-listings-card">
                  <div className="pf-empty-icon-circle">
                    <FiHome size={24} />
                  </div>
                  <h3 className="pf-empty-title">No active listings</h3>
                  <p className="pf-empty-desc">
                    {isOwnProfile
                      ? "You haven't posted any properties yet. Create your first listing to start reaching buyers."
                      : `${firstName} doesn't have any active listings at the moment.`}
                  </p>
                  {isOwnProfile && (
                    <Link to="/listing/new" className="pf-btn-action" style={{ width: "auto", display: "inline-block", padding: "10px 24px", marginTop: "12px" }}>
                      Create Listing
                    </Link>
                  )}
                </div>
              )}
            </section>

            {/* Reviews & Reputation Section */}
            <section className="pf-section" style={{ marginTop: "40px" }}>
              <div className="pf-section-header">
                <h2 className="pf-section-title">Reviews & Reputation</h2>
              </div>

              <div className="pf-reviews-container">
                {reviews.length > 0 ? (
                  <div className="pf-reviews-list">
                    {reviews.map((review) => {
                      const propName = review.property?.title || "this property";
                      return (
                        <div key={review._id} className="pf-review-wrapper">
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
                          {review.property?._id && (
                            <Link
                              to={`/property/${review.property._id}`}
                              className="pf-review-prop-tag"
                            >
                              <span>{propName}</span>
                              <span className="pf-review-prop-stars">★ {review.rating}</span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pf-empty-reviews-state">
                    <div className="pf-empty-icon-circle">
                      <FiMessageSquare size={24} />
                    </div>
                    <h3 className="pf-empty-title">No reviews yet</h3>
                    <p className="pf-empty-desc">
                      {firstName} hasn&apos;t received any reviews yet. Complete
                      transactions on apnabnb to build trust and gather feedback
                      from the community.
                    </p>
                    <div className="pf-empty-dots">
                      <span className="pf-dot active" />
                      <span className="pf-dot" />
                      <span className="pf-dot" />
                    </div>
                  </div>
                )}
              </div>
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
          className="pf-avatar-modal"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAvatarFull(false);
            }}
            aria-label="Close"
            className="pf-avatar-modal-close"
          >
            ×
          </button>
          <img
            src={user.avatar}
            alt={`${firstName}'s photo`}
            onClick={(e) => e.stopPropagation()}
            className="pf-avatar-modal-img"
          />
        </div>
      )}
    </div>
  );
}

