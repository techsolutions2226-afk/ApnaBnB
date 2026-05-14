import { useState } from "react";
import { AiFillStar } from "react-icons/ai";
import { FiHeart, FiClock, FiCheckCircle, FiFilter, FiSearch } from "react-icons/fi";
import { AiFillHeart } from "react-icons/ai";
import services, { serviceCategories } from "../config/services";
import "../styles/Services.css";

const Services = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [liked, setLiked] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  const toggleLike = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* Filter logic */
  let filtered = activeCategory === "all"
    ? services
    : services.filter((s) => s.category === activeCategory);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.provider.name.toLowerCase().includes(q)
    );
  }

  if (priceRange === "low") filtered = filtered.filter((s) => s.price <= 30);
  else if (priceRange === "mid") filtered = filtered.filter((s) => s.price > 30 && s.price <= 60);
  else if (priceRange === "high") filtered = filtered.filter((s) => s.price > 60);

  /* Sort */
  if (sortBy === "price-low") filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sortBy === "price-high") filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sortBy === "rating") filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  else if (sortBy === "popular") filtered = [...filtered].sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || b.reviews - a.reviews);

  const clearFilters = () => {
    setPriceRange("all");
    setSortBy("popular");
    setSearchQuery("");
    setActiveCategory("all");
  };

  const hasActiveFilters = priceRange !== "all" || sortBy !== "popular";

  return (
    <div className="svc-page">
      {/* ── Hero Banner ── */}
      <div className="svc-hero">
        <div className="svc-hero-overlay" />
        <div className="svc-hero-content">
          <p className="svc-hero-eyebrow">Partner Services</p>
          <h1 className="svc-hero-title">
            Everything you need for a perfect stay
          </h1>
          <p className="svc-hero-subtitle">
            From professional cleaning to private chefs — trusted services to enhance your hosting or travel experience.
          </p>
          {/* Hero Search */}
          <div className="svc-hero-search">
            <FiSearch size={18} className="svc-hero-search-icon" />
            <input
              type="text"
              className="svc-hero-search-input"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Category Bar ── */}
      <div className="svc-filter-bar">
        <div className="svc-categories">
          {serviceCategories.map((cat) => (
            <button
              key={cat.id}
              className={`svc-cat-btn ${activeCategory === cat.id ? "svc-cat-btn--active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="svc-cat-icon">{cat.icon}</span>
              <span className="svc-cat-label">{cat.label}</span>
            </button>
          ))}
        </div>
        <button
          className={`svc-filter-toggle ${hasActiveFilters ? "svc-filter-toggle--active" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <FiFilter size={16} />
          <span>Filters</span>
          {hasActiveFilters && <span className="svc-filter-dot" />}
        </button>
      </div>

      {/* ── Expandable Filters ── */}
      {showFilters && (
        <div className="svc-filters-panel">
          <div className="svc-filter-group">
            <h4 className="svc-filter-label">Price range</h4>
            <div className="svc-filter-options">
              {[
                { value: "all", label: "Any" },
                { value: "low", label: "Under $30" },
                { value: "mid", label: "$30 – $60" },
                { value: "high", label: "$60+" },
              ].map((o) => (
                <button
                  key={o.value}
                  className={`svc-filter-chip ${priceRange === o.value ? "svc-filter-chip--active" : ""}`}
                  onClick={() => setPriceRange(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="svc-filter-group">
            <h4 className="svc-filter-label">Sort by</h4>
            <div className="svc-filter-options">
              {[
                { value: "popular", label: "Most popular" },
                { value: "rating", label: "Highest rated" },
                { value: "price-low", label: "Price: Low to high" },
                { value: "price-high", label: "Price: High to low" },
              ].map((o) => (
                <button
                  key={o.value}
                  className={`svc-filter-chip ${sortBy === o.value ? "svc-filter-chip--active" : ""}`}
                  onClick={() => setSortBy(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button className="svc-filter-clear" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Results Count ── */}
      <div className="svc-results-bar">
        <p className="svc-results-count">
          {filtered.length} service{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "all" &&
            ` in ${serviceCategories.find((c) => c.id === activeCategory)?.label}`}
        </p>
      </div>

      {/* ── Service Cards Grid ── */}
      <div className="svc-grid">
        {filtered.map((svc) => (
          <div key={svc.id} className="svc-card">
            {/* Image */}
            <div className="svc-card-img-wrap">
              <img src={svc.image} alt={svc.title} className="svc-card-img" />
              {svc.isPopular && (
                <span className="svc-card-badge">Popular</span>
              )}
              <button
                className="svc-card-heart"
                onClick={(e) => toggleLike(svc.id, e)}
              >
                {liked[svc.id] ? (
                  <AiFillHeart size={20} color="#ff385c" />
                ) : (
                  <FiHeart size={20} color="#fff" strokeWidth={2.2} />
                )}
              </button>
            </div>

            {/* Info */}
            <div className="svc-card-info">
              <div className="svc-card-meta">
                <span className="svc-card-rating">
                  <AiFillStar size={13} /> {svc.rating}
                </span>
                <span className="svc-card-reviews">({svc.reviews})</span>
                <span className="svc-card-dot">&middot;</span>
                <span className="svc-card-location">{svc.location}</span>
              </div>
              <h3 className="svc-card-title">{svc.title}</h3>
              <p className="svc-card-desc">{svc.description}</p>

              {/* Highlights */}
              <div className="svc-card-highlights">
                {svc.highlights.map((h, i) => (
                  <span key={i} className="svc-card-highlight">
                    <FiCheckCircle size={13} /> {h}
                  </span>
                ))}
              </div>

              {/* Duration */}
              <div className="svc-card-duration">
                <FiClock size={14} /> {svc.duration}
              </div>

              {/* Footer: Provider + Price */}
              <div className="svc-card-footer">
                <div className="svc-card-provider">
                  <img
                    src={svc.provider.image}
                    alt={svc.provider.name}
                    className="svc-card-provider-img"
                  />
                  <div className="svc-card-provider-info">
                    <span className="svc-card-provider-name">
                      {svc.provider.name}
                    </span>
                    {svc.provider.isVerified && (
                      <span className="svc-card-verified">
                        <FiCheckCircle size={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="svc-card-price">
                  <span className="svc-card-price-amount">${svc.price}</span>
                  <span className="svc-card-price-unit">{svc.priceUnit}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div className="svc-empty">
          <p className="svc-empty-title">No services found</p>
          <p className="svc-empty-text">
            Try adjusting your filters or searching for something different.
          </p>
          <button className="svc-empty-btn" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Services;
