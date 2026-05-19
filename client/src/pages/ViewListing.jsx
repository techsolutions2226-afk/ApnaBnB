/* ViewListing - View a listing with its property details
   Displays full listing information with property data
   Allows navigation to edit page
   ----------------------------------------------- */

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  useListing,
  useUpdateListingStatus,
  useDeleteListing,
} from "../hooks/useListings";
import { FiMapPin, FiHome, FiDollarSign, FiCalendar, FiEye, FiEdit2, FiArrowLeft, FiMaximize, FiImage, FiCheckCircle, FiXCircle, FiTrash2, FiStar } from "react-icons/fi";
import StatusBadge from "../components/common/StatusBadge";
import MapView from "../components/common/MapView";
import "../styles/Requirement.css";
import "../styles/ViewListing.css";

const ViewListing = () => {
  const { id } = useParams();
  const { currentUser, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const { listing, isLoading, error, refetch } = useListing(id);
  const { updateStatus, isLoading: isUpdatingStatus } = useUpdateListingStatus();
  const { remove, isLoading: isDeleting } = useDeleteListing();
  const [property, setProperty] = useState(null);

  useEffect(() => {
    if (listing?.property) {
      setProperty(typeof listing.property === 'object' ? listing.property : null);
    }
  }, [listing]);

  const handleToggleStatus = async (l) => {
    const nextStatus = l.status === "active" ? "sold" : "active";
    try {
      await updateStatus(l._id, nextStatus);
      toast.success(`Listing marked as ${nextStatus}`);
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to update listing status");
    }
  };

  const handleDelete = async (listingId) => {
    const confirmed = window.confirm(
      "Delete this listing? This will also remove the underlying property and cannot be undone."
    );
    if (!confirmed) return;
    try {
      await remove(listingId);
      toast.success("Listing deleted");
      navigate("/my-listings");
    } catch (err) {
      toast.error(err.message || "Failed to delete listing");
    }
  };

  const isOwner = currentUser?.id === listing?.owner?._id || currentUser?.id === listing?.owner;

  /* Loading State */
  if (isLoading) {
    return (
      <div className="req-page">
        <div className="req-loading">
          <div className="req-loading-spinner"></div>
          <h1 className="req-title">Loading Listing...</h1>
          <p className="req-subtitle">Please wait while we fetch the listing details.</p>
        </div>
      </div>
    );
  }

  /* Error State */
  if (error) {
    return (
      <div className="req-page">
        <nav className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">Home</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span className="dash-breadcrumb-current">Listing Details</span>
        </nav>

        <div className="req-error-state">
          <div className="req-error-icon">❌</div>
          <h1 className="req-title">Error Loading Listing</h1>
          <p className="req-subtitle" style={{ maxWidth: '600px', wordBreak: 'break-word' }}>
            {typeof error === 'string' ? error : error?.message || JSON.stringify(error)}
          </p>
          <div className="req-actions">
            <button 
              onClick={() => refetch()} 
              className="req-btn req-btn--primary"
              style={{ marginRight: '10px' }}
            >
              Retry
            </button>
            <Link to={getDashboardPath()} className="req-btn req-btn--secondary">
              <FiArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Not Found State */
  if (!listing) {
    return (
      <div className="req-page">
        <nav className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">Home</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span className="dash-breadcrumb-current">Listing Details</span>
        </nav>

        <div className="req-error-state">
          <div className="req-error-icon">🏠</div>
          <h1 className="req-title">Listing Not Found</h1>
          <p className="req-subtitle">The listing with ID "{id}" was not found.</p>
          <div className="req-actions">
            <Link to={getDashboardPath()} className="req-btn req-btn--primary">
              <FiArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const postedDate = listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  }) : "—";

  return (
    <div className="req-page">
      {/* Breadcrumb */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Listing Details</span>
      </nav>

      {/* Header with Status */}
      <div className="req-view-header">
        <div className="req-view-header-content">
          <h1 className="req-title">{property?.title || "Property Listing"}</h1>
          <p className="req-subtitle">
            {isOwner ? "Your property listing" : "Property listing details"}
          </p>
        </div>
        <div className="req-view-status" style={{ 
          backgroundColor: listing.status === 'active' ? '#e8f5e9' : listing.status === 'sold' ? '#ffebee' : '#fff3e0', 
          color: listing.status === 'active' ? '#2e7d32' : listing.status === 'sold' ? '#c62828' : '#ef6c00',
          border: `2px solid ${listing.status === 'active' ? '#2e7d32' : listing.status === 'sold' ? '#c62828' : '#ef6c00'}`
        }}>
          <StatusBadge status={listing.status} prefix="dash-badge" />
        </div>
      </div>

      {/* Image Gallery Section */}
      {property?.photos && property.photos.length > 0 && (
        <div className="vl-gallery-section">
          <div className="vl-gallery-main">
            <img 
              src={property.photos[0]} 
              alt={property?.title || "Property"}
              className="vl-gallery-main-image"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/800x600?text=No+Image";
              }}
            />
            {property.photos.length > 1 && (
              <div className="vl-gallery-count">
                <FiImage /> {property.photos.length} photos
              </div>
            )}
          </div>
          {property.photos.length > 1 && (
            <div className="vl-gallery-thumbnails">
              {property.photos.slice(1, 5).map((photo, index) => (
                <div key={index} className="vl-gallery-thumb">
                  <img 
                    src={photo} 
                    alt={`Property ${index + 2}`}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/150x150?text=No+Image";
                    }}
                  />
                </div>
              ))}
              {property.photos.length > 5 && (
                <div className="vl-gallery-thumb vl-gallery-more">
                  <span>+{property.photos.length - 5}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Bar */}
      {isOwner && (
        <div className="vl-action-bar">
          <div className="vl-action-bar-left">
            <Link to={`/listing/${id}/edit`} className="vl-action-btn vl-action-btn--primary">
              <FiEdit2 />
              Edit Listing
            </Link>
            <button
              className={`vl-action-btn ${listing.status === 'active' ? 'vl-action-btn--success' : 'vl-action-btn--warning'}`}
              onClick={() => handleToggleStatus(listing)}
              disabled={isUpdatingStatus}
            >
              {listing.status === 'active' ? <FiCheckCircle /> : <FiXCircle />}
              Mark as {listing.status === "active" ? "Sold" : "Active"}
            </button>
          </div>
          <div className="vl-action-bar-right">
            <button
              className="vl-action-btn vl-action-btn--danger"
              onClick={() => handleDelete(listing._id)}
              disabled={isDeleting}
            >
              <FiTrash2 />
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="req-view-grid">
        {/* Left Column: Main Details */}
        <div className="req-view-column">
          {/* Property Overview */}
          <div className="req-view-card">
            <div className="req-view-card-header">
              <FiHome className="req-view-icon" />
              <h3 className="req-view-card-title">Property Overview</h3>
            </div>
            <div className="req-view-card-body">
              <div className="req-view-detail-grid">
                <div className="req-view-detail-item">
                  <label className="req-view-label">Property Type</label>
                  <p className="req-view-value req-view-value--highlight">{property?.propertyType || "—"}</p>
                </div>
                <div className="req-view-detail-item">
                  <label className="req-view-label">Size</label>
                  <p className="req-view-value">{property?.size ? `${property.size} ${property?.sizeUnit || "Marla"}` : "Not specified"}</p>
                </div>
                <div className="req-view-detail-item">
                  <label className="req-view-label">Bedrooms</label>
                  <p className="req-view-value">{property?.bedrooms ? `${property.bedrooms} beds` : "Not specified"}</p>
                </div>
                <div className="req-view-detail-item">
                  <label className="req-view-label">Bathrooms</label>
                  <p className="req-view-value">{property?.bathrooms ? `${property.bathrooms} baths` : "Not specified"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="req-view-card">
            <div className="req-view-card-header">
              <FiMapPin className="req-view-icon" />
              <h3 className="req-view-card-title">Location</h3>
            </div>
            <div className="req-view-card-body">
              <div className="req-view-location" style={{ marginBottom: 16 }}>
                <div className="req-view-location-main">{property?.location?.city || property?.city || "—"}</div>
                <div className="req-view-location-sub">{property?.location?.area || property?.area || "—"}</div>
              </div>
              <MapView coordinates={property?.location?.coordinates} height={320} />
            </div>
          </div>

          {/* Amenities */}
          {property?.amenities && property.amenities.length > 0 && (
            <div className="req-view-card">
              <div className="req-view-card-header">
                <FiStar className="req-view-icon" />
                <h3 className="req-view-card-title">Amenities</h3>
              </div>
              <div className="req-view-card-body">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {property.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        background: "#f7f7f7",
                        border: "1px solid #e0e0e0",
                        borderRadius: 20,
                        fontSize: 13,
                        color: "#222",
                      }}
                    >
                      <FiCheckCircle size={14} style={{ color: "#2e7d32" }} />
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="req-view-card">
            <div className="req-view-card-header">
              <FiDollarSign className="req-view-icon" />
              <h3 className="req-view-card-title">Price</h3>
            </div>
            <div className="req-view-card-body">
              {property?.price ? (
                <div className="req-view-budget">
                  <div className="req-view-budget-amount">
                    PKR {property.price.toLocaleString()}
                  </div>
                </div>
              ) : (
                <p className="req-view-value">—</p>
              )}
            </div>
          </div>

          {/* Description */}
          {property?.description && (
            <div className="req-view-card">
              <div className="req-view-card-header">
                <FiHome className="req-view-icon" />
                <h3 className="req-view-card-title">Description</h3>
              </div>
              <div className="req-view-card-body">
                <p className="req-view-notes">{property.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sidebar */}
        <div className="req-view-column req-view-column--sidebar">
          {/* Listing Stats */}
          <div className="req-view-card req-view-card--sidebar">
            <h3 className="req-view-card-title">Listing Stats</h3>
            <div className="req-view-sidebar-list">
              <div className="req-view-sidebar-item">
                <FiEye className="req-view-sidebar-icon" />
                <div>
                  <label className="req-view-sidebar-label">Views</label>
                  <p className="req-view-sidebar-value">{listing.views || 0}</p>
                </div>
              </div>
              <div className="req-view-sidebar-item">
                <FiCalendar className="req-view-sidebar-icon" />
                <div>
                  <label className="req-view-sidebar-label">Posted On</label>
                  <p className="req-view-sidebar-value">{postedDate}</p>
                </div>
              </div>
              <div className="req-view-sidebar-item">
                <FiMaximize className="req-view-sidebar-icon" />
                <div>
                  <label className="req-view-sidebar-label">Inquiries</label>
                  <p className="req-view-sidebar-value">{listing.inquiries || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isOwner && (
            <div className="req-view-card req-view-card--sidebar req-view-card--actions">
              <h3 className="req-view-card-title">Quick Links</h3>
              <div className="req-view-action-buttons">
                <Link to={getDashboardPath()} className="req-view-action-btn req-view-action-btn--secondary">
                  <FiArrowLeft />
                  Back to Dashboard
                </Link>
                <Link to="/my-listings" className="req-view-action-btn req-view-action-btn--secondary">
                  View All Listings
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewListing;