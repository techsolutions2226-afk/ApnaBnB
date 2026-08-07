import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { FiX } from "react-icons/fi";
import Navbar from "../navbar/Navbar";
import Footer from "../footer/Footer";

const AnnouncementBanner = ({ onDismiss }) => (
  <div className="announcement-banner">
    <div className="announcement-banner-inner">
      <span className="announcement-banner-dot" aria-hidden="true" />
      <span className="announcement-banner-text">
        <strong>New</strong> · Now featuring 48,000+ verified listings across
        Pakistan — buy or rent on a single platform.
      </span>
      <button
        type="button"
        className="announcement-banner-close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <FiX size={14} />
      </button>
    </div>
  </div>
);

const Layout = () => {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);

  /* The header is position: fixed, so the rest of the page would slide
     underneath it. The spacer below it has height: var(--app-header-h).
     A ResizeObserver watches the header for ANY height change — so when
     the landing page hides the navbar's search bar (via the body class)
     and the navbar shrinks, the spacer auto-shrinks to match — no
     white gap between the navbar and the page content. */
  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const apply = (h) => {
      document.documentElement.style.setProperty("--app-header-h", `${h}px`);
    };
    apply(headerRef.current.offsetHeight);

    const ro = new ResizeObserver(() => {
      // Always read offsetHeight — covers padding, border, and any
      // layout-affecting children that ResizeObserver's contentRect would miss.
      if (headerRef.current) apply(headerRef.current.offsetHeight);
    });
    ro.observe(headerRef.current);

    const onResize = () => apply(headerRef.current.offsetHeight);
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [bannerVisible]);

  /* Toggle a `--scrolled` class once the user scrolls past 8 px. We use
     this to morph the header — deeper shadow, tighter blur, etc. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="app-shell">
      <header
        ref={headerRef}
        className={`app-header${scrolled ? " app-header--scrolled" : ""}`}
      >
        {bannerVisible && (
          <AnnouncementBanner onDismiss={() => setBannerVisible(false)} />
        )}
        <Navbar />
      </header>
      {/* Pushes the page content below the fixed header. */}
      <div className="app-header-spacer" aria-hidden="true" />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
