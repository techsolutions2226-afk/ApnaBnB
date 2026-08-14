import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useUserListings, useDeleteListing } from "../hooks/useListings";
import { useMyMatches } from "../hooks/useMatches";
import { useDashboardData } from "../hooks/useDashboardData";
import DashStat from "../components/dashboard/DashStat";
import SectionHeader from "../components/dashboard/SectionHeader";
import RecentMatches from "../components/dashboard/RecentMatches";
import OwnerReviewsSection from "../components/dashboard/OwnerReviewsSection";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  FiHome,
  FiEye,
  FiMail,
  FiGitMerge,
  FiMessageSquare,
  FiPlusSquare,
  FiList,
  FiClipboard,
  FiCreditCard,
  FiEdit3,
  FiEye as FiView,
  FiEdit2,
  FiTrash2,
  FiZap,
} from "react-icons/fi";
import { formatLocation } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatusBadge from "../components/common/StatusBadge";
import "../styles/Dashboard.css";

const DealerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = currentUser?.id;

  // Fetch dealer's listings
  const { listings, isLoading: listingsLoading, error: listingsError, refetch: refetchListings } = useUserListings(userId);

  // Delete listing hook
  const { remove: deleteListing, isLoading: isDeleting } = useDeleteListing();

  // Live aggregate data
  const { unreadMessages } = useDashboardData();

  // All matches involving this dealer
  const { matches: myMatches, isLoading: matchesLoading } = useMyMatches();
  const matchCount = myMatches?.length || 0;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);

  const stats = {
    activeListings: listings?.filter((l) => l.status === "active").length || 0,
    totalViews: listings?.reduce((sum, l) => sum + (l.views || 0), 0) || 0,
    totalInquiries: listings?.reduce((sum, l) => sum + (l.inquiries || 0), 0) || 0,
  };

  const handleDeleteClick = (listing) => {
    setListingToDelete(listing);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    try {
      await deleteListing(listingToDelete._id);
      toast.success("Listing deleted successfully");
      refetchListings();
    } catch (error) {
      toast.error(error.message || "Failed to delete listing");
    } finally {
      setDeleteModalOpen(false);
      setListingToDelete(null);
    }
  };

  if (listingsLoading) {
    return (
      <div className="dash-page">
        <div className="dash-loading">
          <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
          <p className="dash-loading-text">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (listingsError) {
    return (
      <div className="dash-page">
        <div className="dash-error">
          <p className="dash-error-text">Error loading listings: {listingsError}</p>
          <button onClick={refetchListings} className="dash-retry">
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
          { label: "Dealer Dashboard" },
        ]}
      />

      {/* ── Header ── */}
      <div className="dash-header">
        <h1 className="dash-greeting">
          Welcome back, {currentUser?.name || "Dealer"}
        </h1>
        <p className="dash-subtitle">
          Manage your deals, connect buyers with sellers, and grow your business
        </p>
        <span className="dash-role-badge dash-role-badge--dealer">Dealer</span>
      </div>

      {/* ── Plans CTA ── */}
      <div className="dash-sub-none">
        <span className="dash-sub-none-text">
          No active subscription — upgrade to unlock premium features
        </span>
        <Link to="/plans" className="dash-sub-none-link">
          <FiZap size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          View Plans
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dash-stats">
        <DashStat
          icon={FiHome}
          value={stats.activeListings}
          label="Active Listings"
          accent="#1a8f5a"
          to="/my-listings"
        />
        <DashStat
          icon={FiEye}
          value={stats.totalViews.toLocaleString()}
          label="Total Views"
          accent="#1f4a6d"
        />
        <DashStat
          icon={FiMail}
          value={stats.totalInquiries}
          label="Inquiries"
          accent="#a16207"
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
          <Link to="/listing/new" className="dash-quick">
            <span className="dash-quick-icon">
              <FiPlusSquare size={17} />
            </span>
            Create Listing
          </Link>
          <Link to="/my-listings" className="dash-quick dash-quick--alt">
            <span className="dash-quick-icon">
              <FiList size={17} />
            </span>
            Manage Listings
          </Link>
          <Link to="/requirements" className="dash-quick">
            <span className="dash-quick-icon">
              <FiClipboard size={17} />
            </span>
            Requirements Board
          </Link>
          <Link to="/requirements/new" className="dash-quick dash-quick--alt">
            <span className="dash-quick-icon">
              <FiEdit3 size={17} />
            </span>
            Post Requirement
          </Link>
        </div>
      </div>

      {/* ── My Listings Table ── */}
      <div className="dash-section">
        <SectionHeader
          title="My Listings"
          to="/my-listings"
          actionText="Manage Listings"
          actionIcon={FiList}
        />
        {listings.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Inquiries</th>
                  <th>Listed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const property = listing.property;
                  return (
                    <tr key={listing._id}>
                      <td data-label="Property">
                        <div className="dash-table-title">
                          {property?.title || listing.propertyId}
                        </div>
                        <div className="dash-table-sub">
                          {formatLocation(property?.location)}
                          {listing.status === "featured" && (
                            <>
                              {" "}
                              · <StatusBadge status="featured" prefix="dash-badge" />
                            </>
                          )}
                        </div>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={listing.status} prefix="dash-badge" />
                      </td>
                      <td data-label="Views">{(listing.views || 0).toLocaleString()}</td>
                      <td data-label="Inquiries">{listing.inquiries || 0}</td>
                      <td data-label="Listed">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </td>
                      <td data-label="Actions">
                        <div className="dash-actions-cell">
                          <button
                            className="dash-action-btn dash-action-btn--view"
                            onClick={() => navigate(`/listing/${listing._id}`)}
                            title="View Details"
                          >
                            <FiView size={15} />
                          </button>
                          <button
                            className="dash-action-btn dash-action-btn--edit"
                            onClick={() => navigate(`/listing/${listing._id}/edit`)}
                            title="Edit Listing"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            className="dash-action-btn dash-action-btn--delete"
                            onClick={() => handleDeleteClick(listing)}
                            title="Delete Listing"
                            disabled={isDeleting}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">🏠</div>
            <p className="dash-empty-text">
              No listings yet. Start by adding a client's property.
            </p>
            <Link to="/listing/new" className="dash-empty-link">
              Create Listing
            </Link>
          </div>
        )}
      </div>

      {/* ── Recent Matches ── */}
      {!matchesLoading && (
        <RecentMatches
          emptyMessage="No matches yet. List a property or post a requirement and we'll surface leads as soon as the city, area, and price line up."
        />
      )}

      {/* ── Reviews on My Properties ── */}
      <OwnerReviewsSection userId={userId} />

      {/* ── Plans CTA footer ── */}
      <div className="dash-section">
        <div className="dash-sub-none">
          <span className="dash-sub-none-text">
            Upgrade to a Pro plan and get featured listings + more leads.
          </span>
          <Link to="/plans" className="dash-sub-none-link">
            <FiCreditCard size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            View Plans
          </Link>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Delete Listing"
        message={`Are you sure you want to delete "${listingToDelete?.property?.title || "this listing"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setListingToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DealerDashboard;