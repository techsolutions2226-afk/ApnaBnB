import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../common/Logo";
import {
  FiMenu,
  FiGlobe,
  FiSearch,
  FiHelpCircle,
  FiNavigation,
  FiX,
  FiUser,
} from "react-icons/fi";
import "../../styles/Navbar.css";

import GuestRow from "./GuestRow";
import NotificationBell from "./NotificationBell";

/* ─── Filter options (kept in sync with SearchFiltersModal) ─── */
const AMENITY_OPTIONS = [
  "Parking",
  "Security",
  "Garden",
  "Servant quarter",
  "Elevator",
  "Backup power",
  "Corner plot",
];

/* ─── Destination suggestions ─── */
const suggestions = [
  {
    id: 1,
    icon: <FiNavigation size={22} color="#4A90D9" />,
    bgColor: "#E8F0FD",
    name: "Nearby",
    desc: "Find what's around you",
  },
  {
    id: 2,
    icon: "🏙️",
    bgColor: "#E8F5E9",
    name: "Lahore, Pakistan",
    desc: "High demand area",
  },
  {
    id: 3,
    icon: "🏛️",
    bgColor: "#FFF3E0",
    name: "Rawalpindi, Pakistan",
    desc: "Near you",
  },
  {
    id: 4,
    icon: "🌊",
    bgColor: "#FFF3E0",
    name: "Karachi, Pakistan",
    desc: "Coastal market",
  },
  {
    id: 5,
    icon: "🏔️",
    bgColor: "#FCE4EC",
    name: "Nathia Gali, Pakistan",
    desc: "Near you",
  },
  {
    id: 6,
    icon: "🌿",
    bgColor: "#E8F5E9",
    name: "Murree, Pakistan",
    desc: "Near you",
  },
];

