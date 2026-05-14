/* ─── Matches — Matchmaking UI ───
   Shows the current user's property matches, filtered by type.
   Supports all 3 connection types: seller↔buyer, dealer↔buyer, dealer↔dealer.
   Each match card shows property info, match score, participants, and actions.
   Frontend-only demo — data from mock matches.
   ─────────────────────────────────────────────── */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMatches } from "../hooks/useMatches";
import { formatPrice } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import FilterTabs from "../components/common/FilterTabs";
import "../styles/Match.css";
import "../styles/Dashboard.css"; /* breadcrumb styles */

/* ══════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════ */

const TYPE_LABELS = {
  "seller-buyer": "Seller ↔ Buyer",
  "dealer-buyer": "Dealer ↔ Buyer",
  "dealer-dealer": "Dealer ↔ Dealer",
};

const FILTER_OPTIONS = [
  { key: "all", label: "All Matches" },
  { key: "seller-buyer", label: "Seller ↔ Buyer" },
  { key: "dealer-buyer", label: "Dealer ↔ Buyer" },
  { key: "dealer-dealer", label: "Dealer ↔ Dealer" },
];

/* ══════════════════════════════════════
   HELPERS
   ══════════════════════════════════════ */

/** Get the score tier class suffix based on score value */
const getScoreTier = (score) => {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
};

/** Get the two participant user IDs from a match, based on its type */
const getParticipantIds = (match) => {
  switch (match.type) {
    case "seller-buyer":
      return [match.sellerId, match.buyerId];
    case "dealer-buyer":
      return [match.dealerId, match.buyerId];
    case "dealer-dealer":
      return [match.dealerAId, match.dealerBId];
    default:
      return [];
  }
};

/* ══════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════ */

