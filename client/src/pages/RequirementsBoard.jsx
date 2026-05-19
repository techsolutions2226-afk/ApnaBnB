/* ─── RequirementsBoard — Browse all property requirements ───
   Dealers browse buyer + dealer requirements to find leads.
   Includes stats bar, role/city filters, search, and card grid.
   ─────────────────────────────────────────────── */

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequirements } from "../hooks/useRequirements";
import { timeAgo } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import FilterTabs from "../components/common/FilterTabs";
import SearchInput from "../components/common/SearchInput";
import Skeleton from "../components/common/Skeleton";
import "../styles/Requirement.css";

/* ── Constants ── */
const ROLE_FILTERS = [
  { key: "all", label: "All Requirements" },
  { key: "buyer", label: "Buyer" },
  { key: "dealer", label: "Dealer" },
];

const CITY_FILTERS = ["All Cities", "Lahore", "Islamabad", "Karachi"];

/* ── Helpers ── */
const formatBudget = (num) => {
  if (num >= 10000000) return `${(num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 1)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)} Lac`;
  return num.toLocaleString("en-PK");
};

const getUrgencyClass = (urgency) => {
  if (urgency === "30 days") return "req-card-urgency--urgent";
  if (urgency === "45 days" || urgency === "60 days") return "req-card-urgency--normal";
  return "req-card-urgency--flexible";
};

