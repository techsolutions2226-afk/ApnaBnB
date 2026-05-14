import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import adminService from "../services/adminService";
import requirementService from "../services/requirementService";
import matchService from "../services/matchService";
import { formatPrice } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import FilterTabs from "../components/common/FilterTabs";
import "../styles/Admin.css";
import "../styles/Dashboard.css";

const USER_TABS = [
  { key: "all", label: "All Users" },
  { key: "seller", label: "Sellers" },
  { key: "buyer", label: "Buyers" },
  { key: "dealer", label: "Dealers" },
];

const LISTING_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "sold", label: "Sold" },
  { key: "featured", label: "Featured" },
];

const AdminDashboard = () => {
  const { currentUser } = useAuth();

  const [userTab, setUserTab] = useState("all");
  const [listingTab, setListingTab] = useState("all");

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      adminService.getStats(),
      adminService.getUsers({ limit: 200 }),
      adminService.getProperties({ limit: 200 }),
      requirementService.getAll().catch(() => []),
      matchService.getMatches().catch(() => []),
    ])
      .then(([statsResp, usersResp, propsResp, reqResp, matchResp]) => {
        if (cancelled) return;
        setStats(statsResp);
        setUsers(usersResp.users || []);
        setProperties(propsResp.properties || []);
        setRequirements(Array.isArray(reqResp) ? reqResp : reqResp.requirements || []);
        setMatches(Array.isArray(matchResp) ? matchResp : matchResp.matches || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load admin data");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Non-admin users only
  const allUsers = useMemo(
    () => users.filter((u) => u.role !== "admin"),
    [users]
  );

  const filteredUsers = useMemo(() => {
    if (userTab === "all") return allUsers;
    return allUsers.filter((u) => u.role === userTab);
  }, [allUsers, userTab]);

  const filteredProperties = useMemo(() => {
    if (listingTab === "all") return properties;
    return properties.filter((p) => p.status === listingTab);
  }, [properties, listingTab]);

  if (isLoading) {
    return (
      <div className="adm-page">
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-page">
        <div style={{ padding: "40px", textAlign: "center", color: "#d32f2f" }}>
          <p>Error loading admin dashboard: {error}</p>
        </div>
      </div>
    );
  }

  const sellerCount =
    stats?.usersByRole?.find((r) => r._id === "seller")?.count || 0;
  const buyerCount =
    stats?.usersByRole?.find((r) => r._id === "buyer")?.count || 0;
  const dealerCount =
    stats?.usersByRole?.find((r) => r._id === "dealer")?.count || 0;
  const activeListingsCount =
    stats?.listingsByStatus?.find((s) => s._id === "active")?.count || 0;
  const soldListingsCount =
    stats?.listingsByStatus?.find((s) => s._id === "sold")?.count || 0;
  const featuredListingsCount =
    stats?.listingsByStatus?.find((s) => s._id === "featured")?.count || 0;

  const activeRequirements = requirements.filter(
    (r) => r.status === "active"
  ).length;
  const acceptedMatches = matches.filter(
    (m) => m.status === "accepted" || m.status === "active"
  ).length;

  return (
    <div className="adm-page">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard" },
        ]}
      />

      <div className="adm-header">
        <h1 className="adm-title">Admin Dashboard</h1>
        <p className="adm-subtitle">
          Platform overview and management for {currentUser?.name}
        </p>
        <span className="adm-role-badge">Admin</span>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <StatCard icon="👥" value={stats?.totalUsers || 0} label="Total Users" />
        <StatCard
          icon="🏠"
          value={stats?.totalProperties || 0}
          label="Total Properties"
        />
        <StatCard
          icon="📝"
          value={stats?.totalRequirements || 0}
          label="Requirements"
        />
        <StatCard icon="🔗" value={stats?.totalMatches || 0} label="Matches" />
        <StatCard
          icon="💬"
          value={stats?.totalMessages || 0}
          label="Messages"
        />
        <StatCard
          icon="💼"
          value={stats?.totalConversations || 0}
          label="Conversations"
        />
      </div>

      {/* Summary cards */}
      <div className="adm-summary-grid">
        <div className="adm-summary-card">
          <h3 className="adm-summary-card-title">User Breakdown</h3>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Sellers</span>
            <span className="adm-summary-value">{sellerCount}</span>
          </div>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Buyers</span>
            <span className="adm-summary-value">{buyerCount}</span>
          </div>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Dealers</span>
            <span className="adm-summary-value">{dealerCount}</span>
          </div>
        </div>

        <div className="adm-summary-card">
          <h3 className="adm-summary-card-title">Property Breakdown</h3>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Active</span>
            <span className="adm-summary-value">{activeListingsCount}</span>
          </div>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Featured</span>
            <span className="adm-summary-value">{featuredListingsCount}</span>
          </div>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Sold</span>
            <span className="adm-summary-value">{soldListingsCount}</span>
          </div>
        </div>

        <div className="adm-summary-card">
          <h3 className="adm-summary-card-title">Engagement</h3>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Active Requirements</span>
            <span className="adm-summary-value">{activeRequirements}</span>
          </div>
          <div className="adm-summary-row">
            <span className="adm-summary-label">Accepted Matches</span>
            <span className="adm-summary-value">{acceptedMatches}</span>
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="adm-section">
        <div className="adm-section-header">
          <h2 className="adm-section-title">Users</h2>
          <span className="adm-section-count">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="adm-toolbar">
          <FilterTabs
            tabs={USER_TABS}
            activeKey={userTab}
            onChange={setUserTab}
            prefix="adm-tab"
          />
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Email</th>
                <th>Verified</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="adm-user-cell">
                      <div className="adm-user-avatar-fallback">
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="adm-user-info">
                        <span className="adm-user-name">{user.name}</span>
                        <span className="adm-user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={user.role} prefix="adm-badge" />
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {user.verified ? (
                      <span className="adm-verified">
                        <span className="adm-verified-dot" /> Verified
                      </span>
                    ) : (
                      <span className="adm-unverified">
                        <span className="adm-unverified-dot" /> Pending
                      </span>
                    )}
                  </td>
                  <td>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Properties */}
      <div className="adm-section">
        <div className="adm-section-header">
          <h2 className="adm-section-title">Properties</h2>
          <span className="adm-section-count">
            {filteredProperties.length} propert
            {filteredProperties.length !== 1 ? "ies" : "y"}
          </span>
        </div>

        <div className="adm-toolbar">
          <FilterTabs
            tabs={LISTING_TABS}
            activeKey={listingTab}
            onChange={setListingTab}
            prefix="adm-tab"
          />
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Price</th>
                <th>Listed</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((property) => (
                <tr key={property._id}>
                  <td>
                    <div className="adm-table-title">
                      <Link
                        to={`/property/${property._id}`}
                        style={{ color: "#222", textDecoration: "none" }}
                      >
                        {property.title}
                      </Link>
                    </div>
                    <div className="adm-table-sub">
                      {property.location?.area}, {property.location?.city}
                    </div>
                  </td>
                  <td>
                    <div className="adm-table-title">
                      {property.listedBy?.name || "—"}
                    </div>
                    {property.listedBy?.role && (
                      <div className="adm-table-sub">
                        <StatusBadge
                          status={property.listedBy.role}
                          prefix="adm-badge"
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={property.status} prefix="adm-badge" />
                  </td>
                  <td>
                    {formatPrice(property.price || 0, { prefix: true })}
                  </td>
                  <td>
                    {property.createdAt
                      ? new Date(property.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requirements */}
      <div className="adm-section">
        <div className="adm-section-header">
          <h2 className="adm-section-title">Requirements</h2>
          <span className="adm-section-count">
            {requirements.length} requirement
            {requirements.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Posted By</th>
                <th>City</th>
                <th>Budget</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => (
                <tr key={req._id}>
                  <td>
                    <div className="adm-table-title">{req.title}</div>
                    <div className="adm-table-sub">
                      {req.location?.area || "—"}
                      {req.size ? ` · ${req.size}` : ""}
                    </div>
                  </td>
                  <td>
                    <div className="adm-table-title">
                      {req.requiredBy?.name || "—"}
                    </div>
                    {req.requiredBy?.role && (
                      <div className="adm-table-sub">
                        <StatusBadge
                          status={req.requiredBy.role}
                          prefix="adm-badge"
                        />
                      </div>
                    )}
                  </td>
                  <td>{req.location?.city}</td>
                  <td>
                    {formatPrice(req.budget?.min || 0, { prefix: true })} –{" "}
                    {formatPrice(req.budget?.max || 0, { prefix: true })}
                  </td>
                  <td>{req.propertyType}</td>
                  <td>
                    <StatusBadge status={req.status} prefix="adm-badge" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matches */}
      <div className="adm-section">
        <div className="adm-section-header">
          <h2 className="adm-section-title">Matches</h2>
          <span className="adm-section-count">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </span>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const propTitle =
                  match.property?.title || match.property || "—";
                const propLoc = match.property?.location
                  ? `${match.property.location.area || ""}, ${match.property.location.city || ""}`
                  : "";
                return (
                  <tr key={match._id}>
                    <td>
                      <div className="adm-table-title">{propTitle}</div>
                      <div className="adm-table-sub">{propLoc}</div>
                    </td>
                    <td>{match.type?.replace(/-/g, " ↔ ")}</td>
                    <td>
                      <strong>{match.score || 0}%</strong>
                    </td>
                    <td>
                      <StatusBadge status={match.status} prefix="adm-badge" />
                    </td>
                    <td>
                      {match.createdAt
                        ? new Date(match.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
