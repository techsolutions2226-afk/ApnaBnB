import { useState, useRef, useEffect } from "react";
import { NavLink, Link, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { FiChevronDown, FiSettings, FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import {
  NAV_BY_ROLE,
  ROLE_META,
  ROLES,
  memberRole,
  allowedViewRoles,
  clampViewRole,
} from "./dashboardNav";
import { readViewRole, writeViewRole } from "../../utils/viewRoleStore";
import NotificationBell from "../navbar/NotificationBell";
import MobileBottomNav from "../layout/MobileBottomNav";
import Logo from "../common/Logo";
import LanguageSwitcher from "../common/LanguageSwitcher";
import Seo from "../seo/Seo";
import { privateAreaTitle } from "../../config/seo";

const THEME_KEY = "apnabnb_admin_theme";

/**
 * DashboardShell — the member dashboard shell.
 *
 * This outer component is only a role guard. It calls two hooks and nothing
 * else, so the early return below can never trip the rules of hooks; all the
 * real state lives in MemberDashboardShell.
 *
 * Admins do not belong in here. /account/* is mounted ONLY under this shell
 * (App.jsx), behind a ProtectedRoute with no `roles` prop, so an admin who
 * types /account walks straight in — and the hat resolution downstream used to
 * coerce them to "buyer" and then dress them in whatever role the last person
 * on this browser left in localStorage. That is how an admin ended up looking
 * at the seller dashboard.
 *
 * The account pages have a real admin home at /admin/account (the very same
 * components — see useAccountPath), so those redirect there. Everything else
 * in this shell is member-only (listings, requirements, plans), so /admin is
 * the honest destination.
 */
export default function DashboardShell() {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (currentUser?.role === "admin") {
    const target = location.pathname.startsWith("/account")
      ? `/admin${location.pathname}${location.search}`
      : "/admin";
    return <Navigate to={target} replace />;
  }

  return <MemberDashboardShell />;
}

/**
 * MemberDashboardShell — standalone dashboard app shell with a FIXED left
 * sidebar and a scrolling content area on the right. It renders no global
 * navbar/footer — the sidebar (with the apnabnb logo linking home) is the only
 * chrome.
 *
 * The top-right "Viewing as" selector is constrained by permanent account role:
 * sellers/buyers may switch between those two hats; dealers stay dealer-only.
 */
function MemberDashboardShell() {
  const { t } = useTranslation("dashboard");
  const { currentUser, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { sectionCounts, markSectionRead } = useNotifications();

  useEffect(() => {
    if (
      location.pathname.startsWith("/trips") ||
      location.pathname.startsWith("/visits")
    ) {
      markSectionRead("trip");
    } else if (location.pathname.startsWith("/matches")) {
      markSectionRead("match");
    }
  }, [location.pathname, markSectionRead]);

  // null only for a non-member account, and the guard above already redirected
  // those, so this fallback is unreachable rather than load-bearing.
  const realRole = memberRole(currentUser?.role) || "buyer";

  const switchableRoles = allowedViewRoles(realRole);
  const canSwitchRoles = switchableRoles.length > 1;

  const resolveInitialView = () => {
    let candidate = null;
    if (currentUser?.viewRole && ROLES.includes(currentUser.viewRole)) {
      candidate = currentUser.viewRole;
    } else {
      // Scoped to this user: a shared browser must not hand one account the
      // hat another account left behind.
      const stored = readViewRole(currentUser?.id);
      if (stored && ROLES.includes(stored)) candidate = stored;
    }
    return clampViewRole(realRole, candidate) || realRole;
  };

  const [viewRole, setViewRoleState] = useState(resolveInitialView);

  const setViewRole = (role) => {
    if (!switchableRoles.includes(role)) return;
    setViewRoleState(role);
    writeViewRole(currentUser?.id, role);
    if (currentUser?.viewRole !== role) {
      updateProfile({ viewRole: role }).catch(() => {});
    }
  };

  // Clamp illegal DB/localStorage hats (e.g. buyer with viewRole=dealer) and persist.
  useEffect(() => {
    const clamped = clampViewRole(realRole, viewRole) || realRole;
    if (clamped !== viewRole) {
      setViewRole(clamped);
      return;
    }
    if (
      currentUser?.viewRole &&
      !switchableRoles.includes(currentUser.viewRole)
    ) {
      updateProfile({ viewRole: clamped }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realRole, currentUser?.id]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "light";
    } catch {
      return "light";
    }
  });
  const selectRef = useRef(null);
  const isDark = theme === "dark";

  const setThemePref = (value) => {
    setTheme(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      /* ignore */
    }
  };

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
  const meta = ROLE_META[viewRole] || ROLE_META[realRole];
  const RoleIcon = meta.icon;

  const pickRole = (role) => {
    setViewRole(role);
    setMenuOpen(false);
    setNavOpen(false);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={`flex h-screen font-sans ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
      data-theme={theme}
    >
      <Seo
        title={privateAreaTitle(location.pathname)}
        description="Private ApnaBnB workspace. Sign in required."
        path={location.pathname}
        noindex
      />
      <aside
        className={`fixed left-0 top-0 z-[60] h-full w-72 flex flex-col bg-slate-900 text-slate-400 transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ "--role-accent": meta.accent }}
        aria-label={t("nav.ariaLabel")}
      >
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-5 border-b border-white/[0.08]"
          aria-label={t("common:nav.homeAriaLabel")}
          onClick={() => setNavOpen(false)}
        >
          <Logo size={40} />
        </Link>

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
            <p className="text-xs text-slate-400">{t(meta.labelKey)}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label={t("nav.mainAriaLabel")}>
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
                key={item.to + item.labelKey}
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
                <Icon size={17} aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
                {sectionBadge > 0 && (
                  <span className="ml-auto min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-accent-500 text-white text-xs font-bold">
                    {sectionBadge > 9 ? "9+" : sectionBadge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.08] space-y-1 pb-[calc(0.75rem+4.5rem+env(safe-area-inset-bottom,0px))] md:pb-3">
          {/* Sits with the theme toggle: both are "how this panel looks/reads"
              rather than navigation. */}
          <LanguageSwitcher tone="dark" className="mb-2" />
          <div
            className="flex flex-nowrap items-stretch gap-1 p-[3px] mb-2 rounded-[10px] border border-white/12 bg-black/35"
            role="radiogroup"
            aria-label={t("nav.panelTheme")}
          >
            <button
              type="button"
              role="radio"
              aria-checked={theme === "light"}
              className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[7px] text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                theme === "light"
                  ? "bg-primary-600 text-white"
                  : "bg-transparent text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => setThemePref("light")}
            >
              <FiSun size={14} />
              <span>{t("menu.lightMode")}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === "dark"}
              className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[7px] text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                theme === "dark"
                  ? "bg-primary-600 text-white"
                  : "bg-transparent text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => setThemePref("dark")}
            >
              <FiMoon size={14} />
              <span>{t("menu.darkMode")}</span>
            </button>
          </div>
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

      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <header
          className={`flex h-14 sm:h-16 items-center gap-3 px-4 sm:px-6 border-b sticky top-0 z-[40] ${
            isDark
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <button
            type="button"
            className={`lg:hidden p-2 rounded-lg ${
              isDark
                ? "text-slate-400 hover:bg-slate-800"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            aria-label={t("nav.toggleMenu")}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="block h-0.5 w-6 bg-current mb-1.5" />
            <span className="block h-0.5 w-6 bg-current mb-1.5" />
            <span className="block h-0.5 w-6 bg-current" />
          </button>

          <div className="flex-1" />

          {currentUser && <NotificationBell />}

          <div className="relative" ref={selectRef}>
            <span className="sr-only">{t("roles.viewingAs")}</span>
            {canSwitchRoles ? (
              <>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                    isDark
                      ? "text-slate-200 bg-slate-800 border-slate-700 hover:bg-slate-700"
                      : "text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                  style={{ "--role-accent": meta.accent }}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: meta.accent }}
                  />
                  <RoleIcon
                    size={15}
                    className={isDark ? "text-slate-300" : "text-slate-600"}
                  />
                  <span>{t(meta.labelKey)}</span>
                  <FiChevronDown
                    size={15}
                    className={`transition-transform ${
                      menuOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {menuOpen && (
                  <ul
                    className={`absolute right-0 mt-1.5 w-48 origin-top-right rounded-lg border shadow-lg overflow-hidden animate-slide-down ${
                      isDark
                        ? "bg-slate-900 border-slate-700 ring-1 ring-slate-800"
                        : "bg-white border-slate-200 ring-1 ring-slate-100"
                    }`}
                    role="listbox"
                  >
                    {switchableRoles.map((role) => {
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
                                : isDark
                                  ? "text-slate-200 hover:bg-slate-800"
                                  : "text-slate-700 hover:bg-slate-50"
                            }`}
                            style={{ "--role-accent": m.accent }}
                            onClick={() => pickRole(role)}
                          >
                            <Icon size={15} className="text-slate-500" />
                            <span>{t(m.labelKey)}</span>
                            {role === realRole && (
                              <span className="ml-auto text-xs text-slate-400">
                                {t("roles.yourRole")}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border ${
                  isDark
                    ? "text-slate-200 bg-slate-800 border-slate-700"
                    : "text-slate-700 bg-white border-slate-200"
                }`}
                style={{ "--role-accent": meta.accent }}
                aria-label={t(meta.labelKey)}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.accent }}
                />
                <RoleIcon
                  size={15}
                  className={isDark ? "text-slate-300" : "text-slate-600"}
                />
                <span>{t(meta.labelKey)}</span>
              </div>
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

        <main
          className={`flex-1 overflow-y-auto px-3 py-4 sm:p-6 pb-24 md:pb-6 ${
            isDark ? "bg-slate-950 text-slate-100" : ""
          }`}
        >
          <Outlet context={{ viewRole, setViewRole, realRole }} />
        </main>
      </div>

      <MobileBottomNav hidden={navOpen} />
    </div>
  );
}
