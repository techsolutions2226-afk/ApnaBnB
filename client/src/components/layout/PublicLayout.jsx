import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";
import MobileBottomNav from "./MobileBottomNav";
import NotificationBell from "../navbar/NotificationBell";
import "../../styles/PublicNav.css";

function AnnouncementBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="pub-announce">
      <span className="pub-announce__row">
        <span className="hidden sm:inline">Welcome to ApnaBnB</span>
        <span className="sm:hidden">Welcome!</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="pub-announce__close"
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
          `${headerRef.current.offsetHeight}px`,
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
      const live = document.documentElement.classList.contains("abn-stage-live");
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

  const isActive = (to) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const hasOwnBottomCta = /^\/(property|listing)\//.test(location.pathname);

  const headerMod = stageLive
    ? "pub-header--stage"
    : scrolled
      ? "pub-header--scrolled"
      : "pub-header--rest";

  return (
    <div className="min-h-screen flex flex-col">
      {location.pathname !== "/" && <AnnouncementBanner />}

      <header ref={headerRef} className={`pub-header app-header ${headerMod}`}>
        <div className="pub-header__inner">
          <Link to="/" className="pub-brand" aria-label="ApnaBnB home">
            <Logo size={44} />
          </Link>

          <nav className="pub-nav" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`pub-nav__link${
                  isActive(link.to) ? " pub-nav__link--active" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pub-actions">
            <NotificationBell />
            {isAuthenticated ? (
              <>
                <Link to={dashboardPath} className="pub-btn pub-btn--soft">
                  Dashboard
                </Link>
                <Link to="/account" className="pub-avatar" aria-label="Account">
                  <Avatar
                    src={currentUser?.avatar}
                    name={currentUser?.name}
                    size="sm"
                  />
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="pub-btn pub-btn--ghost">
                  Log in
                </Link>
                <Link to="/signup" className="pub-btn pub-btn--solid">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <div className="pub-actions pub-actions--mobile">
            <NotificationBell />
            {isAuthenticated ? (
              <Link to="/account" className="pub-avatar" aria-label="Account">
                <Avatar
                  src={currentUser?.avatar}
                  name={currentUser?.name}
                  size="sm"
                />
              </Link>
            ) : (
              <Link to="/login" className="pub-btn pub-btn--soft">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 ${!hasOwnBottomCta ? "pb-20 md:pb-0" : ""}`}>
        <Outlet />
      </main>

      {/* Footer — hidden on mobile where bottom nav is visible */}
      <footer className="hidden md:block bg-slate-900 text-slate-400"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" aria-label="ApnaBnB home" className="inline-flex">
                <Logo size={36} />
              </Link>
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
