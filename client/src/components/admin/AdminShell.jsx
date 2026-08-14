import { useState } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FiLayout,
  FiUsers,
  FiHome,
  FiFileText,
  FiLink,
  FiMail,
  FiActivity,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronRight,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import "../../styles/AdminShell.css";

const NAV_ITEMS = [
  { to: "/admin", end: true, label: "Overview", icon: FiLayout },
  { to: "/admin/users", label: "Users", icon: FiUsers },
  { to: "/admin/listings", label: "Listings", icon: FiHome },
  { to: "/admin/requirements", label: "Requirements", icon: FiFileText },
  { to: "/admin/matches", label: "Matches", icon: FiLink },
  { to: "/admin/messages", label: "Messages", icon: FiMail },
  { to: "/admin/logs", label: "System Logs", icon: FiActivity },
];

/* ─── AdminShell — standalone admin management panel.
   Fixed navy sidebar + scrolling content column, brand green accents.
   Renders inside the existing ProtectedRoute(roles=["admin"]) wrapper in
   App.jsx, so no re-auth logic is needed here. ───────────────────────────── */
export default function AdminShell() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /* Path breadcrumb for the topbar title. */
  const crumbs = NAV_ITEMS.filter(
    (item) =>
      location.pathname === item.to ||
      (item.to !== "/admin" && location.pathname.startsWith(item.to))
  );
  const activeLabel = crumbs.length ? crumbs[0].label : "Overview";

  return (
    <div className="ash-shell">
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
              </NavLink>
            );
          })}
        </nav>

        <div className="ash-sidebar-foot">
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
    </div>
  );
}