import { useState, useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FiLayout,
  FiUsers,
  FiHome,
  FiFileText,
  FiLink,
  FiMail,
  FiActivity,
  FiCreditCard,
  FiTag,
  FiLogOut,
  FiMenu,
  FiPhone,
  FiX,
  FiChevronRight,
  FiUser,
  FiSun,
  FiMoon,
  FiCalendar,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useAdminSectionUnviewed } from "../../hooks/useAdminSectionUnviewed";
import MobileBottomNav from "../layout/MobileBottomNav";
import "../../styles/AdminShell.css";
import "../../styles/AdminShell.dark.css";

const THEME_KEY = "apnabnb_admin_theme";

const NAV_ITEMS = [
  { to: "/admin", end: true, label: "Overview", icon: FiLayout },
  { to: "/admin/users", label: "Users", icon: FiUsers },
  { to: "/admin/listings", label: "Listings", icon: FiHome },
  { to: "/admin/requirements", label: "Requirements", icon: FiFileText },
  { to: "/admin/matches", label: "Matches", icon: FiLink },
  { to: "/admin/visits", label: "Visits", icon: FiCalendar },
  { to: "/admin/payments", label: "Payments", icon: FiCreditCard },
  { to: "/admin/plans", label: "Plans", icon: FiTag },
  { to: "/admin/contact", label: "Contact Page", icon: FiPhone },
  { to: "/admin/logs", label: "System Logs", icon: FiActivity },
];

/* ─── AdminShell — standalone admin management panel.
   Dark slate sidebar + scrolling content column, indigo accents
   matching the site fintech design tokens. Renders inside the existing
   ProtectedRoute(roles=["admin"]) wrapper in App.jsx, so no re-auth
   logic is needed here. ───────────────────────────────────────────── */
export default function AdminShell() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "light";
    } catch {
      return "light";
    }
  });

  /* Admin sidebar badges: live "unviewed items" counts for Matches + Visits.
     Each section's count clears once the admin opens that section. */
  const { counts, markSeen } = useAdminSectionUnviewed();
  useEffect(() => {
    if (location.pathname.startsWith("/admin/visits")) {
      markSeen("visits");
    } else if (location.pathname.startsWith("/admin/matches")) {
      markSeen("matches");
    }
  }, [location.pathname, markSeen]);

  const setThemePref = (value) => {
    setTheme(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      /* ignore quota / private-mode errors */
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  /* Path breadcrumb for the topbar title. */
  const crumbs = NAV_ITEMS.filter(
    (item) =>
      location.pathname === item.to ||
      (item.to !== "/admin" && location.pathname.startsWith(item.to))
  );
  const activeLabel = crumbs.length ? crumbs[0].label : "Overview";

  return (
    <div className="ash-shell" data-theme={theme}>
      {/* ── Fixed sidebar ── */}
      <aside
        className={`ash-sidebar${navOpen ? " ash-sidebar--open" : ""}`}
      >
        {/* apnabnb logo → home */}
        <Link to="/" className="ash-logo" aria-label="apnabnb home">
          <span className="ash-logo-dot" />
          <span className="ash-logo-word">apnabnb</span>
          <span className="ash-logo-tag">Admin</span>
        </Link>

        <div className="ash-brand">
          {currentUser?.avatar ? (
            <img
              className="ash-avatar"
              src={currentUser.avatar}
              alt={currentUser.name || "Admin"}
            />
          ) : (
            <span className="ash-avatar ash-avatar--fallback">
              {(currentUser?.name?.trim()?.[0] || "A").toUpperCase()}
            </span>
          )}
          <div className="ash-brand-text">
            <span className="ash-brand-name">
              {currentUser?.name || "Admin"}
            </span>
            <span className="ash-brand-role">Platform Administrator</span>
          </div>
        </div>

        <nav className="ash-nav">
          <span className="ash-nav-heading">Management</span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const sectionBadge =
              item.to === "/admin/visits"
                ? counts.visits || 0
                : item.to === "/admin/matches"
                  ? counts.matches || 0
                  : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `ash-navlink${isActive ? " ash-navlink--active" : ""}`
                }
                onClick={() => setNavOpen(false)}
              >
                <Icon size={17} className="ash-navicon" />
                <span>{item.label}</span>
                {sectionBadge > 0 && (
                  <span className="ash-navlink-badge">
                    {sectionBadge > 9 ? "9+" : sectionBadge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="ash-sidebar-foot">
          <div className="ash-theme" role="radiogroup" aria-label="Panel theme">
            <button
              type="button"
              role="radio"
              aria-checked={theme === "light"}
              className={`ash-theme-opt${theme === "light" ? " ash-theme-opt--active" : ""}`}
              onClick={() => setThemePref("light")}
            >
              <FiSun size={14} />
              <span>Light</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === "dark"}
              className={`ash-theme-opt${theme === "dark" ? " ash-theme-opt--active" : ""}`}
              onClick={() => setThemePref("dark")}
            >
              <FiMoon size={14} />
              <span>Dark</span>
            </button>
          </div>

          <Link
            to="/admin/account"
            className={`ash-foot-link ash-foot-account${
              location.pathname.startsWith("/admin/account")
                ? " ash-foot-account--active"
                : ""
            }`}
            onClick={() => setNavOpen(false)}
          >
            <FiUser size={16} />
            <span>Account</span>
          </Link>
          <Link
            to="/"
            className="ash-foot-link"
            onClick={() => setNavOpen(false)}
          >
            <FiChevronRight size={15} />
            <span>Back to site</span>
          </Link>
          <button
            type="button"
            className="ash-foot-logout"
            onClick={handleLogout}
          >
            <FiLogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Scrolling main column ── */}
      <div className="ash-main">
        <div className="ash-topbar">
          <button
            type="button"
            className="ash-hamburger"
            aria-label="Toggle menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <div className="ash-topbar-title">{activeLabel}</div>
          <div className="ash-topbar-spacer" />
          <span className="ash-topbar-badge">Admin</span>
        </div>

        {navOpen && (
          <div
            className="ash-scrim"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="ash-content">
          <Outlet />
        </div>
      </div>

      <MobileBottomNav
        hidden={navOpen}
        dashboardPath="/admin"
        profilePath="/admin/account"
      />
    </div>
  );
}