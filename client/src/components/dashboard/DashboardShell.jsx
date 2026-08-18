import { useState, useRef, useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { FiChevronDown, FiSettings, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { NAV_BY_ROLE, ROLE_META, ROLES } from "./dashboardNav";
import "../../styles/DashboardShell.css";

const STORAGE_KEY = "dash_view_role";

/**
 * DashboardShell — standalone dashboard app shell with a FIXED left sidebar and
 * a scrolling content area on the right. It renders no global navbar/footer —
 * the sidebar (with the apnabnb logo linking home) is the only chrome.
 *
 * Purely presentational: it wraps the existing routed pages via <Outlet/> and
 * changes none of their logic. The top-right "Viewing as" selector is a
 * CLIENT-ONLY view switch (sidebar + dashboard body); it never touches the
 * backend or the account's real role, and is persisted to localStorage.
 */
export default function DashboardShell() {
  const { currentUser, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const realRole =
    currentUser?.role && ROLES.includes(currentUser.role)
      ? currentUser.role
      : "buyer";

  /* Initial hat: DB-persisted viewRole wins, then the local cache, then the
     account role. */
  const [viewRole, setViewRoleState] = useState(() => {
    if (currentUser?.viewRole && ROLES.includes(currentUser.viewRole)) {
      return currentUser.viewRole;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && ROLES.includes(stored) ? stored : realRole;
    } catch {
      return realRole;
    }
  });

  const setViewRole = (role) => {
    if (!ROLES.includes(role)) return;
    setViewRoleState(role);
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      /* ignore quota / private-mode errors */
    }
    // Persist the chosen hat to the user record so it follows them across
    // devices and sessions (fire-and-forget; local state is already updated).
    if (currentUser?.viewRole !== role) {
      updateProfile({ viewRole: role }).catch(() => {
        /* non-fatal — localStorage keeps the pick for this device */
      });
    }
  };

  const [menuOpen, setMenuOpen] = useState(false); // role selector dropdown
  const [navOpen, setNavOpen] = useState(false); // mobile drawer
  const selectRef = useRef(null);

  /* Close the role dropdown on outside click. */
  useEffect(() => {
    const onDown = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const items = NAV_BY_ROLE[viewRole] || [];
  const meta = ROLE_META[viewRole];
  const RoleIcon = meta.icon;

  const pickRole = (role) => {
    setViewRole(role);
    setMenuOpen(false);
    setNavOpen(false);
    // Land on the role-agnostic dashboard surface so the body reflects the pick.
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dash-shell">
      {/* ── Fixed sidebar ── */}
      <aside
        className={`dash-shell-sidebar${navOpen ? " dash-shell-sidebar--open" : ""}`}
        style={{ "--role-accent": meta.accent }}
      >
        {/* apnabnb logo → home */}
        <Link
          to="/"
          className="dash-shell-logo"
          aria-label="apnabnb home"
          onClick={() => setNavOpen(false)}
        >
          <span className="dash-shell-logo-word">apnabnb</span>
        </Link>

        <div className="dash-shell-brand">
          {currentUser?.avatar ? (
            <img
              className="dash-shell-avatar"
              src={currentUser.avatar}
              alt={currentUser.name || "Profile"}
            />
          ) : (
            <span className="dash-shell-avatar dash-shell-avatar--fallback">
              {(currentUser?.name?.trim()?.[0] || "U").toUpperCase()}
            </span>
          )}
          <div className="dash-shell-brand-text">
            <span className="dash-shell-brand-name">
              {currentUser?.name || "My Account"}
            </span>
            <span className="dash-shell-brand-role">{meta.label} workspace</span>
          </div>
        </div>

        <nav className="dash-shell-nav">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `dash-shell-navlink${isActive ? " dash-shell-navlink--active" : ""}`
                }
                onClick={() => setNavOpen(false)}
              >
                <Icon size={17} className="dash-shell-navicon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Account + logout (the navbar is gone, so these live here) */}
        <div className="dash-shell-sidebar-foot">
          <Link
            to="/account"
            className="dash-shell-foot-link"
            onClick={() => setNavOpen(false)}
          >
            <FiSettings size={16} />
            <span>Account</span>
          </Link>
          <button
            type="button"
            className="dash-shell-foot-logout"
            onClick={handleLogout}
          >
            <FiLogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Scrolling main column ── */}
      <div className="dash-shell-main">
        <div className="dash-shell-topbar">
          <button
            type="button"
            className="dash-shell-hamburger"
            aria-label="Toggle menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="dash-shell-topbar-spacer" />

          <div className="dash-shell-roleselect" ref={selectRef}>
            <span className="dash-shell-roleselect-label">Viewing as</span>
            <button
              type="button"
              className="dash-shell-roleselect-btn"
              style={{ "--role-accent": meta.accent }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
            >
              <span className="dash-shell-roleselect-dot" />
              <RoleIcon size={15} />
              <span>{meta.label}</span>
              <FiChevronDown
                size={15}
                style={{
                  transform: menuOpen ? "rotate(180deg)" : "none",
                  transition: "transform .15s",
                }}
              />
            </button>

            {menuOpen && (
              <ul className="dash-shell-roleselect-menu" role="listbox">
                {ROLES.map((role) => {
                  const m = ROLE_META[role];
                  const Icon = m.icon;
                  return (
                    <li key={role}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={role === viewRole}
                        className={`dash-shell-roleselect-item${
                          role === viewRole
                            ? " dash-shell-roleselect-item--active"
                            : ""
                        }`}
                        style={{ "--role-accent": m.accent }}
                        onClick={() => pickRole(role)}
                      >
                        <Icon size={15} />
                        <span>{m.label}</span>
                        {role === realRole && (
                          <span className="dash-shell-roleselect-you">
                            your role
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {navOpen && (
          <div
            className="dash-shell-scrim"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="dash-shell-content">
          <Outlet context={{ viewRole, setViewRole, realRole }} />
        </div>
      </div>
    </div>
  );
}
