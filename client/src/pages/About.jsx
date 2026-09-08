import { Link } from "react-router-dom";
import {
  FiKey,
  FiHome,
  FiBriefcase,
  FiGitMerge,
  FiShield,
  FiMapPin,
  FiCheckCircle,
  FiLock,
  FiStar,
  FiCalendar,
  FiHeart,
  FiArrowRight,
  FiArrowDownRight,
} from "react-icons/fi";
import Breadcrumb from "../components/common/Breadcrumb";
import "../styles/About.css";

/* ─── About Us ───
   Static marketing page. Copy describes real product capabilities only. */

const ROLES = [
  {
    icon: FiKey,
    title: "Sellers",
    kicker: "List once",
    body: "Publish a property and let it work for you. Your listing is scored against every active buyer requirement the moment it goes live.",
    tone: "accent",
  },
  {
    icon: FiHome,
    title: "Buyers",
    kicker: "Ask once",
    body: "Post city, area, budget, size and purpose — then let matching properties come to you instead of endless scrolling.",
    tone: "primary",
  },
  {
    icon: FiBriefcase,
    title: "Dealers",
    kicker: "Both sides",
    body: "Buy and sell from one account. Watch the requirements board and connect the right two parties.",
    tone: "slate",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Publish what you have — or what you need",
    body: "Sellers list with photos and a map pin. Buyers post a clear requirement.",
  },
  {
    step: "02",
    title: "The matchmaker scores every pairing",
    body: "Location, budget, type, size and purpose are compared so the strongest fits rise first.",
  },
  {
    step: "03",
    title: "Both sides hear about it",
    body: "Email goes out together. No one has to refresh a page hoping something changed.",
  },
  {
    step: "04",
    title: "Talk directly when you're ready",
    body: "Unlock phone and email with an active plan, then call, WhatsApp, or book a viewing.",
  },
];

const FEATURES = [
  {
    icon: FiGitMerge,
    title: "Scored matchmaking",
    body: "Rule-based scoring plus an AI pass that reads intent — not just numbers.",
    span: "wide",
  },
  {
    icon: FiLock,
    title: "Contact on demand",
    body: "Phone and email stay private until a plan unlocks them.",
    span: "normal",
  },
  {
    icon: FiMapPin,
    title: "Map-accurate pins",
    body: "Real coordinates so search and map views always agree.",
    span: "normal",
  },
  {
    icon: FiShield,
    title: "Moderated market",
    body: "Reviews, blocks, and an audit trail admins can follow.",
    span: "normal",
  },
  {
    icon: FiStar,
    title: "Earned reviews",
    body: "Ratings tied to real interactions — not bought praise.",
    span: "normal",
  },
  {
    icon: FiCalendar,
    title: "Property visits",
    body: "Schedule, confirm and track viewings in one place.",
    span: "normal",
  },
  {
    icon: FiHeart,
    title: "Wishlists",
    body: "Save shortlists and pick up on any device.",
    span: "wide",
  },
];

const CITIES = ["Islamabad", "Rawalpindi"];

const VALUES = [
  {
    title: "Fewer, better leads",
    body: "Three genuine matches beat three hundred listings you will never call.",
  },
  {
    title: "Privacy by default",
    body: "Your number is yours. Contact details stay locked until you choose.",
  },
  {
    title: "Straight pricing",
    body: "Browse, list and post requirements free. Plans say exactly what you get.",
  },
  {
    title: "Built for Pakistan",
    body: "Marla, Kanal, EasyPaisa, and the neighbourhood names people actually use.",
  },
];

