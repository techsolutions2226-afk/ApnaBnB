import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { useProperty } from "../hooks/useProperties";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
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
  FiHome,
  FiMapPin,
  FiMaximize2,
  FiDroplet,
  FiCheckCircle,
  FiUser,
  FiTag,
  FiCalendar,
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
import { formatPrice, formatDate } from "../utils/formatters";
import "../styles/PropertyDetail.css";

/* ─── Amenity icon map ─── */
const amenityIcons = {
  Parking: <FaParking size={18} />,
  Security: <FaShieldAlt size={16} />,
  Garden: <FaUmbrellaBeach size={16} />,
  "Servant quarter": <FaConciergeBell size={18} />,
  Elevator: <FiMonitor size={18} />,
  "Backup power": <FaFire size={16} />,
  "Corner plot": <FiHome size={16} />,
  "Central Air Conditioning": <FiMonitor size={16} />,
  "Electricity Backup": <FaFire size={16} />,
  "Parking Spaces": <FaParking size={18} />,
  "Central Heating": <FaFire size={16} />,
  "Waste Disposal": <FiTag size={16} />,
  "Double Glazed Windows": <FiHome size={16} />,
  Flooring: <FiHome size={16} />,
  Furnished: <FaBed size={16} />,
  "Servant Quarters": <FaConciergeBell size={18} />,
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "location", label: "Location & Nearby" },
  { id: "reviews", label: "Reviews" },
];

