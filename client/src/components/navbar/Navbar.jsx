import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../common/Logo";
import {
  FiMenu,
  FiGlobe,
  FiHelpCircle,
  FiUser,
} from "react-icons/fi";
import "../../styles/Navbar.css";

import NotificationBell from "./NotificationBell";

/* ─── Main Navbar ─── */
/* ── Role-specific menu links ── */
const ROLE_MENU_LINKS = {
  seller: [
    { to: "/dashboard/seller", label: "Dashboard" },
    { to: "/listing/new", label: "Create Listing" },
  ],
  buyer: [
    { to: "/dashboard/buyer", label: "Dashboard" },
    { to: "/requirements/new", label: "Post Requirement" },
    { to: "/matches", label: "My Matches" },
  ],
  dealer: [
    { to: "/dashboard/dealer", label: "Dashboard" },
    { to: "/requirements", label: "Requirements Board" },
    { to: "/matches", label: "My Matches" },
  ],
  admin: [
    { to: "/admin", label: "Admin Panel" },
  ],
};

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="navbar-wrapper">
      {/* ── Top Row ── */}
      <div className="navbar-top">
        <Link to="/" className="navbar-logo" aria-label="apnabnb home">
          <Logo size={48} />
        </Link>

        <nav className="navbar-tabs">
          <Link to="/" className={`tab-btn ${currentPath === "/" || currentPath.startsWith("/property") || currentPath === "/search" ? "tab-active" : ""}`}>
            <span className="tab-icon">🏠</span>
            <span className="tab-label">Homes</span>
          </Link>
          <Link to="/about" className={`tab-btn ${currentPath === "/about" ? "tab-active" : ""}`}>
            <span className="tab-icon">💡</span>
            <span className="tab-label">About Us</span>
          </Link>
          <Link to="/contact" className={`tab-btn ${currentPath === "/contact" ? "tab-active" : ""}`}>
            <span className="tab-icon">✉️</span>
            <span className="tab-label">Contact Us</span>
          </Link>
        </nav>

        <div className="navbar-actions">
          {currentUser ? (
            <Link
              to={
                currentUser.role === "admin"
                  ? "/admin"
                  : `/dashboard/${currentUser.role}`
              }
              className="become-host-btn"
            >
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="become-host-btn">List a property</Link>
          )}
          {currentUser && <NotificationBell />}
          <button className="icon-btn nav-desktop-only" aria-label="Language">
            <FiGlobe size={18} />
          </button>
          <div className="menu-wrapper" ref={menuRef}>
            <button
              className={`menu-toggle-btn ${menuOpen ? "menu-toggle-btn--active" : ""}`}
              onClick={() => setMenuOpen((p) => !p)}
            >
              <FiMenu size={18} />
              {currentUser ? (
                currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="menu-avatar" />
                ) : (
                  <span className="menu-avatar-fallback">
                    {currentUser.name?.[0] || "U"}
                  </span>
                )
              ) : (
                <FiUser size={18} className="menu-user-icon" />
              )}
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                {currentUser ? (
                  <>
                    {/* Role-specific links */}
                    {(ROLE_MENU_LINKS[currentUser.role] || []).map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="dropdown-item dropdown-item--auth"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="dropdown-divider" />
                    <Link to="/messages" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Messages
                    </Link>
                    <Link to="/wishlists" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Wishlists
                    </Link>
                    <div className="dropdown-divider" />
                    <Link to="/account" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Account
                    </Link>
                    <Link to={`/users/${currentUser.id}`} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Profile
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item dropdown-item-btn" onClick={handleLogout}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="dropdown-item dropdown-item--auth" onClick={() => setMenuOpen(false)}>
                      Log in
                    </Link>
                    <Link to="/signup" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Sign up
                    </Link>
                    <div className="dropdown-divider" />
                    <a href="#" className="dropdown-item dropdown-item--featured" onClick={(e) => e.preventDefault()}>
                      <div className="dropdown-featured-text">
                        <span className="dropdown-featured-title">
                          List a property
                        </span>
                        <span className="dropdown-featured-sub">
                          It&apos;s easy to start listing and connect with buyers.
                        </span>
                      </div>
                      <div className="dropdown-featured-img">🏠</div>
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>



    </div>
  );
};

export default Navbar;