const Matches = () => {
  const { currentUser, getDashboardPath } = useAuth();
  const userId = currentUser?.id;

  /* ── State ── */
  const [activeFilter, setActiveFilter] = useState("all");

  /* ── Load matches for current user ── */
  const { matches = [], isLoading, error, refetch } = useMatches("all");

  /* ── Build participant & property caches ── */
  const userCache = useMemo(() => {
    const cache = {};
    matches.forEach((match) => {
      const ids = getParticipantIds(match);
      ids.forEach((pid) => {
        if (pid && !cache[pid]) {
          // Build cache from match data (participants included in response)
          cache[pid] = match.participants?.find(p => p._id === pid);
        }
      });
    });
    return cache;
  }, [matches]);

  const propertyCache = useMemo(() => {
    const cache = {};
    matches.forEach((match) => {
      if (match.property && !cache[match.property._id]) {
        cache[match.property._id] = match.property;
      }
    });
    return cache;
  }, [matches]);

  /* ── Filter matches by type ── */
  const filteredMatches = useMemo(() => {
    if (activeFilter === "all") return matches;
    return matches.filter((m) => m.type === activeFilter);
  }, [matches, activeFilter]);

  /* ── Compute stats ── */
  const stats = useMemo(() => {
    const total = matches.length;
    const active = matches.filter((m) => m.status === "active").length;
    const pending = matches.filter((m) => m.status === "pending").length;
    const avgScore =
      total > 0
        ? Math.round(
            matches.reduce((sum, m) => sum + m.matchScore, 0) / total
          )
        : 0;
    return { total, active, pending, avgScore };
  }, [matches]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="mtch-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Matches" },
          ]}
        />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
          <p>Loading your matches...</p>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="mtch-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Matches" },
          ]}
        />
        <div style={{ padding: "40px", textAlign: "center", color: "#d32f2f" }}>
          <p>Error loading matches: {error}</p>
          <button
            onClick={refetch}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (matches.length === 0) {
    return (
      <div className="mtch-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Matches" },
          ]}
        />

        <div className="mtch-header">
          <h1 className="mtch-title">Matches</h1>
          <p className="mtch-subtitle">Your property matches will appear here.</p>
        </div>

        <div className="mtch-empty">
          <div className="mtch-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="mtch-empty-title">No matches yet</h3>
          <p className="mtch-empty-text">
            When your listings or requirements match with other users, they will appear here.
          </p>
          <Link to={getDashboardPath()} className="mtch-btn mtch-btn--primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mtch-page">
      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: getDashboardPath() },
          { label: "Matches" },
        ]}
      />

      {/* ── Header ── */}
      <div className="mtch-header">
        <h1 className="mtch-title">Matches</h1>
        <p className="mtch-subtitle">
          Properties and requirements matched for you
        </p>
      </div>

      {/* ── Stats Bar ── */}
      <div className="mtch-stats-bar">
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.total}</span>
          <span className="mtch-stats-label">Total Matches</span>
        </div>
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.active}</span>
          <span className="mtch-stats-label">Active</span>
        </div>
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.pending}</span>
          <span className="mtch-stats-label">Pending</span>
        </div>
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.avgScore}%</span>
          <span className="mtch-stats-label">Avg Score</span>
        </div>
      </div>

      {/* ── Toolbar — Type Filters ── */}
      <div className="mtch-toolbar">
        <div className="mtch-filters">
          <FilterTabs
            tabs={FILTER_OPTIONS}
            activeKey={activeFilter}
            onChange={setActiveFilter}
            prefix="mtch-filter-btn"
          />
        </div>
      </div>

      {/* ── Match Cards ── */}
      {filteredMatches.length === 0 ? (
        <div className="mtch-empty">
          <div className="mtch-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h3 className="mtch-empty-title">No matches in this category</h3>
          <p className="mtch-empty-text">
            Try selecting a different filter to see your matches.
          </p>
          <button
            className="mtch-btn mtch-btn--primary"
            onClick={() => setActiveFilter("all")}
          >
            View All Matches
          </button>
        </div>
      ) : (
        <div className="mtch-cards">
          {filteredMatches.map((match) => {
            const property = match.property;
            const [idA, idB] = getParticipantIds(match);
            const personA = match.participants?.find(p => p._id === idA);
            const personB = match.participants?.find(p => p._id === idB);
            const scoreTier = getScoreTier(match.matchScore);

            return (
              <div key={match._id} className="mtch-card">
                {/* ── Top row: type + score + status ── */}
                <div className="mtch-card-top">
                  <span className={`mtch-card-type mtch-card-type--${match.type}`}>
                    {TYPE_LABELS[match.type]}
                  </span>

                  <div className="mtch-card-score">
                    <div className="mtch-card-score-bar">
                      <div
                        className={`mtch-card-score-fill mtch-card-score-fill--${scoreTier}`}
                        style={{ width: `${match.matchScore}%` }}
                      />
                    </div>
                    <span className="mtch-card-score-text">{match.matchScore}%</span>
                  </div>

                  <span
                    className={`mtch-card-status mtch-card-status--${match.status}`}
                  >
                    {match.status}
                  </span>
                </div>

                {/* ── Property info ── */}
                {property && (
                  <div className="mtch-card-property">
                    <img
                      src={property.photos?.[0] || property.image || "https://via.placeholder.com/200"}
                      alt={property.title}
                      className="mtch-card-prop-img"
                    />
                    <div className="mtch-card-prop-info">
                      <h4 className="mtch-card-prop-title">
                        <Link to={`/property/${property._id}`}>
                          {property.title}
                        </Link>
                      </h4>
                      <span className="mtch-card-prop-detail">
                        {property.location?.area}, {property.location?.city} &middot;{" "}
                        {property.bedrooms} bed &middot; {property.bathrooms} bath
                        &middot; {property.size} {property.sizeUnit}
                      </span>
                    </div>
                    <span className="mtch-card-prop-price">
                      PKR {formatPrice(property.price)}
                    </span>
                  </div>
                )}

                {/* ── Summary ── */}
                <p className="mtch-card-summary">{match.summary}</p>

                {/* ── Participants ── */}
                <div className="mtch-card-participants">
                  {personA && (
                    <div className="mtch-card-person">
                      {personA.avatar ? (
                        <img
                          src={personA.avatar}
                          alt={`${personA.firstName} ${personA.lastName}`}
                          className="mtch-card-person-avatar"
                        />
                      ) : (
                        <div className="mtch-card-person-avatar-fallback">
                          {personA.firstName.charAt(0)}
                        </div>
                      )}
                      <div className="mtch-card-person-info">
                        <span className="mtch-card-person-name">
                          {personA.firstName} {personA.lastName}
                        </span>
                        <span className="mtch-card-person-role">
                          {personA.role}
                        </span>
                      </div>
                    </div>
                  )}

                  <span className="mtch-card-connector">↔</span>

                  {personB && (
                    <div className="mtch-card-person">
                      {personB.avatar ? (
                        <img
                          src={personB.avatar}
                          alt={`${personB.firstName} ${personB.lastName}`}
                          className="mtch-card-person-avatar"
                        />
                      ) : (
                        <div className="mtch-card-person-avatar-fallback">
                          {personB.firstName.charAt(0)}
                        </div>
                      )}
                      <div className="mtch-card-person-info">
                        <span className="mtch-card-person-name">
                          {personB.firstName} {personB.lastName}
                        </span>
                        <span className="mtch-card-person-role">
                          {personB.role}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Actions ── */}
                <div className="mtch-card-actions">
                  <Link to="/messages" className="mtch-btn mtch-btn--primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Message
                  </Link>
                  {property && (
                    <Link
                      to={`/property/${property._id}`}
                      className="mtch-btn mtch-btn--secondary"
                    >
                      View Property
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Matches;
