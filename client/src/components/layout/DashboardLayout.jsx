import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, Fragment } from "react";
import {
  FiHome,
  FiPlus,
  FiSearch,
  FiUser,
  FiBell,
  FiGrid,
  FiList,
  FiHeart,
  FiCalendar,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiMenu,
  FiX,
} from "react-icons/fi";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

const bottomNavItems = [
  { to: "/", icon: FiHome, label: "Home" },
  { to: "/search", icon: FiSearch, label: "Search" },
  { to: "/listing/new", icon: FiPlus, label: "List", isCenter: true },
  { to: "/dashboard", icon: FiGrid, label: "Dashboard" },
  { to: "/account", icon: FiUser, label: "Profile" },
];

const sidebarNavItems = [
  { section: "Main", items: [
    { to: "/dashboard", icon: FiHome, label: "Dashboard" },
    { to: "/my-listings", icon: FiList, label: "My Listings" },
    { to: "/my-requirements", icon: FiGrid, label: "My Requirements" },
    { to: "/matches", icon: FiSearch, label: "Matches" },
  ]},
  { section: "Saves", items: [
    { to: "/wishlists", icon: FiHeart, label: "Wishlists" },
    { to: "/trips", icon: FiCalendar, label: "Trips" },
  ]},
  { section: "Account", items: [
    { to: "/account", icon: FiSettings, label: "Settings" },
  ]},
];

function MobileTopBar({ onMenuToggle }) {
  const { currentUser } = useAuth();
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200">
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 font-heading">
            Apna<span className="text-primary-600">BnB</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <FiBell className="h-4.5 w-4.5" />
          </button>
          <Link to="/account" className="shrink-0">
            <Avatar src={currentUser?.avatar} name={currentUser?.name} size="sm" />
          </Link>
          <button
            onClick={onMenuToggle}
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DesktopSidebar({ navOpen, onClose }) {
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  return (
    <>
      {/* Scrim */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-overlay z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200
          flex flex-col transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto
          ${navOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 font-heading">
              Apna<span className="text-primary-600">BnB</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* User */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar src={currentUser?.avatar} name={currentUser?.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {currentUser?.name}
              </p>
              <p className="text-xs text-slate-500 capitalize truncate">
                {currentUser?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Dashboard navigation">
          {sidebarNavItems.map((group) => (
            <div key={group.section} className="mb-4">
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.section}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-colors mb-0.5 ${
                      isActive
                        ? "text-primary-600 bg-primary-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm font-medium text-slate-600 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <FiLogOut className="h-4.5 w-4.5 shrink-0" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

export default function DashboardLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const isDetailPage = /^\/(listing|requirements|view)\//.test(location.pathname);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <DesktopSidebar navOpen={false} onClose={() => {}} />
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <MobileTopBar onMenuToggle={() => setNavOpen(!navOpen)} />

        {/* Mobile sidebar drawer */}
        <DesktopSidebar navOpen={navOpen} onClose={() => setNavOpen(false)} />

        {/* Content */}
        <main className="flex-1 pb-20">
          <Outlet />
        </main>

        {/* Bottom Nav */}
        {!isDetailPage && (
          <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 safe-bottom" aria-label="Mobile navigation">
            <div className="flex items-center justify-around h-16">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                if (item.isCenter) {
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex flex-col items-center justify-center -mt-4"
                    >
                      <div className="h-11 w-11 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg">
                        <FiPlus className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 mt-1">
                        {item.label}
                      </span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
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
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-1 lg:pl-64">
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
