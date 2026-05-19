import { useParams, Link } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { useProperty } from "../hooks/useProperties";
import { useWishlist } from "../context/WishlistContext";
import { toast } from "react-toastify";
import Modal from "../components/common/Modal";
import PropertyReviews from "../components/property/detail/PropertyReviews";
import PropertyGallery from "../components/property/detail/PropertyGallery";
import PropertyThingsToKnow from "../components/property/detail/PropertyThingsToKnow";
import Skeleton from "../components/common/Skeleton";
import {
  AiFillStar,
  AiFillHeart,
} from "react-icons/ai";
import {
  FiHeart,
  FiShare,
  FiMonitor,
  FiCopy,
  FiMail,
  FiMessageSquare,
  FiX,
} from "react-icons/fi";
import {
  FaParking,
  FaConciergeBell,
  FaUmbrellaBeach,
  FaBed,
  FaFire,
  FaShieldAlt,
} from "react-icons/fa";
import InquiryCard from "../components/reservation/InquiryCard";
import MapView from "../components/common/MapView";
import "../styles/PropertyDetail.css";

/* ─── Amenity icon map ─── */
const amenityIcons = {
  Parking: <FaParking size={20} />,
  Security: <FaShieldAlt size={18} />,
  Garden: <FaUmbrellaBeach size={18} />,
  "Servant quarter": <FaConciergeBell size={20} />,
  Elevator: <FiMonitor size={20} />,
  "Backup power": <FaFire size={18} />,
  "Corner plot": <FiMonitor size={18} />,
};


/* ─── Section IDs for sticky nav ─── */
const SECTIONS = [
  { id: "photos", label: "Photos" },
  { id: "overview", label: "Overview" },
  { id: "amenities", label: "Amenities" },
  { id: "sleep", label: "Where you'll sleep" },
  { id: "reviews", label: "Reviews" },
  { id: "things-to-know", label: "Things to know" },
  { id: "location", label: "Location" },
];

