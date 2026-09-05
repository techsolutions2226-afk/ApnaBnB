import { useState, useRef, useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { FiChevronDown, FiSettings, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import { NAV_BY_ROLE, ROLE_META, ROLES } from "./dashboardNav";
import NotificationBell from "../navbar/NotificationBell";

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
  const location = useLocation();

  /* Per-section unread badges (Visits → trip notifications, Matches → match
     notifications). Live over the notification socket; each badge clears when
     its section is opened below. */
  const { sectionCounts, markSectionRead } = useNotifications();

  /* When the user opens the Matches or Visits section, mark that section's
     notifications read so its badge clears. */
  useEffect(() => {
    if (location.pathname.startsWith("/trips")) {
      markSectionRead("trip");
    } else if (location.pathname.startsWith("/matches")) {
      markSectionRead("match");
    }
  }, [location.pathname, markSectionRead]);

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
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* ── Fixed sidebar (dark theme) ── */}
      <aside
        className={`fixed left-0 top-0 z-[50] h-full w-72 flex flex-col bg-slate-900 text-slate-400 transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ "--role-accent": meta.accent }}
        aria-label="Dashboard navigation"
      >
        {/* apnabnb logo → home */}
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-5 border-b border-white/[0.08]"
          aria-label="apnabnb home"
          onClick={() => setNavOpen(false)}
        >
          <span className="text-xl font-bold text-white font-heading">
            Apna<span className="text-primary-400">BnB</span>
          </span>
        </Link>

        {/* User profile */}
        <div className="flex items-center gap-3 mx-3 mt-4 mb-3 px-3 py-3 bg-white/[0.05] border border-white/[0.07] rounded-xl">
          {currentUser?.avatar ? (
            <img
              className="h-10 w-10 rounded-full object-cover border border-white/[0.18]"
              src={currentUser.avatar}
              alt={currentUser.name || "Profile"}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white font-semibold text-sm">
              {(currentUser?.name?.trim()?.[0] || "U").toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {currentUser?.name || "My Account"}
            </p>
            <p className="text-xs text-slate-400">
              {meta.label} workspace
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label="Main navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const sectionBadge =
              item.to === "/trips"
                ? sectionCounts.trip || 0
                : item.to === "/matches"
                  ? sectionCounts.match || 0
                  : 0;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                      : "text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`
                }
                onClick={() => setNavOpen(false)}
              >
                <Icon
                  size={17}
                  className={({ isActive }) =>
                    isActive ? "text-white" : "text-slate-500"
                  }
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {sectionBadge > 0 && (
                  <span className="ml-auto min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-accent-500 text-white text-xs font-bold">
                    {sectionBadge > 9 ? "9+" : sectionBadge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Account + logout */}
        <div className="p-3 border-t border-white/[0.08] space-y-1">
          <Link
            to="/account"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.08] hover:text-white rounded-lg transition-colors"
            onClick={() => setNavOpen(false)}
          >
            <FiSettings size={16} />
            <span>Account</span>
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/[0.15] hover:text-red-300 rounded-lg transition-colors"
            onClick={handleLogout}
          >
            <FiLogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Scrolling main column ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <header className="flex h-14 sm:h-16 items-center gap-3 px-4 sm:px-6 border-b border-slate-200 bg-white sticky top-0 z-[40]">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Toggle menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="block h-0.5 w-6 bg-current mb-1.5" />
            <span className="block h-0.5 w-6 bg-current mb-1.5" />
            <span className="block h-0.5 w-6 bg-current" />
          </button>

          <div className="flex-1" />

          {/* Notifications were only reachable from the public navbar, which the
              dashboard shell doesn't render. The bell is self-contained (it
              carries its own styling), so it drops in as-is. */}
          {currentUser && <NotificationBell />}

          <div className="relative" ref={selectRef}>
            <span className="sr-only">Viewing as</span>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              style={{ "--role-accent": meta.accent }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: meta.accent }}
              />
              <RoleIcon size={15} className="text-slate-600" />
              <span>{meta.label}</span>
              <FiChevronDown
                size={15}
                className={`transition-transform ${
                  menuOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {menuOpen && (
              <ul
                className="absolute right-0 mt-1.5 w-48 origin-top-right rounded-lg bg-white border border-slate-200 shadow-lg ring-1 ring-slate-100 overflow-hidden animate-slide-down"
                role="listbox"
              >
                {ROLES.map((role) => {
                  const m = ROLE_META[role];
                  const Icon = m.icon;
                  return (
                    <li key={role}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={role === viewRole}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                          role === viewRole
                            ? "bg-primary-50 text-primary-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                        style={{ "--role-accent": m.accent }}
                        onClick={() => pickRole(role)}
                      >
                        <Icon size={15} className="text-slate-500" />
                        <span>{m.label}</span>
                        {role === realRole && (
                          <span className="ml-auto text-xs text-slate-400">
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
        </header>

        {navOpen && (
          <div
            className="fixed inset-0 z-[45] bg-black/50 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet context={{ viewRole, setViewRole, realRole }} />
        </main>
      </div>
    </div>
  );
}