const About = () => {
  return (
    <div className="abt-page">
      <div className="abt-crumb">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "About Us" }]} />
      </div>

      {/* ── Split hero ── */}
      <header className="abt-hero">
        <div className="abt-hero-copy">
          <p className="abt-brand">ApnaBnB</p>
          <h1 className="abt-hero-title">
            Property search,
            <span className="abt-hero-title-em"> the other way round</span>
          </h1>
          <p className="abt-hero-lead">
            Sellers publish what they have. Buyers publish what they need. Our
            matchmaking engine introduces the two — so you spend less time
            scrolling and more time closing real conversations.
          </p>
          <div className="abt-hero-actions">
            <Link to="/" className="abt-btn abt-btn--solid">
              Browse properties
              <FiArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/contact" className="abt-btn abt-btn--line">
              Talk to us
            </Link>
          </div>
        </div>

        <div className="abt-hero-stage" aria-hidden="true">
          <div className="abt-orbit abt-orbit--a">
            <FiKey size={20} />
            <span>Listing live</span>
          </div>
          <div className="abt-orbit-line" />
          <div className="abt-orbit abt-orbit--core">
            <FiGitMerge size={28} />
            <strong>Match</strong>
            <small>scored + ranked</small>
          </div>
          <div className="abt-orbit-line abt-orbit-line--b" />
          <div className="abt-orbit abt-orbit--b">
            <FiHome size={20} />
            <span>Requirement posted</span>
          </div>
        </div>
      </header>

      {/* ── Roles: asymmetric mosaic ── */}
      <section className="abt-band" aria-labelledby="abt-roles-title">
        <div className="abt-band-head">
          <p className="abt-kicker">Who it&apos;s for</p>
          <h2 id="abt-roles-title" className="abt-h2">
            One marketplace. Three seats at the table.
          </h2>
        </div>
        <div className="abt-mosaic">
          {ROLES.map(({ icon: Icon, title, kicker, body, tone }, i) => (
            <article
              key={title}
              className={`abt-tile abt-tile--${tone}${i === 0 ? " abt-tile--hero" : ""}`}
            >
              <div className="abt-tile-top">
                <span className="abt-tile-icon">
                  <Icon size={22} />
                </span>
                <span className="abt-tile-kicker">{kicker}</span>
              </div>
              <h3 className="abt-tile-title">{title}</h3>
              <p className="abt-tile-body">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── How it works: vertical spine ── */}
      <section className="abt-band abt-band--spine" aria-labelledby="abt-steps-title">
        <div className="abt-spine-intro">
          <p className="abt-kicker abt-kicker--on-dark">How a match happens</p>
          <h2 id="abt-steps-title" className="abt-h2 abt-h2--on-dark">
            From publish to handshake — without chasing anyone.
          </h2>
          <p className="abt-spine-aside">
            Four beats. One continuous path. Scroll the story on the right.
          </p>
        </div>
        <ol className="abt-spine">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <li key={step} className="abt-spine-item">
              <span className="abt-spine-num">{step}</span>
              <div className="abt-spine-copy">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Features bento ── */}
      <section className="abt-band" aria-labelledby="abt-features-title">
        <div className="abt-band-head abt-band-head--row">
          <div>
            <p className="abt-kicker">Inside the product</p>
            <h2 id="abt-features-title" className="abt-h2">
              Tools people actually open every day
            </h2>
          </div>
          <Link to="/plans" className="abt-text-link">
            See plans <FiArrowDownRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="abt-bento">
          {FEATURES.map(({ icon: Icon, title, body, span }) => (
            <article
              key={title}
              className={`abt-bento-cell${span === "wide" ? " abt-bento-cell--wide" : ""}`}
            >
              <span className="abt-bento-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Values manifesto ── */}
      <section className="abt-band" aria-labelledby="abt-values-title">
        <div className="abt-band-head">
          <p className="abt-kicker">What we hold to</p>
          <h2 id="abt-values-title" className="abt-h2">
            A short manifesto
          </h2>
        </div>
        <div className="abt-manifesto">
          {VALUES.map(({ title, body }, i) => (
            <article key={title} className="abt-manifesto-row">
              <span className="abt-manifesto-idx" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>
                  <FiCheckCircle size={16} aria-hidden="true" /> {title}
                </h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="abt-band abt-band--cities" aria-labelledby="abt-cities-title">
        <div>
          <p className="abt-kicker">Coverage</p>
          <h2 id="abt-cities-title" className="abt-h2">
            Where we operate
          </h2>
          <p className="abt-muted">
            Neighbourhood-level area data in each market we serve.
          </p>
        </div>
        <ul className="abt-cities">
          {CITIES.map((city) => (
            <li key={city}>
              <FiMapPin size={18} aria-hidden="true" />
              <span>{city}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── CTA ribbon ── */}
      <section className="abt-ribbon" aria-labelledby="abt-cta-title">
        <div className="abt-ribbon-copy">
          <h2 id="abt-cta-title">Ready for the other side of your deal?</h2>
          <p>
            Create a listing, post a requirement, or tell us what you&apos;re trying
            to do — we&apos;ll point you the right way.
          </p>
        </div>
        <div className="abt-ribbon-actions">
          <Link to="/signup" className="abt-btn abt-btn--solid">
            Create free account
            <FiArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/contact" className="abt-btn abt-btn--line">
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
