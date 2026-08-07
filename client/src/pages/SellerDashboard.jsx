import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useUserListings, useDeleteListing } from "../hooks/useListings";
import { useProperties } from "../hooks/useProperties";
import { formatPrice, timeAgo, formatLocation, formatCity } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import NotificationItem from "../components/common/NotificationItem";
import ConfirmDialog from "../components/common/ConfirmDialog";
import OwnerReviewsSection from "../components/dashboard/OwnerReviewsSection";
import RecentMatches from "../components/dashboard/RecentMatches";
import "../styles/Dashboard.css";

const SellerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = currentUser?.id;
  
  // Fetch user's listings
  const { listings, isLoading: listingsLoading, error: listingsError, refetch: refetchListings } = useUserListings(userId);
  
  // Delete listing hook
  const { remove: deleteListing, isLoading: isDeleting } = useDeleteListing();
  
  // State for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  
  // Fetch all properties (for mapping property info)
  const { properties, isLoading: propertiesLoading, error: propertiesError } = useProperties({}, true);

  // Handle delete listing
  const handleDeleteClick = (listing) => {
    setListingToDelete(listing);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;

    try {
      await deleteListing(listingToDelete._id);
      toast.success("Property and listing deleted successfully");
      refetchListings();
    } catch (error) {
      toast.error(error.message || "Failed to delete listing");
    } finally {
      setDeleteModalOpen(false);
      setListingToDelete(null);
    }
  };

  // Calculate stats from listings
  const stats = {
    activeListings: listings?.filter(l => l.status === 'active').length || 0,
    totalViews: listings?.reduce((sum, l) => sum + (l.views || 0), 0) || 0,
    totalInquiries: listings?.reduce((sum, l) => sum + (l.inquiries || 0), 0) || 0,
    matches: listings?.reduce((sum, l) => sum + (l.matches || 0), 0) || 0,
    messages: 0, // TODO: Get from messages service
    notifications: 0, // TODO: Get from notifications
  };

  // Map property details to listings
  const enrichedListings = listings?.map(listing => {
    const propertyObj = (listing.property && typeof listing.property === 'object') 
      ? listing.property 
      : properties?.find(p => p._id === (listing.property || listing.propertyId));
      
    return {
      ...listing,
      propertyDetails: propertyObj
    };
  }) || [];

  // Placeholder for deals - TODO: Get from deals service
  const deals = [];
  const notifications = [];

  if (listingsLoading || propertiesLoading) {
    return (
      <div className="dash-page">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 20px' }} />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (listingsError) {
    return (
      <div className="dash-page">
        <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
          <p>Error loading listings: {listingsError}</p>
          <button onClick={refetchListings} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Seller Dashboard" },
        ]}
      />

      {/* ── Header ── */}
      <div className="dash-header">
        <h1 className="dash-greeting">
          Welcome back, {currentUser?.name || "Seller"}
        </h1>
        <p className="dash-subtitle">
          Here's what's happening with your properties
        </p>
        <span className="dash-role-badge dash-role-badge--seller">Seller</span>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dash-stats">
        <StatCard icon="🏠" value={stats.activeListings} label="Active Listings" />
        <StatCard icon="👁️" value={stats.totalViews.toLocaleString()} label="Total Views" />
        <StatCard icon="📩" value={stats.totalInquiries} label="Total Inquiries" />
        <StatCard icon="🔗" value={stats.matches} label="Matches" />
        <StatCard icon="💬" value={stats.messages} label="Unread Messages" />
        <StatCard icon="🔔" value={stats.notifications} label="Notifications" />
      </div>

      {/* ── My Listings Table ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">My Listings</h2>
          <Link
            to="/my-listings"
            className="dash-section-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "#222",
              color: "#fff",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <span aria-hidden="true">📋</span>
            Manage Listings
          </Link>
        </div>
        {enrichedListings.length > 0 ? (
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
                {enrichedListings.map((listing) => {
                  const property = listing.propertyDetails;
                  return (
                    <tr key={listing._id}>
                      <td>
                        <div className="dash-table-title">
                          {property?.title || listing.propertyId}
                        </div>
                        <div className="dash-table-sub">
                          {formatLocation(property?.location, property?.city)}
                          {listing.featured && (
                            <>
                              {" "}
                              &middot;{" "}
                              <StatusBadge status="featured" prefix="dash-badge" />
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={listing.status} prefix="dash-badge" />
                      </td>
                      <td>{(listing.views || 0).toLocaleString()}</td>
                      <td>{listing.inquiries || 0}</td>
                      <td>{new Date(listing.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="dash-actions-cell">
                          <button
                            className="dash-action-btn dash-action-btn--view"
                            onClick={() => navigate(`/listing/${listing._id}`)}
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            className="dash-action-btn dash-action-btn--edit"
                            onClick={() => navigate(`/listing/${listing._id}/edit`)}
                            title="Edit Listing"
                          >
                            ✏️
                          </button>
                          <button
                            className="dash-action-btn dash-action-btn--delete"
                            onClick={() => handleDeleteClick(listing)}
                            title="Delete Listing"
                            disabled={isDeleting}
                          >
                            🗑️
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
              You haven't listed any properties yet.
            </p>
            <Link to="/listing/new" className="dash-empty-link">
              Create Your First Listing
            </Link>
          </div>
        )}
      </div>

      {/* ── Recent Matches ── */}
      <RecentMatches
        emptyMessage="No matches yet. As soon as a buyer or dealer posts a requirement that fits one of your listings (same city, same area, price within ±10% of their budget), it'll show up here."
      />

      {/* ── Recent Deals ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Deals</h2>
        </div>
        {deals.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const property = properties?.find((p) => p._id === deal.propertyId);
                  return (
                    <tr key={deal.id}>
                      <td>
                        <div className="dash-table-title">
                          {property?.title || deal.propertyId}
                        </div>
                        <div className="dash-table-sub">
                          {formatCity(property?.location, property?.city)}
                        </div>
                      </td>
                      <td>{deal.type.replace(/-/g, " \u2192 ")}</td>
                      <td>PKR {formatPrice(deal.agreedPrice)}</td>
                      <td>
                        <StatusBadge status={deal.status} prefix="dash-badge" />
                      </td>
                      <td>{deal.startedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">🤝</div>
            <p className="dash-empty-text">No deals yet.</p>
          </div>
        )}
      </div>

      {/* ── Reviews on My Properties ── */}
      <OwnerReviewsSection userId={userId} />

      {/* ── Recent Notifications ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Recent Notifications</h2>
          <Link to="/account/notifications" className="dash-section-link">
            View all
          </Link>
        </div>
        {notifications.length > 0 ? (
          <div className="dash-notif-list">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">🔔</div>
            <p className="dash-empty-text">No notifications.</p>
          </div>
        )}
      </div>
      {/* ── Delete Confirmation Modal ── */}
      {deleteModalOpen && (
        <ConfirmDialog
          isOpen={deleteModalOpen}
          title="Delete Property"
          message={`Are you sure you want to delete "${listingToDelete?.propertyDetails?.title || 'this property'}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setListingToDelete(null);
          }}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

export default SellerDashboard;
