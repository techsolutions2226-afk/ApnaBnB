import { Link } from "react-router-dom";
import {
  FiKey,
  FiHome,
  FiBriefcase,
  FiGitMerge,
  FiShield,
  FiMessageSquare,
  FiMapPin,
  FiCheckCircle,
  FiLock,
  FiStar,
  FiCalendar,
  FiHeart,
} from "react-icons/fi";
import Breadcrumb from "../components/common/Breadcrumb";
import "../styles/About.css";

/* ─── About Us ───
   Static marketing page. Everything here describes capabilities the platform
   actually ships (matchmaking, encrypted chat, Deal Room, verified listings,
   plans) — keep it in step with the product rather than inventing claims. */

const ROLES = [
  {
    icon: FiKey,
    title: "Sellers",
    body: "List a property once and let it work for you. Your listing is scored against every active buyer requirement the moment it goes live, and you're emailed the instant a match appears.",
    accent: "#1a8f5a",
  },
  {
    icon: FiHome,
    title: "Buyers",
    body: "Post what you're actually looking for — city, area, budget, size, purpose — and let matching properties come to you instead of scrolling through listings that were never right.",
    accent: "#1f4a6d",
  },
  {
    icon: FiBriefcase,
    title: "Dealers",
    body: "Work both sides of the market from one account. Switch between buying and selling views, watch the requirements board, and bring the right two parties together.",
    accent: "#7c3aed",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tell us what you have — or what you need",
    body: "Sellers and dealers publish a listing with photos, location pin and full specification. Buyers post a requirement describing the property they're searching for.",
  },
  {
    step: "02",
    title: "Our matchmaker does the searching",
    body: "Every listing and requirement is compared on location, budget, property type, size and purpose. Each pairing gets a score, so the strongest opportunities surface first.",
  },
  {
    step: "03",
    title: "Both sides get notified",
    body: "When a match is created we email the property owner and the requirement owner together. Nobody has to keep refreshing a page to find out something happened.",
  },
  {
    step: "04",
    title: "Talk it through, privately",
    body: "Open the match to reach a private conversation and a shared Deal Room where both parties can negotiate, share documents and agree terms.",
  },
];

const FEATURES = [
  {
    icon: FiGitMerge,
    title: "Scored matchmaking",
    body: "Rule-based scoring across location, budget, type and size, refined with an AI pass that reads the intent behind a listing — not just its numbers.",
  },
  {
    icon: FiLock,
    title: "Encrypted messaging",
    body: "Conversations are encrypted at rest. Personal contact details are filtered out of chat until both sides are ready to share them.",
  },
  {
    icon: FiMessageSquare,
    title: "Deal Room",
    body: "A dedicated space per match for serious negotiation, kept separate from ordinary enquiries so nothing gets lost in a busy inbox.",
  },
  {
    icon: FiMapPin,
    title: "Map-accurate listings",
    body: "Every property carries a real coordinate — dropped by the lister or geocoded from the address — so search results and map views always line up.",
  },
  {
    icon: FiShield,
    title: "Moderated marketplace",
    body: "Listings are reviewed, users can block bad actors, and every significant action is written to an audit log our admins can trace.",
  },
  {
    icon: FiStar,
    title: "Reviews that mean something",
    body: "Ratings are tied to real interactions between buyers, sellers and dealers, so a strong profile is earned rather than bought.",
  },
  {
    icon: FiCalendar,
    title: "Property visits",
    body: "Arrange and track viewings in one place, with confirmation codes and a clear record of what's upcoming, completed or cancelled.",
  },
  {
    icon: FiHeart,
    title: "Wishlists",
    body: "Save the properties worth a second look, organise them into lists, and pick up exactly where you left off on any device.",
  },
];

const CITIES = [
  "Islamabad",
  "Rawalpindi"
];

