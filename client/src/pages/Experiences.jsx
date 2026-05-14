import { useState } from "react"; 
import { AiFillStar } from "react-icons/ai";
import { FiHeart, FiClock, FiUsers, FiGlobe, FiFilter } from "react-icons/fi";
import { AiFillHeart } from "react-icons/ai";
import experiences, { categories } from "../config/experiences";
import "../styles/Experiences.css";

const Experiences = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [liked, setLiked] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState("all");
  const [timeOfDay, setTimeOfDay] = useState("all");

  const toggleLike = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* Filter logic */
  let filtered = activeCategory === "all"
    ? experiences
    : experiences.filter((e) => e.category === activeCategory);

  if (priceRange === "low") filtered = filtered.filter((e) => e.price <= 20);
  else if (priceRange === "mid") filtered = filtered.filter((e) => e.price > 20 && e.price <= 40);
  else if (priceRange === "high") filtered = filtered.filter((e) => e.price > 40);

  if (timeOfDay === "short") filtered = filtered.filter((e) => parseFloat(e.duration) <= 2);
  else if (timeOfDay === "medium") filtered = filtered.filter((e) => { const h = parseFloat(e.duration); return h > 2 && h <= 4; });
  else if (timeOfDay === "long") filtered = filtered.filter((e) => parseFloat(e.duration) > 4);

  const clearFilters = () => {
    setPriceRange("all");
    setTimeOfDay("all");
    setActiveCategory("all");
  };

  const hasActiveFilters = priceRange !== "all" || timeOfDay !== "all";

  return (
    <div className="exp-page">
      {/* ── Hero Banner ── */}
      <div className="exp-hero">
        <div className="exp-hero-overlay" />
        <div className="exp-hero-content">
          <p className="exp-hero-eyebrow">Market Insights</p>
          <h1 className="exp-hero-title">
            Unforgettable activities hosted by locals
          </h1>
          <p className="exp-hero-subtitle">
            Book unique things to do from local experts — food tours, art workshops, outdoor adventures, and more.
          </p>
        </div>
      </div>

      {/* ── Category Filter Bar ── */}
      <div className="exp-filter-bar">
        <div className="exp-categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`exp-cat-btn ${activeCategory === cat.id ? "exp-cat-btn--active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="exp-cat-icon">{cat.icon}</span>
              <span className="exp-cat-label">{cat.label}</span>
            </button>
          ))}
        </div>
        <button
          className={`exp-filter-toggle ${hasActiveFilters ? "exp-filter-toggle--active" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <FiFilter size={16} />
          <span>Filters</span>
          {hasActiveFilters && <span className="exp-filter-dot" />}
        </button>
      </div>

      {/* ── Expandable Filters ── */}
      {showFilters && (
        <div className="exp-filters-panel">
          <div className="exp-filter-group">
            <h4 className="exp-filter-label">Price range</h4>
            <div className="exp-filter-options">
              {[
                { value: "all", label: "Any" },
                { value: "low", label: "Under $20" },
                { value: "mid", label: "$20 – $40" },
                { value: "high", label: "$40+" },
              ].map((o) => (
                <button
                  key={o.value}
                  className={`exp-filter-chip ${priceRange === o.value ? "exp-filter-chip--active" : ""}`}
                  onClick={() => setPriceRange(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="exp-filter-group">
            <h4 className="exp-filter-label">Duration</h4>
            <div className="exp-filter-options">
              {[
                { value: "all", label: "Any" },
                { value: "short", label: "Up to 2 hours" },
                { value: "medium", label: "2–4 hours" },
                { value: "long", label: "4+ hours" },
              ].map((o) => (
                <button
                  key={o.value}
                  className={`exp-filter-chip ${timeOfDay === o.value ? "exp-filter-chip--active" : ""}`}
                  onClick={() => setTimeOfDay(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button className="exp-filter-clear" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Results Count ── */}
      <div className="exp-results-bar">
        <p className="exp-results-count">
          {filtered.length} experience{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "all" &&
            ` in ${categories.find((c) => c.id === activeCategory)?.label}`}
        </p>
      </div>

      {/* ── Experience Cards Grid ── */}
      <div className="exp-grid">
        {filtered.map((exp) => (
          <div key={exp.id} className="exp-card">
            {/* Image */}
            <div className="exp-card-img-wrap">
              <img src={exp.image} alt={exp.title} className="exp-card-img" />
              {exp.isBestseller && (
                <span className="exp-card-badge">Bestseller</span>
              )}
              {exp.isOnline && (
                <span className="exp-card-badge exp-card-badge--online">
                  <FiGlobe size={11} /> Online
                </span>
              )}
              <button
                className="exp-card-heart"
                onClick={(e) => toggleLike(exp.id, e)}
              >
                {liked[exp.id] ? (
                  <AiFillHeart size={20} color="#ff385c" />
                ) : (
                  <FiHeart size={20} color="#fff" strokeWidth={2.2} />
                )}
              </button>
            </div>

            {/* Info */}
            <div className="exp-card-info">
              <div className="exp-card-meta">
                <span className="exp-card-rating">
                  <AiFillStar size={13} /> {exp.rating}
                </span>
                <span className="exp-card-reviews">({exp.reviews})</span>
                <span className="exp-card-dot">&middot;</span>
                <span className="exp-card-location">{exp.location}</span>
              </div>
              <h3 className="exp-card-title">{exp.title}</h3>
              <p className="exp-card-desc">{exp.description}</p>
              <div className="exp-card-details">
                <span className="exp-card-detail">
                  <FiClock size={14} /> {exp.duration}
                </span>
                <span className="exp-card-detail">
                  <FiUsers size={14} /> Up to {exp.maxGroupSize}
                </span>
              </div>
              <div className="exp-card-includes">
                {exp.includes.map((item, i) => (
                  <span key={i} className="exp-card-include-tag">{item}</span>
                ))}
              </div>
              <div className="exp-card-footer">
                <div className="exp-card-host">
                  <img
                    src={exp.host.image}
                    alt={exp.host.name}
                    className="exp-card-host-img"
                  />
                  <span className="exp-card-host-name">
                    Hosted by {exp.host.name}
                  </span>
                </div>
                <span className="exp-card-price">
                  <strong>${exp.price}</strong> / person
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div className="exp-empty">
          <p className="exp-empty-title">No experiences found</p>
          <p className="exp-empty-text">
            Try adjusting your filters or exploring a different category.
          </p>
          <button className="exp-empty-btn" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Experiences;
