import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  FiX,
} from "react-icons/fi";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import MobileBottomNav from "./MobileBottomNav";
import NotificationBell from "../navbar/NotificationBell";

function AnnouncementBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="bg-primary-600 text-white text-center py-2 px-4 text-sm">
      <span className="inline-flex items-center gap-2">
        <span className="hidden sm:inline">Welcome to ApnaBnB</span>
        <span className="sm:hidden">Welcome!</span>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 h-5 w-5 inline-flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [stageLive, setStageLive] = useState(false);
  const headerRef = useRef(null);
  const { currentUser, isAuthenticated, getDashboardPath } = useAuth();
  const location = useLocation();
  const dashboardPath = isAuthenticated ? getDashboardPath() : "/login";

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty(
          "--app-header-h",
          `${headerRef.current.offsetHeight}px`
        );
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
      const live = document.documentElement.classList.contains(
        "abn-stage-live",
      );
      setStageLive((prev) => (prev === live ? prev : live));
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  const hasOwnBottomCta = /^\/(property|listing)\//.test(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {location.pathname !== "/" && <AnnouncementBanner />}

      {/* Header */}
      <header
        ref={headerRef}
        className={`app-header sticky top-0 z-40 transition-all duration-300 ${
          stageLive
            ? "bg-transparent border-b border-transparent"
            : scrolled
              ? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-slate-100"
              : "bg-white border-b border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xl font-bold font-heading transition-colors duration-300 ${
                  stageLive ? "text-white" : "text-slate-900"
                }`}
              >
                Apna<span className="text-primary-600">BnB</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? stageLive
                        ? "text-primary-300 bg-white/10"
                        : "text-primary-600 bg-primary-50"
                      : stageLive
                        ? "text-slate-200 hover:text-white hover:bg-white/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

{/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <NotificationBell />
              {isAuthenticated ? (
                <>
                  <Link
                    to={dashboardPath}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      stageLive
                        ? "text-primary-300 hover:bg-white/10"
                        : "text-primary-600 hover:bg-primary-50"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link to="/account" className="shrink-0">
                    <Avatar
                      src={currentUser?.avatar}
                      name={currentUser?.name}
                      size="sm"
                    />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      stageLive
                        ? "text-white hover:text-white hover:bg-white/10"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Avatar/notifications (no hamburger — bottom nav handles primary nav) */}
            <div className="md:hidden flex items-center gap-2">
              <NotificationBell />
              {isAuthenticated && (
                <Link to="/account" className="shrink-0">
                  <Avatar
                    src={currentUser?.avatar}
                    name={currentUser?.name}
                    size="sm"
                  />
                </Link>
              )}
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    stageLive
                      ? "text-white hover:bg-white/10"
                      : "text-primary-600 hover:bg-primary-50"
                  }`}
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="app-header-spacer" aria-hidden="true" />

      {/* Main Content */}
      <main className={`flex-1 ${!hasOwnBottomCta ? "pb-20 md:pb-0" : ""}`}>
        <Outlet />
      </main>

      {/* Footer — hidden on mobile where bottom nav is visible */}
      <footer className="hidden md:block bg-slate-900 text-slate-400"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="text-lg font-bold text-white font-heading">
                Apna<span className="text-primary-400">BnB</span>
              </span>
              <p className="mt-3 text-sm leading-relaxed">
                Pakistan's trusted platform for property buying, selling, and renting.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Company</h3>
              <ul className="space-y-2">
                {["About", "Contact", "Careers"].map((item) => (
                  <li key={item}>
                    <Link
                      to={`/${item.toLowerCase()}`}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Explore</h3>
              <ul className="space-y-2">
                {["Homes for Sale", "Homes for Rent", "Plots", "Commercial"].map((item) => (
                  <li key={item}>
                    <Link to="/search" className="text-sm hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Support</h3>
              <ul className="space-y-2">
                {["Help Center", "Privacy Policy", "Terms of Service"].map((item) => (
                  <li key={item}>
                    <Link to="/legal/terms" className="text-sm hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} ApnaBnB. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {["Facebook", "Twitter", "Instagram"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-xs text-slate-500 hover:text-white transition-colors"
                  aria-label={social}
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav
        hidden={hasOwnBottomCta}
        dashboardPath={dashboardPath}
        profilePath="/account"
      />
    </div>
  );
}
