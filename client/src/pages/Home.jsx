import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiMapPin,
  FiHome,
  FiGrid,
  FiMap,
  FiBriefcase,
} from "react-icons/fi";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import {
  CITIES,
  PROPERTY_TABS,
  AREA_UNITS,
  CURRENCIES,
} from "../config/searchOptions";
import SearchableList from "../components/search/dropdowns/SearchableList";
import TabbedGrid from "../components/search/dropdowns/TabbedGrid";
import RangeInputWithUnit from "../components/search/dropdowns/RangeInputWithUnit";
import BedCountPanel from "../components/search/dropdowns/BedCountPanel";
import "../styles/Home.css";
import "../styles/SearchDropdowns.css";

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

/* Dropdown option lists (built from shared config). */
const CITY_OPTIONS = CITIES.map((c) => ({ value: c, label: c }));
const AREA_UNIT_OPTIONS = AREA_UNITS.map((u) => ({ value: u, label: u }));
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const Home = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState("buy"); // buy | rent
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyTab, setPropertyTab] = useState("home"); // home | plot | commercial
  const [area, setArea] = useState(""); // min area
  const [maxArea, setMaxArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("Marla");
  const [beds, setBeds] = useState(0); // 0 = any
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [openField, setOpenField] = useState(null); // only one dropdown open
  // Collapsed by default — only City + "Search by Location" are shown. Clicking
  // "Search by Location" reveals the full advanced search box.
  const [searchExpanded, setSearchExpanded] = useState(false);

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
  const submitSearch = (overrides = {}) => {
    const params = new URLSearchParams();

    // Combine the free-text location with the selected city into `dest`.
    const loc = location.trim();
    const dest =
      overrides.dest ??
      (loc && city ? `${loc}, ${city}` : loc || city || "");
    const type = overrides.propertyType ?? propertyType;
    const price = overrides.maxPrice ?? maxPrice;

    if (dest) params.set("dest", dest);
    if (type) params.set("propertyType", type);
    if (price) params.set("maxPrice", price);
    if (beds) params.set("bedrooms", beds);
    if (area) params.set("minArea", area);
    if (maxArea) params.set("maxArea", maxArea);
    if (minPrice) params.set("minPrice", minPrice);

    const base = (overrides.tab ?? tab) === "rent" ? "/rent" : "/sale";
    const q = params.toString();
    navigate(`${base}${q ? `?${q}` : ""}`);
  };

  /* The form can never navigate on its own. onSubmit always stops the native
     submit (Enter in an input, implicit submission, etc.); only the Search
     button's onClick → submitSearch (and the category pills) run a search. */
  const preventFormSubmit = (e) => {
    e.preventDefault();
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

          {/* Search bar — starts collapsed (City + "Search by Location"); clicking
              "Search by Location" reveals the full advanced search box. */}
          <form
            className={`abn-search2${searchExpanded ? " abn-search2--open" : ""}`}
            onSubmit={preventFormSubmit}
          >
            <div className="abn-s2-row">
              {/* City */}
              <SearchableList
                className="abn-s2-city"
                options={CITY_OPTIONS}
                value={city}
                onChange={setCity}
                placeholder="City"
                icon={FiMapPin}
                open={openField === "city"}
                onOpenChange={(o) => setOpenField(o ? "city" : null)}
              />

              {/* Location — collapsed: a "Search by Location" trigger button;
                  expanded: a normal editable input. */}
              {searchExpanded ? (
                <div className="abn-s2-field abn-s2-loc">
                  <FiSearch className="abn-s2-ico abn-s2-ico--muted" size={16} />
                  <input
                    type="text"
                    className="abn-s2-input"
                    placeholder="Search by Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="abn-s2-field abn-s2-loc abn-s2-expand-btn"
                  onClick={() => setSearchExpanded(true)}
                >
                  <FiSearch className="abn-s2-ico abn-s2-ico--muted" size={16} />
                  <span className="abn-s2-placeholder">
                    {location || "Search by Location"}
                  </span>
                  <FiChevronDown className="abn-s2-expand-chev" size={16} />
                </button>
              )}

              {/* Property type — only when expanded */}
              {searchExpanded && (
                <TabbedGrid
                  tabs={PROPERTY_TABS}
                  value={propertyType}
                  activeTab={propertyTab}
                  onTabChange={setPropertyTab}
                  onChange={(val, tabId) => {
                    setPropertyType(val);
                    setPropertyTab(tabId);
                  }}
                  open={openField === "propertyType"}
                  onOpenChange={(o) => setOpenField(o ? "propertyType" : null)}
                />
              )}
            </div>

            {searchExpanded && (
              <div className="abn-s2-row">
                {/* Area */}
                <RangeInputWithUnit
                  title="Area"
                  unit={areaUnit}
                  changeLabel="Area Unit"
                  modalTitle="Change Area"
                  unitOptions={AREA_UNIT_OPTIONS}
                  min={area}
                  max={maxArea}
                  onChange={({ min, max }) => {
                    setArea(min);
                    setMaxArea(max);
                  }}
                  onUnitChange={setAreaUnit}
                  open={openField === "area"}
                  onOpenChange={(o) => setOpenField(o ? "area" : null)}
                />

                {/* Beds */}
                <BedCountPanel
                  value={beds}
                  onChange={setBeds}
                  open={openField === "beds"}
                  onOpenChange={(o) => setOpenField(o ? "beds" : null)}
                />

                {/* Price */}
                <RangeInputWithUnit
                  title="Price"
                  unit={currency}
                  changeLabel="Currency"
                  modalTitle="Change Currency"
                  unitOptions={CURRENCY_OPTIONS}
                  min={minPrice}
                  max={maxPrice}
                  onChange={({ min, max }) => {
                    setMinPrice(min);
                    setMaxPrice(max);
                  }}
                  onUnitChange={setCurrency}
                  open={openField === "price"}
                  onOpenChange={(o) => setOpenField(o ? "price" : null)}
                />

                <button type="button" className="abn-s2-btn" onClick={() => submitSearch()}>
                  Search
                </button>
              </div>
            )}
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
                  onClick={() => submitSearch({ propertyType: c.value })}
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