const RequirementsBoard = () => {
  const { currentUser } = useAuth();

  /* ── State ── */
  const [roleFilter, setRoleFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [search, setSearch] = useState("");

  /* ── Load requirements from API ── */
  const { requirements = [], isLoading, error } = useRequirements();

  /* ── Stats (computed from real data) ── */
  const stats = useMemo(
    () => ({
      total: requirements.length,
      buyer: requirements.filter((r) => r.role === "buyer").length,
      dealer: requirements.filter((r) => r.role === "dealer").length,
      active: requirements.length, // Assuming all fetched are active
    }),
    [requirements]
  );

  /* ── Filtered requirements ── */
  const filteredRequirements = useMemo(() => {
    let result = [...requirements];

    /* Role filter */
    if (roleFilter !== "all") {
      result = result.filter((r) => r.role === roleFilter);
    }

    /* City filter */
    if (cityFilter !== "All Cities") {
      result = result.filter((r) => r.city === cityFilter);
    }

    /* Search — matches title, area, notes, or poster name */
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => {
        const posterName = r.userId?.name || r.createdBy?.name || "";
        return (
          r.title?.toLowerCase().includes(q) ||
          r.area?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q) ||
          r.propertyType?.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          posterName.toLowerCase().includes(q)
        );
      });
    }

    /* Sort: active first, then by date descending */
    result.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [roleFilter, cityFilter, search, requirements]);

  /* ── Handlers ── */
  const handleRoleFilter = useCallback((key) => setRoleFilter(key), []);
  const handleCityFilter = useCallback((city) => setCityFilter(city), []);
  const handleSearch = useCallback((e) => setSearch(e.target.value), []);

  // Role-aware breadcrumb target so sellers don't get bounced to /dashboard/dealer.
  const dashboardPath =
    currentUser?.role === "seller"
      ? "/dashboard/seller"
      : currentUser?.role === "buyer"
        ? "/dashboard/buyer"
        : "/dashboard/dealer";

  return (
    <div className="req-page">
      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: dashboardPath },
          { label: "Requirements Board" },
        ]}
      />

      {/* ── Header ── */}
      <div className="req-header">
        <h1 className="req-title">Requirements Board</h1>
        <p className="req-subtitle">
          Browse property requirements from buyers and dealers — find people looking for properties like yours.
        </p>
      </div>

      {/* ── Stats Bar ── */}
      <div className="req-stats-bar">
        <div className="req-stats-item">
          <span className="req-stats-num">{stats.total}</span>
          <span className="req-stats-label">Total</span>
        </div>
        <div className="req-stats-item">
          <span className="req-stats-num">{stats.active}</span>
          <span className="req-stats-label">Active</span>
        </div>
        <div className="req-stats-item">
          <span className="req-stats-num">{stats.buyer}</span>
          <span className="req-stats-label">From Buyers</span>
        </div>
        <div className="req-stats-item">
          <span className="req-stats-num">{stats.dealer}</span>
          <span className="req-stats-label">From Dealers</span>
        </div>
      </div>

      {/* ── Toolbar: Filters + Search ── */}
      <div className="req-toolbar">
        <div className="req-filters">
          {/* Role filters */}
          <FilterTabs
            tabs={ROLE_FILTERS}
            activeKey={roleFilter}
            onChange={handleRoleFilter}
            prefix="req-filter-btn"
          />

          {/* Separator */}
          <span style={{ width: 1, height: 20, background: "#ddd", margin: "0 4px" }} />

          {/* City filters */}
          <FilterTabs
            tabs={CITY_FILTERS.map((c) => ({ key: c, label: c }))}
            activeKey={cityFilter}
            onChange={handleCityFilter}
            prefix="req-filter-btn"
          />
        </div>

        {/* Search */}
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search requirements..."
          className="req-search-wrap"
        />
      </div>

      {/* ── Results Count ── */}
      {!isLoading && !error && (
        <p style={{ fontSize: 14, color: "#717171", marginBottom: 16 }}>
          Showing {filteredRequirements.length} requirement
          {filteredRequirements.length !== 1 ? "s" : ""}
          {roleFilter !== "all" && ` from ${roleFilter}s`}
          {cityFilter !== "All Cities" && ` in ${cityFilter}`}
          {search.trim() && ` matching "${search.trim()}"`}
        </p>
      )}

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="req-cards">
          <Skeleton count={6} />
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#d32f2f" }}>
          <p>Error loading requirements: {error}</p>
        </div>
      )}

      {/* ── Cards Grid ── */}
      {!isLoading && !error && filteredRequirements.length > 0 ? (
        <div className="req-cards">
          {filteredRequirements.map((req) => {
            const poster =
              (req.userId && typeof req.userId === "object" ? req.userId : null) ||
              (req.createdBy && typeof req.createdBy === "object" ? req.createdBy : null);
            const posterName = poster?.name || "Unknown";
            const posterInitial = posterName.charAt(0).toUpperCase();
            const isFulfilled = req.status === "fulfilled";
            const isOwn = currentUser && (req.userId?._id === currentUser.id || req.userId === currentUser.id);

            return (
              <div
                key={req.id}
                className="req-card"
                style={isFulfilled ? { opacity: 0.6 } : undefined}
              >
                {/* ── Card Header ── */}
                <div className="req-card-header">
                  <div>
                    <h3 className="req-card-title">{req.title}</h3>
                    {isOwn && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#00856f",
                          marginTop: 2,
                          display: "inline-block",
                        }}
                      >
                        Your requirement
                      </span>
                    )}
                  </div>
                  <span
                    className={`req-card-role req-card-role--${req.role}`}
                  >
                    {req.role}
                  </span>
                </div>

                {/* ── Details Grid ── */}
                <div className="req-card-details">
                  <div className="req-card-detail">
                    <span className="req-card-detail-label">Location</span>
                    <span className="req-card-detail-value">
                      {req.area}, {req.city}
                    </span>
                  </div>
                  <div className="req-card-detail">
                    <span className="req-card-detail-label">Budget</span>
                    <span className="req-card-detail-value">
                      {formatBudget(req.budgetMin)} — {formatBudget(req.budgetMax)}
                    </span>
                  </div>
                  <div className="req-card-detail">
                    <span className="req-card-detail-label">Type</span>
                    <span className="req-card-detail-value">
                      {req.propertyType} &middot; {req.size}
                    </span>
                  </div>
                  <div className="req-card-detail">
                    <span className="req-card-detail-label">Rooms</span>
                    <span className="req-card-detail-value">
                      {req.bedrooms > 0 || req.bathrooms > 0
                        ? `${req.bedrooms} Bed / ${req.bathrooms} Bath`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* ── Notes ── */}
                {req.notes && (
                  <p className="req-card-notes">{req.notes}</p>
                )}

                {/* ── Footer ── */}
                <div className="req-card-footer">
                  <div className="req-card-poster">
                    {poster?.avatar ? (
                      <img
                        src={poster.avatar}
                        alt={posterName}
                        className="req-card-avatar"
                      />
                    ) : (
                      <div className="req-card-avatar-fallback">
                        {posterInitial}
                      </div>
                    )}
                    <div>
                      <div className="req-card-poster-name">{posterName}</div>
                      <div className="req-card-date">{timeAgo(req.createdAt)}</div>
                    </div>
                  </div>

                  {isFulfilled ? (
                    <span
                      className="req-card-urgency req-card-urgency--flexible"
                      style={{ background: "#e8f0fe", color: "#1a56db" }}
                    >
                      Fulfilled
                    </span>
                  ) : (
                    <span
                      className={`req-card-urgency ${getUrgencyClass(req.urgency)}`}
                    >
                      {req.urgency}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="req-empty">
          <div className="req-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h3 className="req-empty-title">No requirements found</h3>
          <p className="req-empty-text">
            Try adjusting your filters or search terms to find more requirements.
          </p>
          <button
            type="button"
            className="req-btn req-btn--secondary req-btn--sm"
            onClick={() => {
              setRoleFilter("all");
              setCityFilter("All Cities");
              setSearch("");
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default RequirementsBoard;
