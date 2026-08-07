import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiHeart,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiArrowRight,
} from "react-icons/fi";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import useHomeCinematic from "../animation/useHomeCinematic";
import "../styles/Home.css";
import "../styles/cinematic.css";

/* Featured cards on the right column. */
const FEATURED_CARDS = [
  {
    badge: "FOR SALE",
    variant: "sage",
    href: "/sale",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80&auto=format&fit=crop",
    headline: "Looking to buy?",
    cta: "Click to browse properties for sale",
  },
  {
    badge: "FOR RENT",
    variant: "sand",
    href: "/rent",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80&auto=format&fit=crop",
    headline: "Looking to rent?",
    cta: "Click to browse rentals",
  },
];

const SEARCH_TABS = [
  { value: "buy", label: "BUY" },
  { value: "rent", label: "RENT" },
];

/* Major cities first, then alphabetical — matches zameen.com style. */
const PK_CITIES = [
  "Islamabad",
  "Karachi",
  "Lahore",
  "Rawalpindi",
  "Abbottabad",
  "Abdul Hakim",
  "Bahawalpur",
  "Faisalabad",
  "Gujranwala",
  "Hyderabad",
  "Jhang",
  "Larkana",
  "Mardan",
  "Mirpur Khas",
  "Multan",
  "Peshawar",
  "Quetta",
  "Rahim Yar Khan",
  "Sargodha",
  "Sheikhupura",
  "Sialkot",
  "Sukkur",
];

const PROPERTY_TYPE_TREE = [
  {
    value: "homes",
    label: "Homes",
    subTypes: [
      { label: "Upper portion", value: "upper-portion" },
      { label: "Lower portion", value: "lower-portion" },
      { label: "Complete house", value: "house" },
      { label: "Flats / Apartments", value: "flat" },
    ],
  },
  { value: "plots", label: "Plots", subTypes: [] },
  { value: "commercial", label: "Commercial", subTypes: [] },
];

/* Preset numeric ladders for the Price + Area overlays. */
const PRICE_MIN_PRESETS = [
  { label: "0", value: "0" },
  { label: "500,000", value: "500000" },
  { label: "1,000,000", value: "1000000" },
  { label: "2,000,000", value: "2000000" },
  { label: "3,500,000", value: "3500000" },
  { label: "5,000,000", value: "5000000" },
];
const PRICE_MAX_PRESETS = [
  { label: "Any", value: "" },
  { label: "500,000", value: "500000" },
  { label: "1,000,000", value: "1000000" },
  { label: "2,000,000", value: "2000000" },
  { label: "3,500,000", value: "3500000" },
  { label: "5,000,000", value: "5000000" },
];
const AREA_MIN_PRESETS = [
  { label: "0", value: "0" },
  { label: "450", value: "450" },
  { label: "675", value: "675" },
  { label: "1,125", value: "1125" },
  { label: "1,800", value: "1800" },
  { label: "2,250", value: "2250" },
];
const AREA_MAX_PRESETS = [
  { label: "Any", value: "" },
  { label: "450", value: "450" },
  { label: "675", value: "675" },
  { label: "1,125", value: "1125" },
  { label: "1,800", value: "1800" },
  { label: "2,250", value: "2250" },
];

const BEDS_LIST = ["All", "Studio", "1", "2", "3", "4", "5"];
const AREA_UNITS = ["Sq. Ft", "Marla", "Kanal"];

const digits = (s) => String(s).replace(/[^\d]/g, "");
const fmt = (s) => (s ? Number(s).toLocaleString() : "");

