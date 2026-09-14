import { NavLink, Link } from "react-router-dom";
import { FiSettings, FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import Logo from "../common/Logo";

/* ═════════════════════════════════════════════════════════
   DashboardSidebar — the member dashboard's left sidebar (logo, profile
   card, role navigation, theme + account + logout). Moved out of
   DashboardShell unchanged, plus a `collapsed` icon-rail variant for desktop.

   Sizing comes from the shell: on desktop `width` (from useResizableSidebar)
   sets the width; below lg it stays the w-72 slide-in drawer driven by
   `navOpen`, exactly as before.
   ═════════════════════════════════════════════════════════ */
export default function DashboardSidebar({
  currentUser,
  meta,
  items,
  sectionCounts,
  theme,
  onThemeChange,
  navOpen,
  onNavigate,
  onLogout,
  desktopWidth, // number on desktop, undefined on mobile
  collapsed = false,
  resizing = false,
}) {
  const { t } = useTranslation("dashboard");
  const rail = collapsed;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-[60] h-[100dvh] max-h-[100dvh] w-72 flex flex-col overflow-hidden overscroll-none bg-slate-900 text-slate-400 transform transition-transform duration-200 ease-out lg:translate-x-0 ${
        navOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        "--role-accent": meta.accent,
        ...(desktopWidth !== undefined
          ? { width: desktopWidth, transition: resizing ? "none" : "width 200ms ease" }
          : {}),
      }}
      aria-label={t("nav.ariaLabel")}
    >
      <Link
        to="/"
        className={`flex items-center gap-2 py-5 border-b border-white/[0.08] ${rail ? "justify-center px-0" : "px-5"}`}
        aria-label={t("common:nav.homeAriaLabel")}
        onClick={onNavigate}
      >
        {rail ? (
          // Just the logo mark: the image is cropped to its left (icon) part.
          <span className="block w-9 overflow-hidden">
            <Logo size={36} />
          </span>
        ) : (
          <Logo size={40} />
        )}
      </Link>

      <div
        className={`flex items-center gap-3 mt-4 mb-3 bg-white/[0.05] border border-white/[0.07] rounded-xl ${
          rail ? "mx-2 justify-center px-0 py-2" : "mx-3 px-3 py-3"
        }`}
        title={rail ? currentUser?.name || "My Account" : undefined}
      >
        {currentUser?.avatar ? (
          <img
            className="h-10 w-10 shrink-0 rounded-full object-cover border border-white/[0.18]"
            src={currentUser.avatar}
            alt={currentUser.name || "Profile"}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-semibold text-sm">
            {(currentUser?.name?.trim()?.[0] || "U").toUpperCase()}
          </span>
        )}
        {!rail && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {currentUser?.name || "My Account"}
            </p>
            <p className="truncate text-xs text-slate-400">{t(meta.labelKey)}</p>
          </div>
        )}
      </div>

      <nav
        className={`flex-1 min-h-0 py-2 overflow-y-auto overflow-x-hidden overscroll-contain ${rail ? "px-2" : "px-3"}`}
        aria-label={t("nav.mainAriaLabel")}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey);
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
              title={rail ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  rail ? "justify-center px-0" : "px-3"
                } ${
                  isActive
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                    : "text-slate-400 hover:bg-white/[0.08] hover:text-white"
                }`
              }
              onClick={onNavigate}
            >
              <Icon size={17} aria-hidden="true" className="shrink-0" />
              <span className={rail ? "sr-only" : "truncate"}>{label}</span>
              {sectionBadge > 0 &&
                (rail ? (
                  <span
                    className="absolute top-1.5 right-3 h-2.5 w-2.5 rounded-full bg-accent-500 ring-2 ring-slate-900"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="ml-auto min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-accent-500 text-white text-xs font-bold">
                    {sectionBadge > 9 ? "9+" : sectionBadge}
                  </span>
                ))}
            </NavLink>
          );
        })}
      </nav>

      <div
        className={`border-t border-white/[0.08] space-y-1 pb-[calc(0.75rem+4.5rem+env(safe-area-inset-bottom,0px))] md:pb-3 ${
          rail ? "px-2 pt-3" : "p-3"
        }`}
      >
        {/* Panel theme — how this panel looks rather than navigation. */}
        <div
          className={`flex items-stretch gap-1 p-[3px] mb-2 rounded-[10px] border border-white/12 bg-black/35 ${
            rail ? "flex-col" : "flex-nowrap"
          }`}
          role="radiogroup"
          aria-label={t("nav.panelTheme")}
        >
          {[
            { value: "light", icon: FiSun, label: t("menu.lightMode") },
            { value: "dark", icon: FiMoon, label: t("menu.darkMode") },
          ].map((option) => {
            const ThemeIcon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={theme === option.value}
                title={rail ? option.label : undefined}
                className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[7px] text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                  theme === option.value
                    ? "bg-primary-600 text-white"
                    : "bg-transparent text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => onThemeChange(option.value)}
              >
                <ThemeIcon size={14} className="shrink-0" />
                <span className={rail ? "sr-only" : "truncate"}>{option.label}</span>
              </button>
            );
          })}
        </div>
        <Link
          to="/account"
          title={rail ? "Account" : undefined}
          className={`flex items-center gap-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.08] hover:text-white rounded-lg transition-colors ${
            rail ? "justify-center px-0" : "px-3"
          }`}
          onClick={onNavigate}
        >
          <FiSettings size={16} className="shrink-0" />
          <span className={rail ? "sr-only" : undefined}>Account</span>
        </Link>
        <button
          type="button"
          title={rail ? "Log out" : undefined}
          className={`flex w-full items-center gap-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/[0.15] hover:text-red-300 rounded-lg transition-colors ${
            rail ? "justify-center px-0" : "px-3"
          }`}
          onClick={onLogout}
        >
          <FiLogOut size={16} className="shrink-0" />
          <span className={rail ? "sr-only" : undefined}>Log out</span>
        </button>
      </div>
    </aside>
  );
}