const capitalize = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/-/g, " ") : "";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { property, isLoading, error } = useProperty(id);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showStickyNav, setShowStickyNav] = useState(false);

  const sectionRefs = useRef({});
  const navTriggerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (navTriggerRef.current) {
        const rect = navTriggerRef.current.getBoundingClientRect();
        setShowStickyNav(rect.bottom < 80);
      }
      const entries = SECTIONS.map((s) => {
        const el = sectionRefs.current[s.id];
        if (!el) return { id: s.id, top: Infinity };
        return { id: s.id, top: el.getBoundingClientRect().top };
      });
      const visible = entries.filter((e) => e.top < 160);
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

  const setSectionRef = useCallback(
    (sectionId) => (el) => {
      sectionRefs.current[sectionId] = el;
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="pd-wrapper">
        <div className="pd-container">
          <Skeleton count={10} />
        </div>
      </div>
    );
  }

  if (!property || error) {
    return (
      <div className="pd-not-found">
        <h2>Property not found</h2>
        <p>{error || "The property you are looking for does not exist."}</p>
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
    description = "",
    amenities = [],
    price,
    size,
    sizeUnit,
    purpose,
    furnished,
    createdAt,
    category,
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
  const houseRules = property?.houseRules || null;
  const cancellationPolicy = property?.cancellationPolicy || null;

  const locationString =
    typeof location === "object" && location !== null
      ? [location.area, location.city].filter(Boolean).join(", ")
      : location || "Unknown location";
  const cityString =
    typeof location === "object" && location !== null
      ? location.city || ""
      : (location || "").split(",")[0] || "";
  const areaString =
    typeof location === "object" && location !== null
      ? location.area || ""
      : "";

  const safePropertyReviews = property?.propertyReviews || [];
  const safeCategoryRatings = property?.categoryRatings || null;
  const safeOverallAverage = property?.overallAverage || rating || 0;
  const actualGallery =
    gallery?.length > 0 ? gallery : photos?.length > 0 ? photos : [];

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        toast.success("Link copied!");
        setShareModalOpen(false);
      })
      .catch(() => toast.error("Failed to copy link"));
  };

  const handleMessageOwner = (message) => {
    if (!listedBy?._id) {
      navigate("/messages");
      return;
    }
    if (!isAuthenticated) {
      toast.info("Please log in to message the owner.");
      navigate("/login");
      return;
    }
    if (listedBy._id === currentUser?.id) {
      toast.info("This is your own listing.");
      return;
    }
    /* Open (or create) the 1-1 conversation with the owner, pre-filling the
       composer with the inquiry the user typed on this page. */
    const params = new URLSearchParams();
    params.set("with", listedBy._id);
    if (message && String(message).trim()) {
      params.set("draft", String(message).trim());
    }
    navigate(`/messages?${params.toString()}`);
  };

  const DESC_LIMIT = 280;
  const isDescLong = (description || "").length > DESC_LIMIT;
  const displayDesc =
    !descExpanded && isDescLong
      ? description.slice(0, DESC_LIMIT) + "…"
      : description;

  const metaChips = [
    propertyType ? { icon: <FiHome size={14} />, label: capitalize(propertyType) } : null,
    size ? { icon: <FiMaximize2 size={14} />, label: `${size} ${sizeUnit || ""}`.trim() } : null,
    bedrooms != null && bedrooms > 0
      ? { icon: <FaBed size={14} />, label: `${bedrooms} Bed${bedrooms !== 1 ? "s" : ""}` }
      : null,
    bathrooms != null && bathrooms > 0
      ? { icon: <FiDroplet size={14} />, label: `${bathrooms} Bath${bathrooms !== 1 ? "s" : ""}` }
      : null,
    purpose
      ? {
          icon: <FiTag size={14} />,
          label: purpose === "rent" ? "For Rent" : "For Sale",
        }
      : null,
    locationString
      ? { icon: <FiMapPin size={14} />, label: locationString }
      : null,
  ].filter(Boolean);

  const overviewRows = [
    propertyType ? { label: "Type", value: capitalize(propertyType) } : null,
    purpose ? { label: "Purpose", value: capitalize(purpose) } : null,
    price != null
      ? { label: "Price", value: formatPrice(price, { prefix: true }) }
      : null,
    bedrooms != null && bedrooms > 0
      ? { label: "Bedrooms", value: String(bedrooms) }
      : null,
    bathrooms != null && bathrooms > 0
      ? { label: "Bathrooms", value: String(bathrooms) }
      : null,
    size
      ? { label: "Area", value: `${size} ${sizeUnit || ""}`.trim() }
      : null,
    locationString ? { label: "Location", value: locationString } : null,
    createdAt ? { label: "Added", value: formatDate(createdAt) } : null,
    furnished && furnished !== "unfurnished"
      ? { label: "Furnished", value: capitalize(furnished) }
      : furnished === "unfurnished"
        ? { label: "Furnished", value: "Unfurnished" }
        : null,
    category ? { label: "Category", value: capitalize(category) } : null,
  ].filter(Boolean);

  const AMENITY_INITIAL = 8;
  const visibleAmenities = amenities.slice(0, AMENITY_INITIAL);
  const hasMoreAmenities = amenities.length > AMENITY_INITIAL;

  return (
    <div className="pd-wrapper">
      {showStickyNav && (
        <div className="pd-sticky-nav">
          <div className="pd-sticky-nav-inner">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pd-sticky-nav-btn${
                  activeSection === s.id ? " pd-sticky-nav-btn--active" : ""
                }`}
                onClick={() => scrollToSection(s.id)}
              >
                {s.label}
              </button>
            ))}
            <div className="pd-sticky-nav-price">
              <span>{formatPrice(price, { prefix: true })}</span>
              <button
                type="button"
                className="pd-sticky-nav-cta"
                onClick={handleMessageOwner}
              >
                Message
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pd-container">
        {/* Breadcrumb */}
        <nav className="pd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="pd-breadcrumb-sep">/</span>
          {purpose && (
            <>
              <Link to={purpose === "rent" ? "/rent" : "/sale"}>
                {capitalize(purpose)}
              </Link>
              <span className="pd-breadcrumb-sep">/</span>
            </>
          )}
          {cityString && (
            <>
              <span>{cityString}</span>
              <span className="pd-breadcrumb-sep">/</span>
            </>
          )}
          <span className="pd-breadcrumb-current">{title}</span>
        </nav>

        {/* Title + actions */}
        <div className="pd-header">
          <div className="pd-header-left">
            <h1 className="pd-title">{title}</h1>
            {purpose && (
              <span className={`pd-purpose-badge pd-purpose-badge--${purpose}`}>
                {purpose === "rent" ? "For Rent" : "For Sale"}
              </span>
            )}
            <div className="pd-meta-row">
              {metaChips.map((chip, i) => (
                <span key={i} className="pd-meta-chip">
                  {chip.icon}
                  <span>{chip.label}</span>
                  {i < metaChips.length - 1 && (
                    <span className="pd-meta-dot" aria-hidden="true">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="pd-header-actions">
            <button
              type="button"
              className="pd-action-btn"
              onClick={() => setShareModalOpen(true)}
            >
              <FiShare size={15} />
              <span>Share</span>
            </button>
            <button
              type="button"
              className="pd-action-btn"
              onClick={() => {
                toggleWishlist(id);
                toast.success(
                  saved ? "Removed from wishlist" : "Saved to wishlist",
                );
              }}
            >
              {saved ? (
                <AiFillHeart size={15} color="#134e2c" />
              ) : (
                <FiHeart size={15} />
              )}
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div ref={navTriggerRef}>
          <PropertyGallery gallery={actualGallery} title={title} />
        </div>

        {/* Section tabs */}
        <div className="pd-section-tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`pd-section-tab${
                activeSection === s.id ? " pd-section-tab--active" : ""
              }`}
              onClick={() => scrollToSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Two-column body */}
        <div className="pd-content">
          <div className="pd-main">
            {/* Listed by */}
            <section className="pd-card pd-listed-by">
              <div className="pd-listed-by-left">
                {listedBy?._id ? (
                  <Link to={`/users/${listedBy._id}`} className="pd-host-link">
                    <img
                      src={hostInfo.image}
                      alt={hostInfo.name}
                      className="pd-host-img"
                    />
                    <div>
                      <p className="pd-host-name">Listed by {listedBy.name}</p>
                      <p className="pd-host-meta">
                        <FiCheckCircle size={13} className="pd-verified-icon" />
                        {listedBy?.role === "dealer"
                          ? "Verified Agent"
                          : "Verified Owner"}
                        <span className="pd-view-profile">View profile →</span>
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="pd-host-link">
                    <img
                      src={hostInfo.image}
                      alt={hostInfo.name}
                      className="pd-host-img"
                    />
                    <div>
                      <p className="pd-host-name">Listed by {hostInfo.name}</p>
                      <p className="pd-host-meta">
                        <FiCheckCircle size={13} className="pd-verified-icon" />
                        {listedBy?.role === "dealer"
                          ? "Verified Agent"
                          : "Verified Owner"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {listedBy?._id && listedBy._id !== currentUser?.id && (
                <button
                  type="button"
                  className="pd-msg-btn"
                  onClick={handleMessageOwner}
                >
                  <FiMessageSquare size={16} />
                  Message on platform
                </button>
              )}
            </section>

            {/* Overview */}
            <section
              ref={setSectionRef("overview")}
              className="pd-card pd-overview-card"
              id="overview"
            >
              <h2 className="pd-section-heading">Overview</h2>
              <div className="pd-overview-grid">
                {overviewRows.map((row) => (
                  <div key={row.label} className="pd-overview-item">
                    <span className="pd-overview-label">{row.label}</span>
                    <span className="pd-overview-value">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Description */}
            {description && (
              <section className="pd-card">
                <h2 className="pd-section-heading">Description</h2>
                <div className="pd-description">
                  <p>{displayDesc}</p>
                  {isDescLong && (
                    <button
                      type="button"
                      className="pd-show-more"
                      onClick={() => setDescExpanded(!descExpanded)}
                    >
                      {descExpanded ? "Read less" : "Read more"}
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="pd-card" id="amenities">
                <h2 className="pd-section-heading">Amenities</h2>
                <div className="pd-amenities-grid">
                  {visibleAmenities.map((a) => (
                    <div key={a} className="pd-amenity">
                      <span className="pd-amenity-icon">
                        {amenityIcons[a] || (
                          <span className="pd-amenity-dot" />
                        )}
                      </span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
                {hasMoreAmenities && (
                  <button
                    type="button"
                    className="pd-amenities-show-all"
                    onClick={() => setAmenitiesModalOpen(true)}
                  >
                    View more ({amenities.length - AMENITY_INITIAL} more)
                  </button>
                )}
              </section>
            )}

            {/* Things to know */}
            {(houseRules || cancellationPolicy) && (
              <section className="pd-card">
                <PropertyThingsToKnow
                  houseRules={houseRules}
                  cancellationPolicy={cancellationPolicy}
                />
              </section>
            )}

            {/* Location */}
            <section
              ref={setSectionRef("location")}
              className="pd-card pd-location"
              id="location"
            >
              <h2 className="pd-section-heading">Where you&apos;ll be</h2>
              <p className="pd-location-text">
                <FiMapPin size={15} />
                {locationString}
                {areaString && cityString
                  ? ""
                  : cityString
                    ? ` · ${cityString}`
                    : ""}
              </p>
              <div className="pd-map-wrap">
                <MapView
                  coordinates={property?.location?.coordinates}
                  height={380}
                />
              </div>
            </section>

            {/* Reviews */}
            <section
              ref={setSectionRef("reviews")}
              className="pd-card pd-reviews-wrap"
              id="reviews"
            >
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
            </section>
          </div>

          {/* Sticky inquiry sidebar */}
          <aside className="pd-sidebar">
            <InquiryCard
              property={property}
              onMessage={handleMessageOwner}
            />
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="pd-mobile-cta">
        <div className="pd-mobile-cta-price">
          <span className="pd-mobile-cta-amount">
            {formatPrice(price, { prefix: true })}
          </span>
        </div>
        <button
          type="button"
          className="pd-mobile-cta-btn"
          onClick={handleMessageOwner}
        >
          Message on platform
        </button>
      </div>

      {/* Share modal */}
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share this property"
      >
        <div className="pd-share-content">
          <div className="pd-share-preview">
            {actualGallery[0] && (
              <img
                src={actualGallery[0]}
                alt={title}
                className="pd-share-preview-img"
              />
            )}
            <div className="pd-share-preview-info">
              <p className="pd-share-preview-title">{title}</p>
              <p className="pd-share-preview-location">{locationString}</p>
            </div>
          </div>
          <div className="pd-share-options">
            <button type="button" className="pd-share-option" onClick={handleCopyLink}>
              <FiCopy size={18} /> Copy link
            </button>
            <button
              type="button"
              className="pd-share-option"
              onClick={() => {
                window.open(
                  `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(window.location.href)}`,
                );
                setShareModalOpen(false);
              }}
            >
              <FiMail size={18} /> Email
            </button>
            <button
              type="button"
              className="pd-share-option"
              onClick={() => {
                window.open(
                  `sms:?body=${encodeURIComponent(`Check out ${title}: ${window.location.href}`)}`,
                );
                setShareModalOpen(false);
              }}
            >
              <FiMessageSquare size={18} /> Messages
            </button>
          </div>
        </div>
      </Modal>

      {/* Amenities modal */}
      <Modal
        isOpen={amenitiesModalOpen}
        onClose={() => setAmenitiesModalOpen(false)}
        title="All amenities"
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