/* ─── Property Detail Page ─── */
const PropertyDetail = () => {
  const { id } = useParams();
  const { property, isLoading, error } = useProperty(id);

  const { isWishlisted, toggleWishlist } = useWishlist();

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeSection, setActiveSection] = useState("photos");
  const [showStickyNav, setShowStickyNav] = useState(false);

  const sectionRefs = useRef({});
  const navTriggerRef = useRef(null);

  /* ── Sticky nav scroll tracking ── */
  useEffect(() => {
    const handleScroll = () => {
      /* Show sticky nav after gallery */
      if (navTriggerRef.current) {
        const rect = navTriggerRef.current.getBoundingClientRect();
        setShowStickyNav(rect.bottom < 0);
      }
      /* Determine active section */
      const entries = SECTIONS.map((s) => {
        const el = sectionRefs.current[s.id];
        if (!el) return { id: s.id, top: Infinity };
        return { id: s.id, top: el.getBoundingClientRect().top };
      });
      const visible = entries.filter((e) => e.top < 200);
      if (visible.length > 0) {
        setActiveSection(visible[visible.length - 1].id);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const el = sectionRefs.current[sectionId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setSectionRef = useCallback((sectionId) => (el) => {
    sectionRefs.current[sectionId] = el;
  }, []);

  /* Loading state */
  if (isLoading) {
    return (
      <div className="pd-container">
        <Skeleton count={10} />
      </div>
    );
  }

  /* 404 fallback */
  if (!property || error) {
    return (
      <div className="pd-not-found">
        <h2>Property not found</h2>
        <p>{error || 'The property you are looking for does not exist.'}</p>
        <Link to="/" className="pd-back-home">
          Back to Home
        </Link>
      </div>
    );
  }

  const {
    title,
    propertyType,
    location,
    rating,
    reviews,
    gallery = [],
    photos = [],
    listedBy,
    bedrooms,
    bathrooms,
    description,
    amenities = [],
    price,
    size,
    sizeUnit,
    isGuestFav,
  } = property;

  const hostInfo = {
    name: listedBy?.name || "Verified Listing",
    image:
      listedBy?.avatar ||
      (listedBy?.role === "dealer"
        ? "https://i.pravatar.cc/150?u=verified-dealer"
        : "https://i.pravatar.cc/150?u=verified-owner"),
  };

  const saved = isWishlisted(id);
  const sleepArrangements = property?.sleepArrangements || [];
  const houseRules = property?.houseRules || null;
  const cancellationPolicy = property?.cancellationPolicy || null;
  const isRareFind = rating >= 4.9 && reviews >= 30;

  /* ── Fix for location object & missing review props ── */
  const locationString = typeof location === "object" && location !== null
    ? [location.area, location.city].filter(Boolean).join(", ")
    : location || "Unknown location";
  const cityString = typeof location === "object" && location !== null
    ? location.city || ""
    : (location || "").split(",")[0] || "";

  const safePropertyReviews = property?.propertyReviews || [];
  const safeCategoryRatings = property?.categoryRatings || null;
  const safeOverallAverage = property?.overallAverage || rating || 0;

  const actualGallery = gallery?.length > 0 ? gallery : (photos?.length > 0 ? photos : []);



  /* ── Share helpers ── */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success("Link copied!");
      setShareModalOpen(false);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  /* ── Description truncation ── */
  const DESC_LIMIT = 200;
  const isDescLong = description.length > DESC_LIMIT;
  const displayDesc = !descExpanded && isDescLong
    ? description.slice(0, DESC_LIMIT) + "..."
    : description;

  return (
    <div className="pd-wrapper">
      {/* ═══ Sticky Section Nav ═══ */}
      {showStickyNav && (
        <div className="pd-sticky-nav">
          <div className="pd-sticky-nav-inner">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`pd-sticky-nav-btn${activeSection === s.id ? " pd-sticky-nav-btn--active" : ""}`}
                onClick={() => scrollToSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Header ═══ */}
      <div className="pd-header">
        <h1 className="pd-title">{title}</h1>
        <div className="pd-header-actions">
          <button className="pd-action-btn" onClick={() => setShareModalOpen(true)}>
            <FiShare size={16} /> <span>Share</span>
          </button>
          <button
            className="pd-action-btn"
            onClick={() => {
              toggleWishlist(id);
              toast.success(saved ? "Removed from wishlist" : "Saved to wishlist");
            }}
          >
            {saved ? (
              <AiFillHeart size={16} color="#ff385c" />
            ) : (
              <FiHeart size={16} />
            )}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* ═══ Photo Gallery ═══ */}
      <div ref={setSectionRef("photos")} />
      <div ref={navTriggerRef}>
        <PropertyGallery gallery={actualGallery} title={title} />
      </div>

      {/* ═══ Content Grid ═══ */}
      <div className="pd-content">
        {/* ── Left Column ── */}
        <div className="pd-main">
          {/* Overview */}
          <div ref={setSectionRef("overview")} className="pd-overview">
            <div>
              <h2 className="pd-type">{propertyType} in {cityString}</h2>
              <p className="pd-specs">
                {bedrooms} bedroom{bedrooms !== 1 ? "s" : ""} &middot;{" "}
                {bathrooms} bath{bathrooms !== 1 ? "s" : ""} &middot;{" "}
                {size} {sizeUnit}
              </p>
            </div>
            <div className="pd-rating-pill">
              <AiFillStar size={14} />
              <span className="pd-rating-num">{rating}</span>
              <span className="pd-rating-dot">&middot;</span>
              <button className="pd-reviews-count" onClick={() => scrollToSection("reviews")}>
                {reviews} review{reviews !== 1 ? "s" : ""}
              </button>
            </div>
          </div>

          <hr className="pd-divider" />

          {/* Rare Find Callout */}
          {isRareFind && (
            <>
              <div className="pd-rare-find">
                <div className="pd-rare-find-icon">
                  <AiFillStar size={28} color="#e31c5f" />
                </div>
                <div className="pd-rare-find-text">
                  <p className="pd-rare-find-title">This is a rare find</p>
                  <p className="pd-rare-find-desc">
                    High demand listing with excellent engagement.
                  </p>
                </div>
              </div>
              <hr className="pd-divider" />
            </>
          )}

          {/* Host — clickable, opens the lister's public profile */}
          {listedBy?._id ? (
            <Link
              to={`/users/${listedBy._id}`}
              className="pd-host"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <img src={hostInfo.image} alt={hostInfo.name} className="pd-host-img" />
              <div>
                <p className="pd-host-name">Listed by {listedBy?.name}</p>
                <p className="pd-host-meta">
                  {listedBy?.role === "dealer" ? "Verified Dealer" : "Verified Owner"}
                  <span style={{ marginLeft: 8, color: "#1976d2", fontSize: 13 }}>
                    View profile →
                  </span>
                </p>
              </div>
            </Link>
          ) : (
            <div className="pd-host">
              <img src={hostInfo.image} alt={hostInfo.name} className="pd-host-img" />
              <div>
                <p className="pd-host-name">Listed by {hostInfo.name}</p>
                <p className="pd-host-meta">
                  {listedBy?.role === "dealer" ? "Verified Dealer" : "Verified Owner"}
                </p>
              </div>
            </div>
          )}

          <hr className="pd-divider" />

          {/* Highlights */}
          {listedBy?.role === "dealer" && (
            <div className="pd-highlights">
              <div className="pd-highlight">
                <AiFillStar size={24} />
                <div>
                  <p className="pd-highlight-title">Verified dealer listing</p>
                  <p className="pd-highlight-desc">
                    Dealers are verified and rated based on completed deals.
                  </p>
                </div>
              </div>
            </div>
          )}
          {isGuestFav && (
            <div className="pd-highlights">
              <div className="pd-highlight">
                <AiFillHeart size={24} color="#ff385c" />
                <div>
                  <p className="pd-highlight-title">Guest favorite</p>
                  <p className="pd-highlight-desc">
                    One of the most loved listings on the platform.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(listedBy?.role === "dealer" || isGuestFav) && <hr className="pd-divider" />}

          {/* Description with Show more */}
          <div className="pd-description">
            <p>{displayDesc}</p>
            {isDescLong && (
              <button
                className="pd-show-more"
                onClick={() => setDescExpanded(!descExpanded)}
              >
                Show {descExpanded ? "less" : "more"} &rsaquo;
              </button>
            )}
          </div>

          <hr className="pd-divider" />

          {/* ═══ Where you'll sleep ═══ */}
          {sleepArrangements.length > 0 && (
            <>
              <div ref={setSectionRef("sleep")} className="pd-sleep-section">
                <h3 className="pd-section-heading">Where you'll sleep</h3>
                <div className="pd-sleep-grid">
                  {sleepArrangements.map((room, i) => (
                    <div key={i} className="pd-sleep-card">
                      <FaBed size={24} className="pd-sleep-card-icon" />
                      <p className="pd-sleep-card-title">{room.room}</p>
                      <p className="pd-sleep-card-beds">
                        {room.beds.map((b) => `${b.count} ${b.type}`).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <hr className="pd-divider" />
            </>
          )}

          {/* ═══ Amenities ═══ */}
          <div ref={setSectionRef("amenities")} className="pd-amenities">
            <h3 className="pd-section-heading">What this place offers</h3>
            <div className="pd-amenities-grid">
              {amenities.slice(0, 8).map((a) => (
                <div key={a} className="pd-amenity">
                  <span className="pd-amenity-icon">
                    {amenityIcons[a] || <span className="pd-amenity-dot" />}
                  </span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
            {amenities.length > 8 && (
              <button
                className="pd-amenities-show-all"
                onClick={() => setAmenitiesModalOpen(true)}
              >
                Show all {amenities.length} amenities
              </button>
            )}
          </div>
        </div>

        {/* ── Right Column — Inquiry Card ── */}
        <div className="pd-sidebar">
          <InquiryCard property={property} />
        </div>
      </div>

      {/* ═══ Reviews Section ═══ */}
      <div ref={setSectionRef("reviews")}>
        <PropertyReviews
          rating={rating || 0}
          reviews={reviews || 0}
          propertyReviews={safePropertyReviews}
          categoryRatings={safeCategoryRatings}
          overallAverage={safeOverallAverage}
          showAllReviews={showAllReviews}
          onToggleShowAll={() => setShowAllReviews(!showAllReviews)}
          propertyId={id}
        />
      </div>

      {/* ═══ Things to Know ═══ */}
      <div ref={setSectionRef("things-to-know")}>
        <PropertyThingsToKnow
          houseRules={houseRules}
          cancellationPolicy={cancellationPolicy}
        />
      </div>

      {/* ═══ Location section ═══ */}
      <hr className="pd-divider" />
      <div ref={setSectionRef("location")} className="pd-location">
        <h3 className="pd-section-heading">Where you'll be</h3>
        <p className="pd-location-text">{locationString}</p>
        <MapView coordinates={property?.location?.coordinates} height={360} />
      </div>

      {/* ═══ Mobile Sticky CTA ═══ */}
      <div className="pd-mobile-cta">
        <div className="pd-mobile-cta-price">
          <span className="pd-mobile-cta-amount">PKR {Number(price || 0).toLocaleString()}</span>
          <span className="pd-mobile-cta-per"> total</span>
        </div>
        <button
          className="pd-mobile-cta-btn"
          onClick={() => scrollToSection("overview")}
        >
          Message on platform
        </button>
      </div>

      {/* ═══ Share Modal ═══ */}
      <Modal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Share this place">
        <div className="pd-share-content">
          <div className="pd-share-preview">
            <img src={actualGallery[0]} alt={title} className="pd-share-preview-img" />
            <div className="pd-share-preview-info">
              <p className="pd-share-preview-title">{title}</p>
              <p className="pd-share-preview-location">{locationString}</p>
            </div>
          </div>
          <div className="pd-share-options">
            <button className="pd-share-option" onClick={handleCopyLink}>
              <FiCopy size={20} /> Copy link
            </button>
            <button className="pd-share-option" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(window.location.href)}`); setShareModalOpen(false); }}>
              <FiMail size={20} /> Email
            </button>
            <button className="pd-share-option" onClick={() => { window.open(`sms:?body=${encodeURIComponent(`Check out ${title}: ${window.location.href}`)}`); setShareModalOpen(false); }}>
              <FiMessageSquare size={20} /> Messages
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Amenities Modal ═══ */}
      <Modal
        isOpen={amenitiesModalOpen}
        onClose={() => setAmenitiesModalOpen(false)}
        title="What this place offers"
      >
        <div className="pd-amenities-modal-list">
          {amenities.map((a) => (
            <div key={a} className="pd-amenity pd-amenity--modal">
              <span className="pd-amenity-icon">
                {amenityIcons[a] || <span className="pd-amenity-dot" />}
              </span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default PropertyDetail;
