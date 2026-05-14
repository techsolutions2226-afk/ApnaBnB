import { useState } from "react";
import { FaFacebook, FaTwitter, FaInstagram, FaGlobe } from "react-icons/fa";
import { FiDollarSign, FiChevronDown, FiChevronUp } from "react-icons/fi";
import "../../styles/Footer.css";

/* ─── Data ─── */
const tabs = [
  "Popular",
  "Arts & culture",
  "Beach",
  "Mountains",
  "Outdoors",
  "Things to do",
  "Travel tips & inspiration",
  "Airbnb-friendly apartments",
];

const destinations = {
  Popular: [
    { city: "West Palm Beach", type: "Vacation rentals" },
    { city: "Brooklyn", type: "Apartment rentals" },
    { city: "Dallas", type: "Apartment rentals" },
    { city: "Santo Domingo", type: "Monthly rentals" },
    { city: "Milan", type: "Monthly Rentals" },
    { city: "Barcelona", type: "Apartment rentals" },
    { city: "San Antonio", type: "Vacation rentals" },
    { city: "Charlotte", type: "Villa rentals" },
    { city: "Clearwater", type: "Vacation rentals" },
    { city: "Outer Banks", type: "Apartment rentals" },
    { city: "Ocean City", type: "House rentals" },
    { city: "North Myrtle Beach", type: "Condo rentals" },
    { city: "Nice", type: "Condo rentals" },
    { city: "Portland", type: "Cabin rentals" },
    { city: "Minneapolis", type: "Condo rentals" },
    { city: "Corpus Christi", type: "Villa rentals" },
    { city: "Tokyo", type: "Condo rentals" },
  ],
  "Arts & culture": [
    { city: "Paris", type: "Apartment rentals" },
    { city: "New York", type: "Vacation rentals" },
    { city: "London", type: "Studio rentals" },
    { city: "Vienna", type: "Apartment rentals" },
    { city: "Florence", type: "Villa rentals" },
    { city: "Amsterdam", type: "Canal rentals" },
  ],
  Beach: [
    { city: "Miami", type: "Beachfront rentals" },
    { city: "Malibu", type: "Vacation rentals" },
    { city: "Cancun", type: "Resort rentals" },
    { city: "Bali", type: "Villa rentals" },
    { city: "Santorini", type: "Cave rentals" },
  ],
  Mountains: [
    { city: "Aspen", type: "Cabin rentals" },
    { city: "Whistler", type: "Chalet rentals" },
    { city: "Banff", type: "Vacation rentals" },
    { city: "Zermatt", type: "Chalet rentals" },
  ],
  Outdoors: [
    { city: "Yellowstone", type: "Cabin rentals" },
    { city: "Moab", type: "Glamping rentals" },
    { city: "Sedona", type: "Vacation rentals" },
  ],
  "Things to do": [
    { city: "Las Vegas", type: "Vacation rentals" },
    { city: "Orlando", type: "Villa rentals" },
    { city: "Nashville", type: "Condo rentals" },
  ],
  "Travel tips & inspiration": [
    { city: "Lisbon", type: "Apartment rentals" },
    { city: "Prague", type: "Vacation rentals" },
    { city: "Budapest", type: "Studio rentals" },
  ],
  "Airbnb-friendly apartments": [
    { city: "Phoenix", type: "Apartment rentals" },
    { city: "Atlanta", type: "Condo rentals" },
    { city: "Denver", type: "Apartment rentals" },
  ],
};

const support = [
  "Help Center",
  "Get help with a safety issue",
  "AirCover",
  "Travel insurance",
  "Anti-discrimination",
  "Disability support",
  "Cancellation options",
  "Report neighborhood concern",
];

const hosting = [
  "Airbnb your home",
  "Airbnb your experience",
  "Airbnb your service",
  "AirCover for Hosts",
  "Hosting resources",
  "Community forum",
  "Hosting responsibly",
  "Airbnb-friendly apartments",
  "Join a free hosting class",
  "Find a co-host",
  "Refer a host",
];

const airbnb = [
  "2025 Summer Release",
  "Newsroom",
  "Careers",
  "Investors",
  "Gift cards",
  "Airbnb.org emergency stays",
];

const COLS = 6; // destinations per row

/* ─── Component ─── */
const Footer = () => {
  const [activeTab, setActiveTab] = useState("Popular");
  const [showMore, setShowMore] = useState(false);

  const list = destinations[activeTab] || [];
  const visible = showMore ? list : list.slice(0, COLS * 3); // 3 rows visible initially
  const hasMore = list.length > COLS * 3;

  // chunk into rows of COLS
  const rows = [];
  for (let i = 0; i < visible.length; i += COLS)
    rows.push(visible.slice(i, i + COLS));

  return (
    <footer className="footer">
      {/* ── Inspiration section ── */}
      <div className="footer-inspiration">
        <h2 className="footer-heading">Inspiration for future getaways</h2>

        {/* Tabs */}
        <div className="footer-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`footer-tab ${activeTab === tab ? "footer-tab--active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setShowMore(false);
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="footer-tab-line" />

        {/* Destination grid */}
        <div className="dest-grid">
          {rows.map((row, ri) => (
            <div key={ri} className="dest-row">
              {row.map((d, ci) => (
                <div key={ci} className="dest-cell">
                  <a href="#" className="dest-city">
                    {d.city}
                  </a>
                  <span className="dest-type">{d.type}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            className="show-more-btn"
            onClick={() => setShowMore((p) => !p)}
          >
            {showMore ? (
              <>
                Show less <FiChevronUp size={16} />
              </>
            ) : (
              <>
                Show more <FiChevronDown size={16} />
              </>
            )}
          </button>
        )}
      </div>

      <div className="footer-divider" />

      {/* ── Links section ── */}
      <div className="footer-links">
        <div className="footer-col">
          <h3 className="footer-col-title">Support</h3>
          {support.map((item) => (
            <a key={item} href="#" className="footer-link">
              {item}
            </a>
          ))}
        </div>
        <div className="footer-col">
          <h3 className="footer-col-title">Hosting</h3>
          {hosting.map((item) => (
            <a key={item} href="#" className="footer-link">
              {item}
            </a>
          ))}
        </div>
        <div className="footer-col">
          <h3 className="footer-col-title">Airbnb</h3>
          {airbnb.map((item) => (
            <a key={item} href="#" className="footer-link">
              {item}
            </a>
          ))}
        </div>
      </div>

      <div className="footer-divider" />

      {/* ── Bottom bar ── */}
      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <span>© 2026 Airbnb, Inc.</span>
          <span className="footer-dot">·</span>
          <a href="#" className="footer-bottom-link">
            Privacy
          </a>
          <span className="footer-dot">·</span>
          <a href="#" className="footer-bottom-link">
            Terms
          </a>
          <span className="footer-dot">·</span>
          <a href="#" className="footer-bottom-link">
            Your Privacy Choices
          </a>
          {/* Privacy toggle pill */}
          <div className="privacy-toggle">
            <div className="privacy-toggle-inner" />
          </div>
        </div>

        <div className="footer-bottom-right">
          <button className="footer-locale-btn">
            <FaGlobe size={15} />
            <span>English (US)</span>
          </button>
          <button className="footer-locale-btn">
            <FiDollarSign size={15} />
            <span>USD</span>
          </button>
          <div className="footer-socials">
            <a href="#" className="social-link" aria-label="Facebook">
              <FaFacebook size={18} />
            </a>
            <a href="#" className="social-link" aria-label="Twitter">
              <FaTwitter size={18} />
            </a>
            <a href="#" className="social-link" aria-label="Instagram">
              <FaInstagram size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
