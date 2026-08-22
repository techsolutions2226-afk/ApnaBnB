/* ─── MyRequirements — View and manage the current user's requirements ───
   Mirrors the My Listings page: filter tabs, card grid, view/edit/delete
   actions, and a "Post Requirement" entry point.
   ─────────────────────────────────────────────── */

import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  useUserRequirements,
  useDeleteRequirement,
} from "../hooks/useRequirements";
import useViewRole from "../hooks/useViewRole";
import { formatPrice } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import RefreshButton from "../components/common/RefreshButton";
import useRefresh from "../hooks/useRefresh";
import StatusBadge from "../components/common/StatusBadge";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  FiEdit2,
  FiTrash2,
  FiEye,
  FiMapPin,
  FiPlus,
  FiCalendar,
  FiTag,
  FiHome,
  FiClock,
} from "react-icons/fi";
import "../styles/Dashboard.css";
import "../styles/MyListings.css";
import "../styles/Common.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "closed", label: "Closed" },
];

const MyRequirements = () => {
  const { currentUser, getDashboardPath } = useAuth();
  const { viewRole } = useViewRole();
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const {
    requirements,
    isLoading: reqLoading,
    error: reqError,
    refetch: refetchReqs,
  } = useUserRequirements(currentUser?.id, viewRole);

  // Refresh just this tab — no browser reload.
  const { refresh, refreshing } = useRefresh(refetchReqs);

  const { remove: deleteRequirement, isLoading: deleteLoading } =
    useDeleteRequirement();

  /* ── Apply filter ── */
  const filteredReqs = useMemo(() => {
    if (activeFilter === "all") return requirements || [];
    return (requirements || []).filter((r) => r.status === activeFilter);
  }, [requirements, activeFilter]);

  /* ── Count per filter ── */
  const counts = useMemo(() => ({
    all: (requirements || []).length,
    active: (requirements || []).filter((r) => r.status === "active").length,
    fulfilled: (requirements || []).filter((r) => r.status === "fulfilled").length,
    closed: (requirements || []).filter((r) => r.status === "closed").length,
  }), [requirements]);

  /* ── Delete handler ── */
  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteRequirement(deletingId);
      toast.success("Requirement deleted successfully");
      setDeletingId(null);
      refetchReqs();
    } catch (err) {
      toast.error(err.message || "Failed to delete requirement");
    }
  }, [deletingId, deleteRequirement, refetchReqs]);

  const deletingReq = deletingId
    ? (requirements || []).find((r) => r.id === deletingId || r._id === deletingId)
    : null;

  if (reqLoading) {
    return (
      <div className="ml-page">
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div className="cm-spinner" style={{ margin: "0 auto 20px" }} />
          <p>Loading your requirements...</p>
        </div>
      </div>
    );
  }

  if (reqError) {
    return (
      <div className="ml-page">
        <div style={{ padding: "40px", textAlign: "center", color: "#d32f2f" }}>
          <p>Error loading requirements: {reqError}</p>
          <button
            onClick={refetchReqs}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#134e2c",
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

  return (
    <div className="ml-page">
      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: getDashboardPath() },
          { label: "My Requirements" },
        ]}
      />

      <div className="ml-header">
        <div className="ml-header-content">
          <h1 className="ml-title">My Requirements</h1>
          <p className="ml-subtitle">
            Manage what you're looking for —{" "}
            <span className="ml-count">{(requirements || []).length}</span> total
          </p>
        </div>
        <div className="ml-header-actions">
          <RefreshButton onRefresh={refresh} refreshing={refreshing} />
          <Link to="/requirements/new" className="ml-new-btn">
            <FiPlus />
            Post New Requirement
          </Link>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="ml-filters-container">
        <div className="ml-filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={`ml-filter-btn ${activeFilter === filter.key ? "ml-filter-btn--active" : ""}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
              <span className="ml-filter-count">{counts[filter.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Requirement Cards ── */}
      {filteredReqs.length > 0 ? (
        <div className="ml-cards">
          {filteredReqs.map((req) => {
            const budgetMin = req.budget?.min;
            const budgetMax = req.budget?.max;
            return (
              <div key={req.id || req._id} className="ml-card">
                {/* Image-less header strip */}
                <div
                  className="ml-card-image-section"
                  style={{
                    minHeight: 90,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #134e2c 0%, #2e7d32 100%)",
                  }}
                >
                  <FiHome size={34} color="#fff" />
                  <div
                    className="ml-card-badges-overlay"
                    style={{ position: "absolute", top: 10, right: 10 }}
                  >
                    <StatusBadge status={req.status || "active"} prefix="ml-badge" />
                  </div>
                </div>

                <div className="ml-card-content">
                  <div className="ml-card-header">
                    <h3 className="ml-card-title">{req.title || "Requirement"}</h3>
                    <p className="ml-card-location">
                      <FiMapPin />{" "}
                      {[req.location?.area, req.location?.city].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="ml-card-details">
                    {req.purpose && (
                      <span className="ml-detail-item">
                        <FiTag /> {req.purpose === "rent" ? "For Rent" : "For Sale"}
                      </span>
                    )}
                    {req.bedrooms ? (
                      <span className="ml-detail-item">🛏 {req.bedrooms} Bed</span>
                    ) : null}
                    {req.bathrooms ? (
                      <span className="ml-detail-item">🛁 {req.bathrooms} Bath</span>
                    ) : null}
                    {req.size ? (
                      <span className="ml-detail-item">📐 {req.size}</span>
                    ) : null}
                    <span className="ml-detail-item">
                      🏷 {req.propertyType || "—"}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="ml-card-stats">
                    <div className="ml-stat">
                      <FiCalendar className="ml-stat-icon" />
                      <span>
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                    {req.urgency && (
                      <div className="ml-stat">
                        <FiClock className="ml-stat-icon" />
                        <span>{req.urgency}</span>
                      </div>
                    )}
                  </div>

                  {/* Budget */}
                  <div className="ml-card-price">
                    {budgetMin != null || budgetMax != null
                      ? `${formatPrice(budgetMin, { prefix: true })} – ${formatPrice(budgetMax, { prefix: true })}`
                      : "Budget on request"}
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-card-actions">
                    <Link
                      to={`/requirements/${req.id || req._id}`}
                      className="ml-btn ml-btn--view"
                    >
                      <FiEye /> View
                    </Link>
                    <Link
                      to={`/requirements/${req.id || req._id}/edit`}
                      className="ml-btn ml-btn--edit"
                    >
                      <FiEdit2 /> Edit
                    </Link>
                    <button
                      className="ml-btn ml-btn--delete"
                      onClick={() => setDeletingId(req.id || req._id)}
                      disabled={deleteLoading}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="lst-empty">
          <div className="lst-empty-icon">📝</div>
          <h2 className="lst-empty-title">
            {activeFilter === "all"
              ? "No requirements yet"
              : `No ${activeFilter} requirements`}
          </h2>
          <p className="lst-empty-text">
            {activeFilter === "all"
              ? "Post your first requirement and let sellers and dealers reach out with matching properties."
              : "Try a different filter or post a new requirement."}
          </p>
          {activeFilter === "all" && (
            <Link to="/requirements/new" className="lst-btn lst-btn--primary">
              Post Your First Requirement
            </Link>
          )}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmDialog
        isOpen={!!deletingReq}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Requirement?"
        message={
          <>
            Are you sure you want to delete{" "}
            <strong>{deletingReq?.title || "this requirement"}</strong>? This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        icon="⚠️"
      />
    </div>
  );
};

export default MyRequirements;