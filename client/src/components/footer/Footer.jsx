import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTwitter,
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";
import { FiChevronUp } from "react-icons/fi";
import Logo from "../common/Logo";
import "../../styles/Footer.css";

/* ─── Links data ─── */
const company = [
  "About Us",
  "Contact Us",
  "Jobs",
  "Help & Support",
  "Advertise On ApnaBnB",
  "Terms Of Use",
];

const connect = [
  "Blog",
  "News",
  "Forum",
  "Expo",
  "Real Estate Agents",
  "Add Property",
];

const hours = [
  { day: "Monday – Friday", time: "9:00 AM – 6:00 PM" },
  { day: "Saturday – Sunday", time: "10:00 AM – 4:00 PM" },
];

const socials = [
  { label: "Facebook", Icon: FaFacebook },
  { label: "Instagram", Icon: FaInstagram },
  { label: "YouTube", Icon: FaYoutube },
  { label: "X / Twitter", Icon: FaTwitter },
  { label: "LinkedIn", Icon: FaLinkedin },
];

/* ─── Component ─── */
const Footer = () => {
  const [showTop, setShowTop] = useState(false);

  /* Show the TOP button only after the user has scrolled past 300px. */
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      {/* ── Main columns ── */}
      <div className="footer-container">
        <div className="footer-grid">
          {/* Company */}
          <div className="footer-col">
            <h3 className="footer-col-title">Company</h3>
            <div className="footer-col-links">
              {company.map((item) => (
                <a key={item} href="#" className="footer-link">
                  {item}
                </a>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="footer-col">
            <h3 className="footer-col-title">Connect</h3>
            <div className="footer-col-links">
              {connect.map((item) => (
                <a key={item} href="#" className="footer-link">
                  {item}
                </a>
              ))}
            </div>
          </div>

          {/* Head Office */}
          <div className="footer-col">
            <h3 className="footer-col-title">Head Office</h3>
            <div className="footer-col-links footer-contact-list">
              <div className="footer-contact">
                <FaMapMarkerAlt size={15} className="footer-contact-icon" />
                <span>
                  Main Boulevard, Gulberg III,
                  <br />
                  Lahore, Pakistan
                </span>
              </div>
              <div className="footer-contact">
                <FaPhoneAlt size={14} className="footer-contact-icon" />
                <a href="tel:+920000000000" className="footer-link footer-link--inline">
                  +92 (0) 000 000000
                </a>
              </div>
              <div className="footer-contact">
                <FaEnvelope size={14} className="footer-contact-icon" />
                <a
                  href="mailto:support@apnabnb.com"
                  className="footer-link footer-link--inline"
                >
                  support@apnabnb.com
                </a>
              </div>
              <div className="footer-hours">
                {hours.map((h) => (
                  <div key={h.day} className="footer-hours-row">
                    <span className="footer-hours-day">{h.day}</span>
                    <span className="footer-hours-time">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Get Connected */}
          <div className="footer-col footer-brand-col">
            <Link to="/" className="footer-brand" aria-label="apnabnb home">
              <Logo size={34} />
            </Link>
            <p className="footer-brand-tag">
              Pakistan&apos;s intelligent property network — buy, rent, and
              invest with confidence.
            </p>
            <h3 className="footer-col-title footer-connect-title">
              Get Connected
            </h3>
            <div className="footer-socials">
              {socials.map((s) => {
                const Icon = s.Icon;
                return (
                  <a
                    key={s.label}
                    href="#"
                    className="footer-social"
                    aria-label={s.label}
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom copyright row ── */}
      <div className="footer-bottom">
        <div className="footer-container footer-bottom-inner">
          <span className="footer-bottom-text">
            © 2026 ApnaBnB. All Rights Reserved
          </span>
          <button
            type="button"
            className={`footer-top-btn${showTop ? " footer-top-btn--visible" : ""}`}
            onClick={scrollTop}
            aria-label="Scroll to top"
          >
            <FiChevronUp size={18} />
            <span>TOP</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;