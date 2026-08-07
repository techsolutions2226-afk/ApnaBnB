import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useUserListings, useDeleteListing } from "../hooks/useListings";
import { useDealerBuyerMatches, useDealerDealerMatches } from "../hooks/useMatches";
import RecentMatches from "../components/dashboard/RecentMatches";
import { useProperties } from "../hooks/useProperties";
import { formatPrice, formatLocation, formatCity } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import NotificationItem from "../components/common/NotificationItem";
import ConfirmDialog from "../components/common/ConfirmDialog";
import OwnerReviewsSection from "../components/dashboard/OwnerReviewsSection";
import "../styles/Dashboard.css";

const DealerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = currentUser?.id;

  // Fetch dealer's listings
  const { listings, isLoading: listingsLoading, error: listingsError, refetch: refetchListings } = useUserListings(userId);

  // Delete listing hook
  const { remove: deleteListing, isLoading: isDeleting } = useDeleteListing();

  // State for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  
  // Fetch matches for dealer (dealer-buyer and dealer-dealer)
  const { matches: buyerMatches, isLoading: buyerLoading, error: buyerError } = useDealerBuyerMatches();
  const { matches: dealerMatches, isLoading: dealerLoading, error: dealerError } = useDealerDealerMatches();
  const matches = [...(buyerMatches || []), ...(dealerMatches || [])];
  
  // Fetch all properties for mapping
  const { properties, isLoading: propsLoading } = useProperties({}, true);

  // Calculate stats
  const stats = {
    activeListings: listings?.filter(l => l.status === 'active').length || 0,
    totalViews: listings?.reduce((sum, l) => sum + (l.views || 0), 0) || 0,
    totalInquiries: listings?.reduce((sum, l) => sum + (l.inquiries || 0), 0) || 0,
    activeRequirements: 0, // TODO: Get from requirements for clients
    matches: matches?.length || 0,
    messages: 0, // TODO: Get from messages service
    notifications: 0, // TODO: Get from notifications
  };

  // Enrich listings with property details
  const enrichedListings = listings?.map(listing => {
    const propertyObj = (listing.property && typeof listing.property === 'object') 
      ? listing.property 
      : properties?.find(p => p._id === (listing.property || listing.propertyId));
      
    return {
      ...listing,
      propertyDetails: propertyObj
    };
  }) || [];

  // Enrich matches with property details
  const enrichedMatches = matches?.map(m => {
    const propertyObj = (m.property && typeof m.property === 'object') 
      ? m.property 
      : properties?.find(p => p._id === (m.property || m.propertyId));
      
    return {
      ...m,
      propertyDetails: propertyObj
    };
  }) || [];

  // Handle delete listing
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

  // Placeholder data
  const requirements = [];
  const deals = [];
  const activeSub = null;
  const plan = null;
  const notifications = [];

  if (listingsLoading || buyerLoading || dealerLoading || propsLoading) {
    return (
      <div className="dash-page">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 20px' }} />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (listingsError || buyerError || dealerError) {
    return (
      <div className="dash-page">
        <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
          <p>Error loading dashboard: {listingsError || buyerError || dealerError}</p>
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

      {/* ── Subscription Card ── */}
      {plan ? (
        <div className="dash-sub-card">
          <div className="dash-sub-info">
            <div className="dash-sub-plan">{plan.name} Plan</div>
            <div className="dash-sub-detail">
              {activeSub.billing === "yearly" ? "Annual" : "Monthly"} billing
              &middot; Renews {activeSub.endDate}
            </div>
          </div>
          <Link to="/plans" className="dash-sub-action">
            Manage Plan
          </Link>
        </div>
      ) : (
        <div className="dash-sub-none">
          <span className="dash-sub-none-text">
            No active subscription — upgrade to unlock premium features
          </span>
          <Link to="/plans" className="dash-sub-none-link">
            View Plans
          </Link>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="dash-stats">
        <StatCard icon="🏠" value={stats.activeListings} label="Active Listings" />
        <StatCard icon="👁️" value={stats.totalViews.toLocaleString()} label="Total Views" />
        <StatCard icon="📩" value={stats.totalInquiries} label="Inquiries" />
        <StatCard icon="📝" value={stats.activeRequirements} label="Active Requirements" />
        <StatCard icon="🔗" value={stats.matches} label="Matches" />
        <StatCard icon="💬" value={stats.messages} label="Unread Messages" />
        <StatCard icon="🤝" value={deals.length} label="Total Deals" />
        <StatCard icon="🔔" value={stats.notifications} label="Notifications" />
      </div>

      {/* ── My Listings Table ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">My Listings</h2>
          <Link to="/my-listings" className="dash-section-link">
            View all
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
              No listings yet. Start by adding a client's property.
            </p>
            <Link to="/listing/new" className="dash-empty-link">
              Create Listing
            </Link>
          </div>
        )}
      </div>

      {/* ── Client Requirements ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">My Client Requirements</h2>
          <Link to="/requirements" className="dash-section-link">
            Browse board
          </Link>
        </div>
        {requirements.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>City</th>
                  <th>Budget</th>
                  <th>Type</th>
                  <th>Urgency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div className="dash-table-title">{req.title}</div>
                      <div className="dash-table-sub">
                        {req.area} &middot; {req.size}
                      </div>
                    </td>
                    <td>{req.city}</td>
                    <td>
                      {formatPrice(req.budgetMin)} – {formatPrice(req.budgetMax)}
                    </td>
                    <td>{req.propertyType}</td>
                    <td>{req.urgency}</td>
                    <td>
                      <StatusBadge status={req.status} prefix="dash-badge" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">📝</div>
            <p className="dash-empty-text">No client requirements posted.</p>
          </div>
        )}
      </div>

      {/* ── Matches ── */}
      <RecentMatches
        emptyMessage="No matches yet. List a property or post a requirement and we'll surface leads as soon as the city, area, and price line up."
      />

      {/* ── Deals ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">My Deals</h2>
        </div>
        {deals.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Agreed Price</th>
                  <th>Commission</th>
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
                        {deal.commission > 0
                          ? `PKR ${formatPrice(deal.commission)}`
                          : "\u2014"}
                      </td>
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
            <p className="dash-empty-text">
              No deals yet. Start connecting buyers with sellers.
            </p>
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
      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Delete Listing"
        message={`Are you sure you want to delete "${listingToDelete?.propertyDetails?.title || 'this listing'}"? This action cannot be undone.`}
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
