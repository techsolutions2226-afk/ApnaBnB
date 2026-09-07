import { Link, useLocation } from "react-router-dom";
import { FiHome, FiSearch, FiPlus, FiGrid, FiUser } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

function isPathActive(pathname, to, { prefix = false } = {}) {
  if (prefix) {
    return pathname === to || pathname.startsWith(`${to}/`);
  }
  return pathname === to;
}

function isDashboardActive(pathname, dashboardPath) {
  if (!dashboardPath || dashboardPath === "/login") return false;
  if (dashboardPath.startsWith("/admin")) {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/**
 * Mobile-only bottom bar (Home / Search / List / Dashboard / Profile).
 * Same chrome as the public homepage — reused by DashboardShell + AdminShell.
 */
export default function MobileBottomNav({
  hidden = false,
  dashboardPath: dashboardPathProp,
  profilePath = "/account",
}) {
  const { isAuthenticated, getDashboardPath } = useAuth();
  const location = useLocation();

  const dashboardPath =
    dashboardPathProp || (isAuthenticated ? getDashboardPath() : "/login");

  if (hidden) return null;

  const items = [
    { to: "/", icon: FiHome, label: "Home" },
    { to: "/search", icon: FiSearch, label: "Search" },
    { to: "/listing/new", icon: FiPlus, label: "List", isCenter: true },
    { to: dashboardPath, icon: FiGrid, label: "Dashboard", isDashboard: true },
    { to: profilePath, icon: FiUser, label: "Profile", prefix: true },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 safe-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.isDashboard
            ? isDashboardActive(location.pathname, dashboardPath)
            : isPathActive(location.pathname, item.to, { prefix: !!item.prefix });

          if (item.isCenter) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-3"
              >
                <div className="h-11 w-11 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg">
                  <FiPlus className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={`${item.label}-${item.to}`}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-[48px] ${
                isActive ? "text-primary-600" : "text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
