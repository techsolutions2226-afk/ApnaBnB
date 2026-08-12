import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiGrid,
  FiMap,
  FiBriefcase,
} from "react-icons/fi";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import "../styles/Home.css";

/* Hero background — a dusk modern home, matching the reference design. */
const HERO_IMG =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1800&q=80&auto=format&fit=crop";

/* Category quick-filter pills under the search bar. Each maps to a real
   propertyType/category the search page already understands. */
const CATEGORY_PILLS = [
  { label: "Villas", value: "house", icon: FiHome },
  { label: "Apartments", value: "flat", icon: FiGrid },
  { label: "Plots", value: "plot", icon: FiMap },
  { label: "Commercial", value: "commercial", icon: FiBriefcase },
];

/* The two big call-to-action cards (buy / rent). */
const CTA_CARDS = [
  {
    href: "/sale",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1000&q=80&auto=format&fit=crop",
    title: "Looking to buy?",
    text: "Find your dream home or next investment opportunity across Pakistan's premium locations.",
    cta: "Explore Properties",
  },
  {
    href: "/rent",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80&auto=format&fit=crop",
    title: "Looking to rent?",
    text: "Discover meticulously curated rentals, from chic city apartments to expansive family villas.",
    cta: "Find Rentals",
  },
];

const PRICE_PRESETS = [
  { label: "Any price", value: "" },
  { label: "Up to 5,000,000", value: "5000000" },
  { label: "Up to 10,000,000", value: "10000000" },
  { label: "Up to 20,000,000", value: "20000000" },
  { label: "Up to 50,000,000", value: "50000000" },
];

const PROPERTY_TYPES = [
  { label: "Homes, Plots, Commercial…", value: "" },
  { label: "Homes", value: "house" },
  { label: "Apartments / Flats", value: "flat" },
  { label: "Plots", value: "plot" },
  { label: "Commercial", value: "commercial" },
];

const Home = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState("buy"); // buy | rent
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  /* Fetch active properties for the showcase row (real, dynamic data). */
  const { properties: allProps = [], isLoading: propsLoading } = useProperties();
  const featuredProps = useMemo(
    () => (Array.isArray(allProps) ? allProps.slice(0, 8) : []),
    [allProps],
  );

  /* Hide the navbar's own search bar while the landing hero is up. */
  useEffect(() => {
    document.body.classList.add("hide-navbar-search");
    return () => document.body.classList.remove("hide-navbar-search");
  }, []);

  /* Build the search URL and navigate — same routing the old widget used:
     buy → /sale, rent → /rent, with dest/propertyType/maxPrice params. */
  const runSearch = (e, overrides = {}) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    const dest = overrides.dest ?? location.trim();
    const type = overrides.propertyType ?? propertyType;
    const price = overrides.maxPrice ?? maxPrice;
    if (dest) params.set("dest", dest);
    if (type) params.set("propertyType", type);
    if (price) params.set("maxPrice", price);

    const base = (overrides.tab ?? tab) === "rent" ? "/rent" : "/sale";
    const q = params.toString();
    navigate(`${base}${q ? `?${q}` : ""}`);
  };

  /* Horizontal scroll for the "Popular homes" row. */
  const rowRef = useRef(null);
  const scrollRow = (dir) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="abn-home">
      {/* ══ HERO ══ */}
      <section
        className="abn-hero"
        style={{ backgroundImage: `url(${HERO_IMG})` }}
      >
        <span className="abn-hero-shade" aria-hidden="true" />
        <div className="abn-hero-inner">
          <h1 className="abn-hero-title">Discover Your Next Chapter</h1>

          {/* BUY / RENT toggle */}
          <div className="abn-hero-toggle">
            <button
              type="button"
              className={`abn-toggle-btn ${tab === "buy" ? "abn-toggle-btn--active" : ""}`}
              onClick={() => setTab("buy")}
            >
              BUY
            </button>
            <button
              type="button"
              className={`abn-toggle-btn ${tab === "rent" ? "abn-toggle-btn--active" : ""}`}
              onClick={() => setTab("rent")}
            >
              RENT
            </button>
          </div>

          {/* Search bar */}
          <form className="abn-search" onSubmit={runSearch}>
            <div className="abn-search-field">
              <span className="abn-search-label">Location</span>
              <input
                type="text"
                className="abn-search-input"
                placeholder="Where in Pakistan?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <span className="abn-search-sep" />
            <div className="abn-search-field">
              <span className="abn-search-label">Property Type</span>
              <select
                className="abn-search-select"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="abn-search-sep" />
            <div className="abn-search-field">
              <span className="abn-search-label">Price</span>
              <select
                className="abn-search-select"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              >
                {PRICE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="abn-search-btn" aria-label="Search">
              <FiSearch size={20} />
            </button>
          </form>

          {/* Category pills */}
          <div className="abn-hero-pills">
            {CATEGORY_PILLS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  type="button"
                  className="abn-pill"
                  onClick={(e) => runSearch(e, { propertyType: c.value })}
                >
                  <Icon size={15} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ BUY / RENT CTA CARDS ══ */}
      <section className="abn-cta-grid">
        {CTA_CARDS.map((card) => (
          <button
            key={card.href}
            type="button"
            className="abn-cta-card"
            style={{ backgroundImage: `url(${card.image})` }}
            onClick={() => navigate(card.href)}
          >
            <span className="abn-cta-shade" aria-hidden="true" />
            <div className="abn-cta-content">
              <h3 className="abn-cta-title">{card.title}</h3>
              <p className="abn-cta-text">{card.text}</p>
              <span className="abn-cta-link">
                {card.cta} <FiArrowRight size={16} />
              </span>
            </div>
          </button>
        ))}
      </section>

      {/* ══ POPULAR HOMES (dynamic properties) ══ */}
      <section className="abn-popular">
        <div className="abn-popular-head">
          <h2 className="abn-popular-title">
            Popular homes in Islamabad <FiArrowRight size={20} />
          </h2>
          <div className="abn-popular-nav">
            <button
              type="button"
              className="abn-popular-arrow"
              aria-label="Scroll left"
              onClick={() => scrollRow(-1)}
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="abn-popular-arrow"
              aria-label="Scroll right"
              onClick={() => scrollRow(1)}
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>

        {propsLoading ? (
          <div className="abn-popular-row">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="abn-popular-skel" />
            ))}
          </div>
        ) : featuredProps.length === 0 ? (
          <p className="abn-popular-empty">
            No properties yet — be the first to list one.
          </p>
        ) : (
          <div className="abn-popular-row" ref={rowRef}>
            {featuredProps.map((p) => (
              <div className="abn-popular-cell" key={p._id || p.id}>
                <PropertyCard
                  _id={p._id}
                  id={p.id}
                  title={p.title}
                  photos={p.photos}
                  location={p.location}
                  price={p.price}
                  rating={p.rating || 4.5}
                  propertyType={p.propertyType}
                  size={p.size}
                  sizeUnit={p.sizeUnit}
                  listedBy={p.listedBy}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