const Home = () => {
  const navigate = useNavigate();

  /* Cinematic scroll layer (Lenis + GSAP) — additive, GPU transforms only,
     scoped to this page and disabled under prefers-reduced-motion. */
  const cinematicRef = useHomeCinematic();

  /* Top-level widget state */
  const [activeTab, setActiveTab] = useState("buy");
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [location, setLocation] = useState("");
  const [expanded, setExpanded] = useState(false);

  /* Filter values */
  const [propertyType, setPropertyType] = useState("homes");
  const [propertySubType, setPropertySubType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("Sq. Ft");
  const [beds, setBeds] = useState("All");

  /* Single state controls which overlay is open. */
  const [openMenu, setOpenMenu] = useState(null); // "city" | "pt" | "price" | "area" | "beds" | null
  const widgetRef = useRef(null);

  /* Fetch all active properties (seller + dealer listings) for the showcase
     section under the hero. Backend defaults to status=active. */
  const { properties: allProps = [], isLoading: propsLoading } = useProperties();
  const featuredProps = useMemo(
    () => (Array.isArray(allProps) ? allProps.slice(0, 8) : []),
    [allProps],
  );

  /* Hide the navbar's search bar while we're on the landing. */
  useEffect(() => {
    document.body.classList.add("hide-navbar-search");
    return () => document.body.classList.remove("hide-navbar-search");
  }, []);

  /* Click outside the widget closes any open dropdown + collapses row 2. */
  useEffect(() => {
    const onDown = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setOpenMenu(null);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* Helper — toggle one menu at a time. */
  const toggleMenu = (which) =>
    setOpenMenu((cur) => (cur === which ? null : which));
  const close = () => setOpenMenu(null);

  /* Filtered city list — case-insensitive substring match on citySearch. */
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return PK_CITIES;
    return PK_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [citySearch]);

  /* Property-type display label */
  const ptLabel = (() => {
    const top = PROPERTY_TYPE_TREE.find((p) => p.value === propertyType);
    if (!top) return "Select";
    if (propertySubType) {
      const sub = top.subTypes.find((s) => s.value === propertySubType);
      if (sub) return `${top.label} · ${sub.label}`;
    }
    return top.label;
  })();

  const priceLabel = (() => {
    if (!minPrice && !maxPrice) return "0 to Any";
    return `${minPrice ? fmt(minPrice) : "0"} to ${maxPrice ? fmt(maxPrice) : "Any"}`;
  })();

  const areaLabel = (() => {
    if (!minArea && !maxArea) return "0 to Any";
    return `${minArea ? fmt(minArea) : "0"} to ${maxArea ? fmt(maxArea) : "Any"}`;
  })();

  /* Build URL + navigate */
  const handleSubmit = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (city && location.trim())
      params.set("dest", `${location.trim()}, ${city}`);
    else if (city) params.set("dest", city);
    else if (location.trim()) params.set("dest", location.trim());
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (beds && beds !== "All") {
      params.set("bedrooms", beds === "Studio" ? "0" : beds.replace("+", ""));
    }
    if (propertySubType) params.set("propertyType", propertySubType);

    let basePath = "/search";
    if (activeTab === "buy") basePath = "/sale";
    else if (activeTab === "rent") basePath = "/rent";

    const q = params.toString();
    navigate(`${basePath}${q ? `?${q}` : ""}`);
  };

  const resetAll = () => {
    setCity("");
    setCitySearch("");
    setLocation("");
    setPropertyType("homes");
    setPropertySubType("");
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
    setAreaUnit("Sq. Ft");
    setBeds("All");
    setOpenMenu(null);
  };

  return (
    <div className="home-landing" ref={cinematicRef}>
      <div className="home-landing-grid">
        {/* LEFT — copy + search widget */}
        <div className="home-landing-left">
          <span className="home-landing-eyebrow">
            — Pakistan's home for homes
          </span>

          <h1 className="home-landing-title">
            Find your{" "}
            <em className="home-landing-title-accent">perfect place</em>
          </h1>

          {/* ══ Tabbed search widget ══ */}
          <div className="hero-search" ref={widgetRef}>
            {/* Tabs */}
            <div className="hero-search-tabs">
              {SEARCH_TABS.map((t) => {
                const active = activeTab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setActiveTab(t.value)}
                    className={`hero-search-tab ${active ? "hero-search-tab--active" : ""}`}
                  >
                    {t.label}
                    {active && (
                      <span
                        className="hero-search-tab-tri"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <form className="hero-search-card" onSubmit={handleSubmit}>
              {/* ── Row 1 ── */}
              <div className="hero-search-row1">
                {/* City selector */}
                <div className="hero-search-field hero-search-field--city">
                  <span className="hero-search-flabel">CITY</span>
                  <button
                    type="button"
                    className="hero-search-city-btn"
                    onClick={() => toggleMenu("city")}
                  >
                    <span className={!city ? "hero-search-placeholder" : ""}>
                      {city || "Select city"}
                    </span>
                    <FiChevronDown
                      size={16}
                      style={{
                        transform: openMenu === "city" ? "rotate(180deg)" : "none",
                        transition: "transform .15s",
                      }}
                    />
                  </button>

                  {openMenu === "city" && (
                    <div className="hero-overlay hero-overlay--city">
                      <div className="hero-overlay-search">
                        <FiSearch size={14} />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search city…"
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                        />
                      </div>
                      <ul className="hero-overlay-list">
                        {filteredCities.length === 0 ? (
                          <li className="hero-overlay-empty">No matches</li>
                        ) : (
                          filteredCities.map((c) => (
                            <li
                              key={c}
                              className={`hero-overlay-item${
                                c === city ? " hero-overlay-item--active" : ""
                              }`}
                              onClick={() => {
                                setCity(c);
                                setCitySearch("");
                                close();
                              }}
                            >
                              {c}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="hero-search-vdiv" />

                {/* Location input */}
                <div className="hero-search-field hero-search-field--loc">
                  <span className="hero-search-flabel">LOCATION</span>
                  <input
                    type="text"
                    className="hero-search-input"
                    placeholder="Neighborhood, area, or society"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => setExpanded(true)}
                  />
                </div>

                <button type="submit" className="hero-search-find">
                  <FiSearch size={16} />
                  <span>FIND</span>
                </button>
              </div>

              {/* ── Row 2 — expandable filters ── */}
              {expanded && (
                <>
                  <div className="hero-search-row2">
                    {/* Property type */}
                    <div className="hero-search-filter">
                      <span className="hero-search-flabel">PROPERTY TYPE</span>
                      <button
                        type="button"
                        className="hero-search-filter-btn"
                        onClick={() => toggleMenu("pt")}
                      >
                        <span>{ptLabel}</span>
                        <FiChevronDown size={14} />
                      </button>
                      {openMenu === "pt" && (
                        <div className="hero-overlay hero-overlay--pt">
                          {PROPERTY_TYPE_TREE.map((top) => (
                            <div key={top.value} className="hero-overlay-pt-group">
                              <button
                                type="button"
                                className={`hero-overlay-pt-top${
                                  top.value === propertyType
                                    ? " hero-overlay-pt-top--active"
                                    : ""
                                }`}
                                onClick={() => {
                                  setPropertyType(top.value);
                                  setPropertySubType("");
                                  if (top.subTypes.length === 0) close();
                                }}
                              >
                                {top.label}
                                {top.subTypes.length > 0 && (
                                  <FiChevronDown size={12} />
                                )}
                              </button>
                              {top.value === propertyType &&
                                top.subTypes.length > 0 && (
                                  <div className="hero-overlay-pt-subs">
                                    {top.subTypes.map((s) => (
                                      <button
                                        key={s.value}
                                        type="button"
                                        className={`hero-overlay-pt-sub${
                                          s.value === propertySubType
                                            ? " hero-overlay-pt-sub--active"
                                            : ""
                                        }`}
                                        onClick={() => {
                                          setPropertySubType(s.value);
                                          close();
                                        }}
                                      >
                                        {s.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="hero-search-filter">
                      <span className="hero-search-flabel">PRICE (PKR)</span>
                      <button
                        type="button"
                        className="hero-search-filter-btn"
                        onClick={() => toggleMenu("price")}
                      >
                        <span>{priceLabel}</span>
                        <FiChevronDown size={14} />
                      </button>
                      {openMenu === "price" && (
                        <RangeOverlay
                          minPresets={PRICE_MIN_PRESETS}
                          maxPresets={PRICE_MAX_PRESETS}
                          minValue={minPrice}
                          maxValue={maxPrice}
                          onMin={setMinPrice}
                          onMax={setMaxPrice}
                          onClose={close}
                        />
                      )}
                    </div>

                    {/* Area */}
                    <div className="hero-search-filter">
                      <span className="hero-search-flabel">
                        AREA ({areaUnit})
                      </span>
                      <button
                        type="button"
                        className="hero-search-filter-btn"
                        onClick={() => toggleMenu("area")}
                      >
                        <span>{areaLabel}</span>
                        <FiChevronDown size={14} />
                      </button>
                      {openMenu === "area" && (
                        <RangeOverlay
                          minPresets={AREA_MIN_PRESETS}
                          maxPresets={AREA_MAX_PRESETS}
                          minValue={minArea}
                          maxValue={maxArea}
                          onMin={setMinArea}
                          onMax={setMaxArea}
                          onClose={close}
                        />
                      )}
                    </div>

                    {/* Beds */}
                    <div className="hero-search-filter">
                      <span className="hero-search-flabel">BEDS</span>
                      <button
                        type="button"
                        className="hero-search-filter-btn"
                        onClick={() => toggleMenu("beds")}
                      >
                        <span>{beds}</span>
                        <FiChevronDown size={14} />
                      </button>
                      {openMenu === "beds" && (
                        <div className="hero-overlay hero-overlay--single">
                          <ul className="hero-overlay-list">
                            {BEDS_LIST.map((b) => (
                              <li
                                key={b}
                                className={`hero-overlay-item${
                                  b === beds ? " hero-overlay-item--active" : ""
                                }`}
                                onClick={() => {
                                  setBeds(b);
                                  close();
                                }}
                              >
                                {b}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className="hero-overlay-close"
                            onClick={close}
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Utility line under row 2 ── */}
                  <div className="hero-search-utils">
                    <button
                      type="button"
                      className="hero-search-util hero-search-util--strong"
                      onClick={() => {
                        setExpanded(false);
                        close();
                      }}
                    >
                      <FiChevronUp size={14} /> Less Options
                    </button>
                    <span className="hero-search-util-sep" />
                    <button
                      type="button"
                      className="hero-search-util"
                      onClick={() => {
                        /* Currency switch placeholder — only PKR supported today. */
                      }}
                    >
                      Change Currency
                    </button>
                    <span className="hero-search-util-sep" />
                    <button
                      type="button"
                      className="hero-search-util"
                      onClick={() => {
                        const idx = AREA_UNITS.indexOf(areaUnit);
                        const next = AREA_UNITS[(idx + 1) % AREA_UNITS.length];
                        setAreaUnit(next);
                      }}
                    >
                      Change Area Unit
                    </button>
                    <span className="hero-search-util-sep" />
                    <button
                      type="button"
                      className="hero-search-util"
                      onClick={resetAll}
                    >
                      Reset Search
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>

          <p className="home-landing-tagline">
            Buy, rent, or list across Karachi, Lahore, Islamabad and beyond.
            Verified owners and dealers, secure chat, zero hidden fees.
          </p>

          <ul className="home-feature-tags">
            <li>
              <FiCheck /> 48,000+ verified listings
            </li>
            <li>
              <FiCheck /> Owners, dealers & agents
            </li>
            <li>
              <FiCheck /> Zero middleman fees
            </li>
          </ul>
        </div>

        {/* RIGHT — featured masonry cards */}
        <div className="home-landing-right">
          {FEATURED_CARDS.map((card, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => navigate(card.href)}
              className={`home-feature-card home-feature-card--${card.variant}`}
              style={{ backgroundImage: `url(${card.image})` }}
            >
              <span className="home-feature-card-shade" aria-hidden="true" />
              <span
                className="home-feature-card-heart"
                aria-label="Save"
                role="button"
                onClick={(e) => e.stopPropagation()}
              >
                <FiHeart size={14} />
              </span>
              <span className="home-feature-card-badge">{card.badge}</span>
              <div className="home-feature-card-cta">
                <p className="home-feature-card-headline">{card.headline}</p>
                <p className="home-feature-card-cta-text">
                  {card.cta} <span aria-hidden="true">→</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ Featured properties — all active listings from sellers + dealers ══ */}
      <section className="home-featured">
        <div className="home-featured-head">
          <div>
            <span className="home-featured-eyebrow">Latest listings</span>
            <h2 className="home-featured-title">Properties on ApnaBnB</h2>
            <p className="home-featured-sub">
              Verified homes, plots and commercial spaces posted by owners and
              dealers across Pakistan.
            </p>
          </div>
          <button
            type="button"
            className="home-featured-viewall"
            onClick={() => navigate("/search")}
          >
            View all <FiArrowRight size={14} />
          </button>
        </div>

        {propsLoading ? (
          <div className="home-featured-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-featured-skel" />
            ))}
          </div>
        ) : featuredProps.length === 0 ? (
          <p className="home-featured-empty">
            No properties yet — be the first to list one.
          </p>
        ) : (
          <div className="home-featured-grid">
            {featuredProps.map((p) => (
              <PropertyCard
                key={p._id || p.id}
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

/* ──────────────────────────────────────────────────────
   Reusable two-column range overlay for Price + Area.
   Both columns: text input + scrollable preset list.
   ────────────────────────────────────────────────────── */
function RangeOverlay({
  minPresets,
  maxPresets,
  minValue,
  maxValue,
  onMin,
  onMax,
  onClose,
}) {
  return (
    <div className="hero-overlay hero-overlay--range">
      <div className="hero-overlay-range-cols">
        <div className="hero-overlay-range-col">
          <div className="hero-overlay-range-input">
            <input
              type="text"
              inputMode="numeric"
              value={minValue ? Number(minValue).toLocaleString() : ""}
              placeholder="Min"
              onChange={(e) => onMin(digits(e.target.value))}
            />
          </div>
          <ul className="hero-overlay-range-list">
            {minPresets.map((p) => (
              <li
                key={`min-${p.value}`}
                className={`hero-overlay-item${
                  p.value === minValue ? " hero-overlay-item--active" : ""
                }`}
                onClick={() => onMin(p.value)}
              >
                {p.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-overlay-range-col">
          <div className="hero-overlay-range-input">
            <input
              type="text"
              inputMode="numeric"
              value={maxValue ? Number(maxValue).toLocaleString() : ""}
              placeholder="Any"
              onChange={(e) => onMax(digits(e.target.value))}
            />
          </div>
          <ul className="hero-overlay-range-list">
            {maxPresets.map((p) => (
              <li
                key={`max-${p.label}`}
                className={`hero-overlay-item${
                  p.value === maxValue ? " hero-overlay-item--active" : ""
                }`}
                onClick={() => onMax(p.value)}
              >
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button type="button" className="hero-overlay-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

export default Home;
