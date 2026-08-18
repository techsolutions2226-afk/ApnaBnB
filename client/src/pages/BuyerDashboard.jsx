import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useUserRequirements, useDeleteRequirement } from "../hooks/useRequirements";
import { useMyMatches } from "../hooks/useMatches";
import { useDashboardData } from "../hooks/useDashboardData";
import useViewRole from "../hooks/useViewRole";
import DashStat from "../components/dashboard/DashStat";
import SectionHeader from "../components/dashboard/SectionHeader";
import RecentMatches from "../components/dashboard/RecentMatches";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  FiFileText,
  FiHeart,
  FiCalendar,
  FiGitMerge,
  FiMessageSquare,
  FiPlusSquare,
  FiSearch,
  FiEye,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { formatPrice, formatCity } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatusBadge from "../components/common/StatusBadge";
import "../styles/Dashboard.css";

const BuyerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = currentUser?.id;
  const { viewRole } = useViewRole();

  // Fetch user's requirements — scoped to the role they're acting as (buyer)
  const { requirements, isLoading: reqLoading, error: reqError, refetch: refetchReqs } = useUserRequirements(userId, viewRole);

  // Delete requirement hook
  const { remove: deleteRequirement, isLoading: isDeleting } = useDeleteRequirement();

  // Live aggregate data (unread messages, wishlist, upcoming trips)
  const { unreadMessages, savedProperties, upcomingTrips, upcomingList } = useDashboardData();

  // All matches for the role the user is ACTING AS (buyer side only)
  const { matches: myMatches, isLoading: matchesLoading } = useMyMatches(viewRole);
  const matchCount = myMatches?.length || 0;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState(null);

  const handleDeleteClick = (req) => {
    setRequirementToDelete(req);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!requirementToDelete) return;
    try {
      await deleteRequirement(requirementToDelete._id);
      toast.success("Requirement deleted successfully");
      refetchReqs();
    } catch (error) {
      toast.error(error.message || "Failed to delete requirement");
    } finally {
      setDeleteModalOpen(false);
      setRequirementToDelete(null);
    }
  };

  const stats = {
    activeRequirements: requirements?.filter((r) => r.status === "active").length || 0,
  };

  if (reqLoading) {
    return (
      <div className="dash-page">
        <div className="dash-loading">
          <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
          <p className="dash-loading-text">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (reqError) {
    return (
      <div className="dash-page">
        <div className="dash-error">
          <p className="dash-error-text">Error loading dashboard: {reqError}</p>
          <button onClick={refetchReqs} className="dash-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Buyer Dashboard" },
        ]}
      />

      {/* ── Header ── */}
      <div className="dash-header">
        <h1 className="dash-greeting">
          Welcome back, {currentUser?.name || "Buyer"}
        </h1>
        <p className="dash-subtitle">
          Track your property search and find your perfect home
        </p>
        <span className="dash-role-badge dash-role-badge--buyer">Buyer</span>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dash-stats">
        <DashStat
          icon={FiFileText}
          value={stats.activeRequirements}
          label="Active Requirements"
          accent="#1a8f5a"
          to="/my-requirements"
        />
        <DashStat
          icon={FiHeart}
          value={savedProperties}
          label="Saved Properties"
          accent="#db2777"
          to="/wishlists"
        />
        <DashStat
          icon={FiCalendar}
          value={upcomingTrips}
          label="Upcoming Visits"
          accent="#1f4a6d"
          to="/trips"
        />
        <DashStat
          icon={FiGitMerge}
          value={matchCount}
          label="Matches"
          accent="#7c3aed"
          to="/matches"
        />
        <DashStat
          icon={FiMessageSquare}
          value={unreadMessages}
          label="Unread Messages"
          accent="#0284c7"
          to="/messages"
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="dash-section">
        <SectionHeader title="Quick Actions" />
        <div className="dash-quick-grid">
          <Link to="/requirements/new" className="dash-quick">
            <span className="dash-quick-icon">
              <FiPlusSquare size={17} />
            </span>
            Post Requirement
          </Link>
          <Link to="/" className="dash-quick dash-quick--alt">
            <span className="dash-quick-icon">
              <FiSearch size={17} />
            </span>
            Browse Properties
          </Link>
          <Link to="/wishlists" className="dash-quick">
            <span className="dash-quick-icon">
              <FiHeart size={17} />
            </span>
            My Wishlists
          </Link>
          <Link to="/messages" className="dash-quick dash-quick--alt">
            <span className="dash-quick-icon">
              <FiMessageSquare size={17} />
            </span>
            Messages
          </Link>
        </div>
      </div>

      {/* ── My Requirements Table ── */}
      <div className="dash-section">
        <SectionHeader
          title="My Requirements"
          to="/requirements/new"
          actionText="Post new"
          actionIcon={FiPlusSquare}
        />
        {requirements.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>City</th>
                  <th>Budget</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Posted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => (
                  <tr key={req._id}>
                    <td data-label="Requirement">
                      <div className="dash-table-title">
                        {req.title || `${req.propertyType} in ${req.location?.city}`}
                      </div>
                      <div className="dash-table-sub">
                        {req.location?.area || "N/A"} · {req.bedrooms || "N/A"} beds
                      </div>
                    </td>
                    <td data-label="City">{req.location?.city}</td>
                    <td data-label="Budget">
                      {formatPrice(req.budget?.min || 0, { prefix: true })} –{" "}
                      {formatPrice(req.budget?.max || 0, { prefix: true })}
                    </td>
                    <td data-label="Type">{req.propertyType}</td>
                    <td data-label="Status">
                      <StatusBadge status={req.status || "active"} prefix="dash-badge" />
                    </td>
                    <td data-label="Posted">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td data-label="Actions">
                      <div className="dash-actions-cell">
                        <button
                          className="dash-action-btn dash-action-btn--view"
                          onClick={() => navigate(`/requirements/${req._id}`)}
                          title="View Details"
                        >
                          <FiEye size={15} />
                        </button>
                        <button
                          className="dash-action-btn dash-action-btn--edit"
                          onClick={() => navigate(`/requirements/${req._id}/edit`)}
                          title="Edit"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          className="dash-action-btn dash-action-btn--delete"
                          onClick={() => handleDeleteClick(req)}
                          title="Delete"
                          disabled={isDeleting}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">📝</div>
            <p className="dash-empty-text">
              You haven't posted any requirements yet. Let sellers know what
              you're looking for.
            </p>
            <Link to="/requirements/new" className="dash-empty-link">
              Post Your First Requirement
            </Link>
          </div>
        )}
      </div>

      {/* ── Recent Matches ── */}
      {!matchesLoading && (
        <RecentMatches
          emptyMessage="No matches yet. Post a requirement and we'll find properties for you — matches appear when a property is in the same city, same area, and within ±10% of your budget."
        />
      )}

      {/* ── Upcoming Visits ── */}
      <div className="dash-section">
        <SectionHeader title="Upcoming Visits" to="/trips" actionIcon={FiCalendar} />
        {upcomingList.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Guests</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingList.slice(0, 5).map((trip) => (
                  <tr key={trip.id}>
                    <td data-label="Property">
                      <div className="dash-table-title">
                        {trip.property?.title || "Scheduled visit"}
                      </div>
                      <div className="dash-table-sub">
                        {formatCity(trip.property?.location)}
                      </div>
                    </td>
                    <td data-label="Check-in">{trip.checkIn || "—"}</td>
                    <td data-label="Check-out">{trip.checkOut || "—"}</td>
                    <td data-label="Guests">
                      {(trip.guests?.adults || 0) +
                        (trip.guests?.children || 0) +
                        (trip.guests?.infants || 0)}
                    </td>
                    <td data-label="Total">
                      {formatPrice(trip.totalPrice || 0, { prefix: true })}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={trip.status || "upcoming"} prefix="dash-badge" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">📅</div>
            <p className="dash-empty-text">No property visits scheduled.</p>
            <Link to="/" className="dash-empty-link">
              Browse Properties
            </Link>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Delete Requirement"
        message={`Are you sure you want to delete "${requirementToDelete?.title || "this requirement"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setRequirementToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default BuyerDashboard;