/* ─── Main Navbar ─── */
/* ── Role-specific menu links ── */
const ROLE_MENU_LINKS = {
  seller: [
    { to: "/dashboard/seller", label: "Dashboard" },
    { to: "/listing/new", label: "Create Listing" },
  ],
  buyer: [
    { to: "/dashboard/buyer", label: "Dashboard" },
    { to: "/requirements/new", label: "Post Requirement" },
    { to: "/matches", label: "My Matches" },
  ],
  dealer: [
    { to: "/dashboard/dealer", label: "Dashboard" },
    { to: "/requirements", label: "Requirements Board" },
    { to: "/matches", label: "My Matches" },
  ],
  admin: [
    { to: "/admin", label: "Admin Panel" },
  ],
};

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [destValue, setDestValue] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  /* Scroll-driven hide/show for the search-bar portion of the navbar.
     Hides only the lower search row (.navbar-bottom + the mobile pill);
     the top row (logo + tabs + account button) stays sticky.
     - Scrolling DOWN past 100px → hide
     - Scrolling UP at any point, or being within 50px of top → show
     Landing page already nukes the search via body.hide-navbar-search, so
     this animation never runs there. */
  /* Search-bar visibility is now a pure function of scroll position — no
     direction tracking, no accumulator, no blinking. Visible ONLY when the
     user is at the very top of the page (within SHOW_BAND px). Any scroll
     past that → hidden, regardless of direction. */
  const [searchHidden, setSearchHidden] = useState(false);
  useEffect(() => {
    const SHOW_BAND = 40; // px from the top where the bar is visible
    let ticking = false;
    const update = () => {
      setSearchHidden(window.scrollY > SHOW_BAND);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    // Initial sync in case the page loads already scrolled.
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Bedroom count state lifted up ──
  const [bedrooms, setBedrooms] = useState(0);
  // ── Price range + amenities (new) ──
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [amenities, setAmenities] = useState([]);

  const toggleAmenity = (a) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const activeFilterCount =
    (minPrice !== "" && Number(minPrice) > 0 ? 1 : 0) +
    (maxPrice !== "" && Number(maxPrice) > 0 ? 1 : 0) +
    amenities.length;

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const menuRef = useRef(null);
  const destRef = useRef(null);
  const guestRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
      if (destRef.current && !destRef.current.contains(e.target))
        setDestOpen(false);
      if (guestRef.current && !guestRef.current.contains(e.target))
        setGuestOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Lock body scroll when mobile search is open */
  useEffect(() => {
    if (mobileSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileSearchOpen]);

  const openDest = () => {
    setDestOpen(true);
    setGuestOpen(false);
  };
  const openGuest = () => {
    setGuestOpen(true);
    setDestOpen(false);
  };

  const bedroomSummary = (() => {
    const parts = [];
    if (bedrooms > 0) parts.push(`${bedrooms} bedroom${bedrooms !== 1 ? "s" : ""}`);
    if (activeFilterCount > 0) parts.push(`${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}`);
    return parts.length ? parts.join(" · ") : "Add filters";
  })();

  const clearBedrooms = (e) => {
    e.stopPropagation();
    setBedrooms(0);
    setMinPrice("");
    setMaxPrice("");
    setAmenities([]);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (destValue) params.set("dest", destValue);
    if (bedrooms > 0) params.set("bedrooms", String(bedrooms));
    if (minPrice !== "" && Number(minPrice) > 0)
      params.set("minPrice", String(Number(minPrice)));
    if (maxPrice !== "" && Number(maxPrice) > 0)
      params.set("maxPrice", String(Number(maxPrice)));
    if (amenities.length > 0) params.set("amenities", amenities.join(","));
    navigate(`/search?${params.toString()}`);
    setDestOpen(false);
    setGuestOpen(false);
    setMobileSearchOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="navbar-wrapper">
      {/* ── Top Row ── */}
      <div className="navbar-top">
        <Link to="/" className="navbar-logo" aria-label="apnabnb home">
          <Logo size={48} />
        </Link>

        <nav className="navbar-tabs">
          <Link to="/" className={`tab-btn ${currentPath === "/" || currentPath.startsWith("/property") || currentPath === "/search" ? "tab-active" : ""}`}>
            <span className="tab-icon">🏠</span>
            <span className="tab-label">Homes</span>
          </Link>
          <Link to="/experiences" className={`tab-btn ${currentPath === "/experiences" ? "tab-active" : ""}`}>
            <span className="badge">NEW</span>
            <span className="tab-icon">🎈</span>
            <span className="tab-label">Experiences</span>
          </Link>
          <Link to="/services" className={`tab-btn ${currentPath === "/services" ? "tab-active" : ""}`}>
            <span className="badge">NEW</span>
            <span className="tab-icon">🔔</span>
            <span className="tab-label">Services</span>
          </Link>
        </nav>

        <div className="navbar-actions">
          {currentUser ? (
            <Link
              to={
                currentUser.role === "admin"
                  ? "/admin"
                  : `/dashboard/${currentUser.role}`
              }
              className="become-host-btn"
            >
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="become-host-btn">List a property</Link>
          )}
          {currentUser && <NotificationBell />}
          <button className="icon-btn nav-desktop-only" aria-label="Language">
            <FiGlobe size={18} />
          </button>
          <div className="menu-wrapper" ref={menuRef}>
            <button
              className={`menu-toggle-btn ${menuOpen ? "menu-toggle-btn--active" : ""}`}
              onClick={() => setMenuOpen((p) => !p)}
            >
              <FiMenu size={18} />
              {currentUser ? (
                currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="menu-avatar" />
                ) : (
                  <span className="menu-avatar-fallback">
                    {currentUser.name?.[0] || "U"}
                  </span>
                )
              ) : (
                <FiUser size={18} className="menu-user-icon" />
              )}
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                {currentUser ? (
                  <>
                    {/* Role-specific links */}
                    {(ROLE_MENU_LINKS[currentUser.role] || []).map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="dropdown-item dropdown-item--auth"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="dropdown-divider" />
                    <Link to="/messages" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Messages
                    </Link>
                    <Link to="/wishlists" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Wishlists
                    </Link>
                    <div className="dropdown-divider" />
                    <Link to="/account" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Account
                    </Link>
                    <Link to={`/users/${currentUser.id}`} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Profile
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item dropdown-item-btn" onClick={handleLogout}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="dropdown-item dropdown-item--auth" onClick={() => setMenuOpen(false)}>
                      Log in
                    </Link>
                    <Link to="/signup" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Sign up
                    </Link>
                    <div className="dropdown-divider" />
                    <a href="#" className="dropdown-item dropdown-item--featured" onClick={(e) => e.preventDefault()}>
                      <div className="dropdown-featured-text">
                        <span className="dropdown-featured-title">
                          List a property
                        </span>
                        <span className="dropdown-featured-sub">
                          It&apos;s easy to start listing and connect with buyers.
                        </span>
                      </div>
                      <div className="dropdown-featured-img">🏠</div>
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Search Pill (visible ≤ 900px) ── */}
      <div
        className={`nav-mobile-pill ${searchHidden ? "nav-search-hidden" : ""}`}
        onClick={() => setMobileSearchOpen(true)}
      >
        <FiSearch size={18} />
        <div className="nav-mobile-pill-text">
           <span className="nav-mobile-pill-title">Where to?</span>
    <span className="nav-mobile-pill-sub">
      {destValue || "Anywhere"} &middot; {bedroomSummary}
    </span>
        </div>
      </div>

      {/* ── Mobile Search Overlay (full-screen) ── */}
      {mobileSearchOpen && (
        <div className="nav-mobile-overlay">
          <div className="nav-mobile-overlay-header">
            <button className="nav-mobile-overlay-close" onClick={() => setMobileSearchOpen(false)}>
              <FiX size={20} />
            </button>
            <span className="nav-mobile-overlay-title">Search</span>
            <span style={{ width: 32 }} />
          </div>
          <div className="nav-mobile-overlay-body">
            {/* Where */}
            <div className="nav-mobile-field">
              <label className="nav-mobile-label">Where</label>
              <input
                className="nav-mobile-input"
                type="text"
                placeholder="Search destinations"
                value={destValue}
                onChange={(e) => setDestValue(e.target.value)}
              />
              {/* Compact suggestion list */}
              <div className="nav-mobile-suggestions">
                {suggestions
                  .filter(
                    (s) =>
                      destValue === "" ||
                      s.name.toLowerCase().includes(destValue.toLowerCase()),
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      className="nav-mobile-suggestion"
                      onClick={() => setDestValue(s.name)}
                    >
                      <span
                        className="suggestion-icon-wrap"
                        style={{ backgroundColor: s.bgColor, width: 36, height: 36, borderRadius: 8 }}
                      >
                        {typeof s.icon === "string" ? (
                          <span style={{ fontSize: 16 }}>{s.icon}</span>
                        ) : (
                          s.icon
                        )}
                      </span>
                      <span className="suggestion-name" style={{ fontSize: 13 }}>{s.name}</span>
                    </button>
                  ))}
              </div>
            </div>
            {/* Bedrooms */}
            <div className="nav-mobile-field">
              <label className="nav-mobile-label">Bedrooms</label>
              <div className="nav-mobile-guest-rows">
                <GuestRow
                  label="Bedrooms"
                  sublabel="Minimum bedrooms"
                  count={bedrooms}
                  onInc={() => setBedrooms((b) => b + 1)}
                  onDec={() => setBedrooms((b) => b - 1)}
                />
              </div>
            </div>

            {/* Price range */}
            <div className="nav-mobile-field">
              <label className="nav-mobile-label">Price range (PKR)</label>
              <div className="nav-price-row">
                <div className="nav-price-field">
                  <label className="nav-price-label">Min</label>
                  <input
                    type="number"
                    className="nav-price-input"
                    placeholder="0"
                    value={minPrice}
                    min={0}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <div className="nav-price-field">
                  <label className="nav-price-label">Max</label>
                  <input
                    type="number"
                    className="nav-price-input"
                    placeholder="Any"
                    value={maxPrice}
                    min={0}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="nav-mobile-field">
              <label className="nav-mobile-label">Amenities</label>
              <div className="nav-amenity-grid">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`nav-amenity-chip${amenities.includes(a) ? " nav-amenity-chip--active" : ""}`}
                    onClick={() => toggleAmenity(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="nav-mobile-overlay-footer">
            <button
              className="nav-mobile-clear"
              onClick={() => {
                setDestValue("");
                setBedrooms(0);
                setMinPrice("");
                setMaxPrice("");
                setAmenities([]);
              }}
            >
              Clear all
            </button>
            <button className="nav-mobile-search-btn" onClick={handleSearch}>
              <FiSearch size={16} /> Search
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop Search Bar (hidden ≤ 900px) ── */}
      <div className={`navbar-bottom ${searchHidden ? "nav-search-hidden" : ""}`}>
        <div
          className={`search-bar ${destOpen || guestOpen ? "search-bar--active" : ""}`}
        >
          {/* WHERE */}
          <div
            ref={destRef}
            className={`search-field search-field--where ${destOpen ? "search-field--focused" : ""}`}
            onClick={openDest}
          >
            <label className="search-label">Where</label>
            <input
              className="search-input"
              type="text"
              placeholder="Search destinations"
              value={destValue}
              onChange={(e) => setDestValue(e.target.value)}
              onFocus={openDest}
            />
            {destOpen && (
              <div className="suggestions-dropdown">
                <p className="suggestions-title">Suggested destinations</p>
                <ul className="suggestions-list">
                  {suggestions
                    .filter(
                      (s) =>
                        destValue === "" ||
                        s.name.toLowerCase().includes(destValue.toLowerCase()),
                    )
                    .map((s) => (
                      <li
                        key={s.id}
                        className="suggestion-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDestValue(s.name);
                          setDestOpen(false);
                        }}
                      >
                        <div
                          className="suggestion-icon-wrap"
                          style={{ backgroundColor: s.bgColor }}
                        >
                          {typeof s.icon === "string" ? (
                            <span className="suggestion-emoji">{s.icon}</span>
                          ) : (
                            s.icon
                          )}
                        </div>
                        <div className="suggestion-text">
                          <span className="suggestion-name">{s.name}</span>
                          <span className="suggestion-desc">{s.desc}</span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          <div className="search-divider" />

          <div
            ref={guestRef}
            className={`search-field search-field--who ${guestOpen ? "search-field--focused" : ""}`}
            onClick={openGuest}
          >
            <label className="search-label">Filters</label>
            <div className="who-value-row">
              {bedrooms > 0 || activeFilterCount > 0 ? (
                <>
                  <span className="who-value-text">{bedroomSummary}</span>
                  <button
                    className="who-clear-btn"
                    onClick={clearBedrooms}
                    title="Clear filters"
                  >
                    <FiX size={14} />
                  </button>
                </>
              ) : (
                <span className="search-input-placeholder">Add filters</span>
              )}
            </div>
            {guestOpen && (
              <div
                className="guests-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="nav-filter-section">
                  <GuestRow
                    label="Bedrooms"
                    sublabel="Minimum bedrooms"
                    count={bedrooms}
                    onInc={() => setBedrooms((b) => b + 1)}
                    onDec={() => setBedrooms((b) => b - 1)}
                  />
                </div>

                <div className="nav-filter-section">
                  <h4 className="nav-filter-title">Price range (PKR)</h4>
                  <div className="nav-price-row">
                    <div className="nav-price-field">
                      <label className="nav-price-label">Min</label>
                      <input
                        type="number"
                        className="nav-price-input"
                        placeholder="0"
                        value={minPrice}
                        min={0}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <div className="nav-price-field">
                      <label className="nav-price-label">Max</label>
                      <input
                        type="number"
                        className="nav-price-input"
                        placeholder="Any"
                        value={maxPrice}
                        min={0}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="nav-filter-section">
                  <h4 className="nav-filter-title">Amenities</h4>
                  <div className="nav-amenity-grid">
                    {AMENITY_OPTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={`nav-amenity-chip${amenities.includes(a) ? " nav-amenity-chip--active" : ""}`}
                        onClick={() => toggleAmenity(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className="search-btn"
            aria-label="Search"
            onClick={handleSearch}
          >
            <FiSearch size={16} color="#fff" />
            <span className="search-btn-label">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