const VALUES = [
  {
    title: "Fewer, better leads",
    body: "We would rather send you three genuine matches than three hundred listings. Every notification you get from us should be worth opening.",
  },
  {
    title: "Privacy by default",
    body: "Your phone number is yours to give out. We encrypt conversations and hold contact details back until you decide to share them.",
  },
  {
    title: "Straight answers on price",
    body: "Browsing, listing and posting requirements are free. When you do pay, you see exactly what the plan includes before you commit.",
  },
  {
    title: "Built for Pakistan",
    body: "Marla and Kanal, EasyPaisa, the areas people actually name when they describe where they live — the product speaks the local market's language.",
  },
];

const About = () => {
  return (
    <div className="abt-page">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "About Us" }]} />

      {/* ── Hero ── */}
      <section className="abt-hero">
        <div className="abt-hero-inner">
          <span className="abt-eyebrow">About ApnaBnB</span>
          <h1 className="abt-hero-title">
            Property search in Pakistan, the other way round
          </h1>
          <p className="abt-hero-lead">
            Most portals hand you a search box and wish you luck. ApnaBnB works
            from both ends at once — sellers and dealers publish what they have,
            buyers publish what they need, and our matchmaking engine introduces
            the two. Less scrolling, fewer dead-end calls, more real conversations.
          </p>
          <div className="abt-hero-actions">
            <Link to="/" className="abt-btn abt-btn--primary">
              Browse properties
            </Link>
            <Link to="/contact" className="abt-btn abt-btn--ghost">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="abt-section">
        <h2 className="abt-section-title">Built for three kinds of people</h2>
        <p className="abt-section-sub">
          One marketplace, three points of view — and an account can wear more
          than one hat.
        </p>
        <div className="abt-role-grid">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const { title, body, accent } = role;
            return (
            <article key={title} className="abt-role-card" style={{ "--abt-accent": accent }}>
              <span className="abt-role-icon">
                <Icon size={22} />
              </span>
              <h3 className="abt-role-title">{title}</h3>
              <p className="abt-role-body">{body}</p>
            </article>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="abt-section abt-section--alt">
        <h2 className="abt-section-title">How a match happens</h2>
        <p className="abt-section-sub">
          From publishing to negotiating, without chasing anyone.
        </p>
        <ol className="abt-steps">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <li key={step} className="abt-step">
              <span className="abt-step-num">{step}</span>
              <div>
                <h3 className="abt-step-title">{title}</h3>
                <p className="abt-step-body">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── What's inside ── */}
      <section className="abt-section">
        <h2 className="abt-section-title">What you get</h2>
        <p className="abt-section-sub">
          The parts of the platform people use every day.
        </p>
        <div className="abt-feature-grid">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const { title, body } = feature;
            return (
            <article key={title} className="abt-feature">
              <span className="abt-feature-icon">
                <Icon size={18} />
              </span>
              <div>
                <h3 className="abt-feature-title">{title}</h3>
                <p className="abt-feature-body">{body}</p>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="abt-section abt-section--alt">
        <h2 className="abt-section-title">What we hold to</h2>
        <div className="abt-value-grid">
          {VALUES.map(({ title, body }) => (
            <article key={title} className="abt-value">
              <FiCheckCircle className="abt-value-tick" size={18} />
              <div>
                <h3 className="abt-value-title">{title}</h3>
                <p className="abt-value-body">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="abt-section">
        <h2 className="abt-section-title">Where we operate</h2>
        <p className="abt-section-sub">
          Live across Pakistan's major property markets, with neighbourhood-level
          area data in each.
        </p>
        <ul className="abt-city-list">
          {CITIES.map((city) => (
            <li key={city} className="abt-city">
              <FiMapPin size={14} />
              {city}
            </li>
          ))}
        </ul>
      </section>

      {/* ── CTA ── */}
      <section className="abt-cta">
        <h2 className="abt-cta-title">Ready to find the other side of your deal?</h2>
        <p className="abt-cta-sub">
          Create a listing, post a requirement, or just tell us what you're
          trying to do — we'll point you the right way.
        </p>
        <div className="abt-hero-actions">
          <Link to="/signup" className="abt-btn abt-btn--primary">
            Create a free account
          </Link>
          <Link to="/contact" className="abt-btn abt-btn--ghost">
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
