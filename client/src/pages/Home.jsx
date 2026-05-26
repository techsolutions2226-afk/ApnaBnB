import { useState, useMemo, useEffect } from "react";
import categories from "../config/categories";
import CategoryBar from "../components/property/CategoryBar";
import PropertyCard from "../components/property/PropertyCard";
import Skeleton from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import { useProperties } from "../hooks/useProperties";
import {
  FiSearch,
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
} from "react-icons/fi";
import { FaHome, FaKey } from "react-icons/fa";
import "../styles/PropertyCards.css";
import "../styles/Home.css";

/* Hero CTA cards. `imageUrl` is a CDN-served Unsplash photo so loads fast. */
const PURPOSE_OPTIONS = [
  {
    value: "sale",
    title: "Buy",
    badge: "For Sale",
    headline: "Find your dream home",
    sub: "Browse houses, apartments, plots and commercial spaces for sale.",
    Icon: FaHome,
    accent: "#ff385c",
    imageUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80&auto=format&fit=crop",
  },
  {
    value: "rent",
    title: "Rent",
    badge: "For Rent",
    headline: "Find your next stay",
    sub: "Discover monthly rentals — apartments, portions, rooms and more.",
    Icon: FaKey,
    accent: "#00a578",
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop",
  },
];

const Home = () => {
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const { properties = [], isLoading } = useProperties();

  /* Hide the navbar search bar while the landing-page picker is showing. */
  useEffect(() => {
    const cls = "hide-navbar-search";
    if (selectedPurpose === null) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [selectedPurpose]);

  /* Stats are derived from the live property list — gives the picker some
     real numbers to display (no faked counters). */
  const stats = useMemo(() => {
    const total = properties.length;
    const cities = new Set(
      properties.map((p) => p.location?.city || p.city).filter(Boolean),
    ).size;
    const forSale = properties.filter(
      (p) => (p.purpose || "sale") === "sale",
    ).length;
    const forRent = properties.filter((p) => p.purpose === "rent").length;
    return { total, cities, forSale, forRent };
  }, [properties]);

  /* Property filter — purpose first, then category. */
  const filtered = useMemo(() => {
    let result = properties;
    if (selectedPurpose && selectedPurpose !== "all") {
      result = result.filter((p) => (p.purpose || "sale") === selectedPurpose);
    }
    const cat = categories.find((c) => c.id === activeCategory);
    if (cat && cat.id !== "all") result = result.filter(cat.filter);
    return result;
  }, [selectedPurpose, activeCategory, properties]);

  /* ── Purpose picker hero ── */
  if (selectedPurpose === null) {
    return (
      <div className="home-hero">
        {/* Decorative blobs for visual interest behind the content */}
        <div className="home-hero-blob home-hero-blob--pink" aria-hidden="true" />
        <div className="home-hero-blob home-hero-blob--blue" aria-hidden="true" />
        <div className="home-hero-blob home-hero-blob--lilac" aria-hidden="true" />

        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Find your <span className="home-hero-title-accent">perfect place</span>
            <br /> in Pakistan
          </h1>
          <p className="home-hero-tagline">
            Whether you're buying a dream home or renting your next adventure —
            we'll match you with thousands of properties from verified sellers,
            dealers, and agents.
          </p>

          {/* Trust strip */}
          <ul className="home-hero-trust">
            <li>
              <FiCheckCircle /> Verified listings
            </li>
            <li>
              <FiCheckCircle /> Secure in-app chat
            </li>
            <li>
              <FiCheckCircle /> No middleman fees
            </li>
          </ul>

          {/* Two CTA cards with full-bleed property imagery */}
          <div className="home-hero-cards">
            {PURPOSE_OPTIONS.map((opt, idx) => {
              const { Icon } = opt;
              const count =
                opt.value === "sale" ? stats.forSale : stats.forRent;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="home-hero-card"
                  onClick={() => setSelectedPurpose(opt.value)}
                  style={{
                    "--card-accent": opt.accent,
                    animationDelay: `${0.1 + idx * 0.1}s`,
                  }}
                >
                  <div
                    className="home-hero-card-bg"
                    style={{ backgroundImage: `url(${opt.imageUrl})` }}
                  />
                  <div className="home-hero-card-overlay" />

                  <div className="home-hero-card-content">
                    <span className="home-hero-card-badge">{opt.badge}</span>
                    <div className="home-hero-card-icon-wrap">
                      <Icon size={22} />
                    </div>
                    <h3 className="home-hero-card-title">{opt.headline}</h3>
                    <p className="home-hero-card-sub">{opt.sub}</p>

                    <div className="home-hero-card-foot">
                      <span className="home-hero-card-count">
                        {count > 0 ? `${count} live listings` : "Browse now"}
                      </span>
                      <span className="home-hero-card-cta">
                        Explore <FiArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom stats bar with subtle dividers */}
          <div className="home-hero-stats">
            <div className="home-hero-stat">
              <span className="home-hero-stat-num">{stats.total}+</span>
              <span className="home-hero-stat-lbl">Properties listed</span>
            </div>
            <div className="home-hero-stat">
              <span className="home-hero-stat-num">{stats.cities}</span>
              <span className="home-hero-stat-lbl">Cities covered</span>
            </div>
            <div className="home-hero-stat">
              <span className="home-hero-stat-num">100%</span>
              <span className="home-hero-stat-lbl">Verified dealers</span>
            </div>
          </div>

          <button
            type="button"
            className="home-hero-skip"
            onClick={() => setSelectedPurpose("all")}
          >
            Or browse all properties <FiArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Property grid (after purpose chosen) ── */
  const purposeLabel =
    selectedPurpose === "sale"
      ? "For Sale"
      : selectedPurpose === "rent"
        ? "For Rent"
        : "All Properties";

  return (
    <div className="home-page">
      <div className="home-purpose-bar">
        <button
          type="button"
          className="home-purpose-back"
          onClick={() => {
            setSelectedPurpose(null);
            setActiveCategory("all");
          }}
        >
          <FiArrowLeft size={16} /> Change
        </button>
        <div className="home-purpose-bar-label">
          <span className="home-purpose-bar-prefix">Showing properties:</span>
          <strong>{purposeLabel}</strong>
        </div>
        <span className="home-purpose-bar-count">
          {isLoading ? "…" : `${filtered.length} listing${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <CategoryBar
        categories={categories}
        activeId={activeCategory}
        onSelect={setActiveCategory}
      />

      {isLoading ? (
        <div className="prop-grid-wrapper">
          <div className="prop-grid">
            <Skeleton count={8} />
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="prop-grid-wrapper">
          <div className="prop-grid">
            {filtered.map((p) => (
              <PropertyCard
                key={p._id || p.id || Math.random()}
                id={p._id || p.id}
                {...p}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<FiSearch />}
          title="No matching properties"
          description={
            selectedPurpose === "rent"
              ? "No rental listings match this category yet. Try a different category or switch to Buy."
              : "Try adjusting your search by selecting a different category."
          }
          actionLabel="Clear category"
          onAction={() => setActiveCategory("all")}
        />
      )}
    </div>
  );
};

export default Home;
