import { useState, useRef, useEffect } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
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
import SidebarEdge from "../common/SidebarEdge";
import DashboardSidebar from "./DashboardSidebar";
import useResizableSidebar from "../../hooks/useResizableSidebar";
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

  /* Desktop sidebar: open ↔ icon rail and drag-to-resize, remembered per
     browser. Below lg the sidebar stays the slide-in drawer (navOpen). */
  const sidebar = useResizableSidebar({
    storageKey: "apnabnb_dashboard_sidebar",
    defaultWidth: 288,
    desktopQuery: "(min-width: 1024px)",
  });
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

  /* Lock page scroll while the mobile drawer is open. Without this, iOS/Android
     rubber-band / overscroll moves the fixed sidebar slightly with the page. */
  useEffect(() => {
    if (!navOpen) return undefined;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overscrollBehavior = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [navOpen]);

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
      className={`flex h-screen h-[100dvh] overflow-hidden font-sans ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
      data-theme={theme}
    >
      <Seo
        title={privateAreaTitle(location.pathname)}
        description="Private ApnaBnB workspace. Sign in required."
        path={location.pathname}
        noindex
      />
      <DashboardSidebar
        currentUser={currentUser}
        meta={meta}
        items={items}
        sectionCounts={sectionCounts}
        theme={theme}
        onThemeChange={setThemePref}
        navOpen={navOpen}
        onNavigate={() => setNavOpen(false)}
        onLogout={handleLogout}
        desktopWidth={sidebar.isDesktop ? sidebar.width : undefined}
        collapsed={sidebar.isDesktop && sidebar.collapsed}
        resizing={sidebar.resizing}
      />
      <SidebarEdge
        sidebar={sidebar}
        collapseLabel={t("nav.collapseSidebar")}
        expandLabel={t("nav.expandSidebar")}
        resizeLabel={t("nav.resizeSidebar")}
      />

      <div
        className="flex-1 flex flex-col min-w-0"
        style={
          sidebar.isDesktop
            ? { marginLeft: sidebar.width, transition: sidebar.resizing ? "none" : "margin-left 200ms ease" }
            : undefined
        }
      >
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
            className="fixed inset-0 z-[45] bg-black/50 touch-none overscroll-none lg:hidden"
            onClick={() => setNavOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
            aria-hidden="true"
          />
        )}

        <main
          className={`flex-1 px-3 py-4 sm:p-6 pb-24 md:pb-6 ${
            navOpen ? "overflow-hidden overscroll-none" : "overflow-y-auto"
          } ${isDark ? "bg-slate-950 text-slate-100" : ""}`}
        >
          <Outlet context={{ viewRole, setViewRole, realRole }} />
        </main>
      </div>

      <MobileBottomNav hidden={navOpen} />
    </div>
  );
}
