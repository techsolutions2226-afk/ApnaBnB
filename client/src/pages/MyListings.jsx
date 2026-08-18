/* ─── MyListings — View and manage all user listings ───
   Sellers and Dealers see their property listings in card layout.
   Features: filter by status (all/active/sold/featured), status toggle,
   delete with confirmation modal, link to edit.
   ─────────────────────────────────────────────── */

import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { useUserListings, useUpdateListingStatus, useDeleteListing } from "../hooks/useListings";
import { useProperties } from "../hooks/useProperties";
import { formatPrice } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatusBadge from "../components/common/StatusBadge";
import FilterTabs from "../components/common/FilterTabs";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { 
  FiEdit2, 
  FiTrash2, 
  FiCheckCircle, 
  FiXCircle, 
  FiEye, 
  FiMapPin, 
  FiMaximize,
  FiPlus,
  FiImage,
  FiCalendar
} from "react-icons/fi";
import "../styles/Dashboard.css";
import "../styles/MyListings.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "sold", label: "Sold" },
  { key: "featured", label: "Featured" },
];

const MyListings = () => {
  const { currentUser, getDashboardPath } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  // Fetch user's listings
  const { listings, isLoading: listingsLoading, error: listingsError, refetch: refetchListings } = useUserListings(currentUser?.id);
  
  // Fetch all properties for mapping
  const { properties, isLoading: propsLoading } = useProperties({}, true);
  
  // Hooks for actions
  const { updateStatus, isLoading: statusLoading } = useUpdateListingStatus();
  const { remove: deleteListing, isLoading: deleteLoading } = useDeleteListing();

  /* ── Load user's listings joined with property data ── */
  const allListings = useMemo(() => {
    if (!listings) return [];
    return listings.map((listing) => {
      // Backend populates `property` as an object.
      const propertyObj = (listing.property && typeof listing.property === 'object') 
        ? listing.property 
        : (properties || []).find(p => p._id === (listing.property || listing.propertyId));
        
      return {
        ...listing,
        property: propertyObj,
      };
    });
  }, [listings, properties]);

  /* ── Apply filter ── */
  const filteredListings = useMemo(() => {
    if (activeFilter === "all") return allListings;
    if (activeFilter === "featured")
      return allListings.filter((l) => l.featured && l.status === "active");
    return allListings.filter((l) => l.status === activeFilter);
  }, [allListings, activeFilter]);

  /* ── Count per filter ── */
  const counts = useMemo(() => ({
    all: allListings.length,
    active: allListings.filter((l) => l.status === "active").length,
    sold: allListings.filter((l) => l.status === "sold").length,
    featured: allListings.filter((l) => l.featured && l.status === "active")
      .length,
  }), [allListings]);

  /* ── Delete handler ── */
  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      const listingToDelete = allListings.find(l => l._id === deletingId);
      if (listingToDelete) {
        await deleteListing(listingToDelete._id);
      }
      toast.success("Property and listing deleted successfully");
      setDeletingId(null);
      refetchListings();
    } catch (err) {
      toast.error(err.message || "Failed to delete listing");
    }
  }, [deletingId, allListings, deleteListing, refetchListings]);

  /* ── Status toggle handler ── */
  const handleToggleStatus = useCallback(
    async (listing) => {
      const newStatus = listing.status === "active" ? "sold" : "active";
       try {
         await updateStatus(listing._id, newStatus);
         toast.success(
           `Listing marked as ${newStatus}`
         );
         refetchListings();
       } catch (err) {
         toast.error(err.message || "Failed to update listing");
       }
     },
     [updateStatus, refetchListings]
   );

  /* ── The listing being deleted (for modal) ── */
  const deletingListing = deletingId
    ? allListings.find((l) => l._id === deletingId)
    : null;

  if (listingsLoading || propsLoading) {
    return (
      <div className="ml-page">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 20px' }} />
          <p>Loading your listings...</p>
        </div>
      </div>
    );
  }

  if (listingsError) {
    return (
      <div className="ml-page">
        <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
          <p>Error loading listings: {listingsError}</p>
          <button onClick={refetchListings} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#134e2c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
          { label: "My Listings" },
        ]}
      />

      <div className="ml-header">
        <div className="ml-header-content">
          <h1 className="ml-title">My Listings</h1>
          <p className="ml-subtitle">
            Manage your property listings — <span className="ml-count">{allListings.length}</span> total
          </p>
        </div>        
        <Link to="/listing/new" className="ml-new-btn">
          <FiPlus />
          Create New Listing
        </Link>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="ml-filters-container">
        <div className="ml-filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={`ml-filter-btn ${activeFilter === filter.key ? 'ml-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
              <span className="ml-filter-count">{counts[filter.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Beautiful Listing Cards ── */}
      {filteredListings.length > 0 ? (
        <div className="ml-cards">
          {filteredListings.map((listing) => {
            const p = listing.property;
            return (
              <div key={listing._id} className="ml-card">
                {/* Image Section */}
                <div className="ml-card-image-section">
                  <img
                    src={p?.photos?.[0] || p?.images?.[0] || ""}
                    alt={p?.title || "Property"}
                    className="ml-card-img"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f0f0f0'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23b0b0b0' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {p?.photos?.length > 1 && (
                    <div className="ml-card-image-count">
                      <FiImage /> {p.photos.length}
                    </div>
                  )}
                  <div className="ml-card-badges-overlay">
                    <StatusBadge status={listing.status} prefix="ml-badge" />
                    {listing.featured && (
                      <span className="ml-featured-badge">⭐ Featured</span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="ml-card-content">
                  <div className="ml-card-header">
                    <h3 className="ml-card-title">
                      {p?.title || "Property Listing"}
                    </h3>
                    <p className="ml-card-location">
                      <FiMapPin /> {p ? `${p.area || p.location?.area}, ${p.city || p.location?.city}` : "—"}
                    </p>
                  </div>

                  {/* Property Details */}
                  <div className="ml-card-details">
                    {p?.bedrooms ? (
                      <span className="ml-detail-item">
                        🛏 {p.bedrooms} Bed{p.bedrooms === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {p?.bathrooms ? (
                      <span className="ml-detail-item">
                        🛁 {p.bathrooms} Bath{p.bathrooms === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {p?.size ? (
                      <span className="ml-detail-item">
                        📐 {p.size} {p.sizeUnit || "Marla"}
                      </span>
                    ) : null}
                  </div>

                  {/* Stats Row */}
                  <div className="ml-card-stats">
                    <div className="ml-stat">
                      <FiEye className="ml-stat-icon" />
                      <span>{(listing.views || 0).toLocaleString()}</span>
                    </div>
                    <div className="ml-stat">
                      <FiMaximize className="ml-stat-icon" />
                      <span>{listing.inquiries || 0}</span>
                    </div>
                    <div className="ml-stat">
                      <FiCalendar className="ml-stat-icon" />
                      <span>{new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="ml-card-price">
                    {p ? formatPrice(p.price, { prefix: true }) : "Price on request"}
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-card-actions">
                    <Link
                      to={`/listing/${listing._id}`}
                      className="ml-btn ml-btn--view"
                    >
                      <FiEye /> View
                    </Link>
                    <Link
                      to={`/listing/${listing._id}/edit`}
                      className="ml-btn ml-btn--edit"
                    >
                      <FiEdit2 /> Edit
                    </Link>
                    <button
                      className={`ml-btn ${listing.status === 'active' ? 'ml-btn--success' : 'ml-btn--warning'}`}
                      onClick={() => handleToggleStatus(listing)}
                      disabled={statusLoading}
                    >
                      {listing.status === "active" ? <FiCheckCircle /> : <FiXCircle />}
                      {listing.status === "active" ? "Mark Sold" : "Activate"}
                    </button>
                    <button
                      className="ml-btn ml-btn--delete"
                      onClick={() => setDeletingId(listing._id)}
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
          <div className="lst-empty-icon">🏠</div>
          <h2 className="lst-empty-title">
            {activeFilter === "all"
              ? "No listings yet"
              : `No ${activeFilter} listings`}
          </h2>
          <p className="lst-empty-text">
            {activeFilter === "all"
              ? "Create your first property listing to get started."
              : "Try a different filter or create a new listing."}
          </p>
          {activeFilter === "all" && (
            <Link
              to="/listing/new"
              className="lst-btn lst-btn--primary"
            >
              Create Your First Listing
            </Link>
          )}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmDialog
        isOpen={!!deletingListing}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Listing?"
        message={
          <>
            Are you sure you want to delete{" "}
            <strong>
              {deletingListing?.property?.title || deletingListing?.propertyId}
            </strong>
            ? This action cannot be undone.
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

export default MyListings;
