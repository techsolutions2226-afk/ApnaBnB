/* ─── ViewRequirement — View a property requirement details ───
    Buyers and dealers can view their own requirements.
    Shows all requirement details with an edit button.
    Loads requirement data from `:id` param.
    ─────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import useViewRole from "../hooks/useViewRole";
import { toast } from "react-toastify";
import requirementService from "../services/requirementService";
import { FiMapPin, FiHome, FiDollarSign, FiCalendar, FiClock, FiFileText, FiEdit2, FiArrowLeft } from "react-icons/fi";
import "../styles/Requirement.css";

const ViewRequirement = () => {
  const { id } = useParams(); /* requirement ID from URL */
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requirement, setRequirement] = useState(null);

  /* ── Load requirement data on mount ── */
  useEffect(() => {
    const loadRequirement = async () => {
      if (!id) {
        setError("No requirement ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await requirementService.getById(id);
        setRequirement(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load requirement:", err);
        setError(err.message || "Failed to load requirement");
      } finally {
        setIsLoading(false);
      }
    };

    loadRequirement();
  }, [id]);

  /* The hat the user is wearing in the dashboard — NOT their signup role. */
  const { viewRole } = useViewRole();
  const isDealer = viewRole === "dealer";

  const getStatusConfig = (status) => {
    const configs = {
      active: { label: "Active", color: "#2e7d32", bg: "#e8f5e9", icon: "●" },
      fulfilled: { label: "Fulfilled", color: "#ef6c00", bg: "#fff3e0", icon: "✓" },
      closed: { label: "Closed", color: "#c62828", bg: "#ffebee", icon: "✕" }
    };
    return configs[status] || configs.active;
  };

  /* ── Loading State ── */
  if (isLoading) {
    return (
      <div className="req-page">
        <div className="req-loading">
          <div className="req-loading-spinner"></div>
          <h1 className="req-title">Loading Requirement...</h1>
          <p className="req-subtitle">Please wait while we fetch the requirement details.</p>
        </div>
      </div>
    );
  }

  /* ── Error State (not found) ── */
  if (error || !requirement) {
    return (
      <div className="req-page">
        <nav className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">Home</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <Link to={`/dashboard/${viewRole}`} className="dash-breadcrumb-link">Dashboard</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span className="dash-breadcrumb-current">Requirement Details</span>
        </nav>

        <div className="req-error-state">
          <div className="req-error-icon">🔍</div>
          <h1 className="req-title">Requirement Not Found</h1>
          <p className="req-subtitle">{error || "The requirement you're looking for doesn't exist."}</p>
          <div className="req-actions">
            <Link to={`/dashboard/${viewRole}`} className="req-btn req-btn--primary">
              <FiArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(requirement.status);
  const postedDate = requirement.createdAt ? new Date(requirement.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  }) : "—";

  return (
    <div className="req-page">
      {/* ── Breadcrumb ── */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link to={`/dashboard/${viewRole}`} className="dash-breadcrumb-link">Dashboard</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Requirement Details</span>
      </nav>

      {/* ── Header with Status ── */}
      <div className="req-view-header">
        <div className="req-view-header-content">
          <h1 className="req-title">{requirement.title || "Requirement Details"}</h1>
          <p className="req-subtitle">
            {isDealer ? "Client requirement details" : "Your property requirement details"}
          </p>
        </div>
        <div className="req-view-status" style={{ 
          backgroundColor: statusConfig.bg, 
          color: statusConfig.color,
          border: `2px solid ${statusConfig.color}`
        }}>
          <span className="req-view-status-icon">{statusConfig.icon}</span>
          <span className="req-view-status-text">{statusConfig.label}</span>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="req-view-grid">
        {/* ── Left Column: Main Details ── */}
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
                  <p className="req-view-value req-view-value--highlight">{requirement.propertyType || "—"}</p>
                </div>
                <div className="req-view-detail-item">
                  <label className="req-view-label">Preferred Size</label>
                  <p className="req-view-value">{requirement.size || "—"}</p>
                </div>
                <div className="req-view-detail-item">
                  <label className="req-view-label">Bedrooms</label>
                  <p className="req-view-value">{requirement.bedrooms ? `${requirement.bedrooms} beds` : "Not specified"}</p>
                </div>
                <div className="req-view-detail-item">
                  <label className="req-view-label">Bathrooms</label>
                  <p className="req-view-value">{requirement.bathrooms ? `${requirement.bathrooms} baths` : "Not specified"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="req-view-card">
            <div className="req-view-card-header">
              <FiMapPin className="req-view-icon" />
              <h3 className="req-view-card-title">Preferred Location</h3>
            </div>
            <div className="req-view-card-body">
              <div className="req-view-location">
                <div className="req-view-location-main">{requirement.location?.city || "—"}</div>
                <div className="req-view-location-sub">{requirement.location?.area || "—"}</div>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="req-view-card">
            <div className="req-view-card-header">
              <FiDollarSign className="req-view-icon" />
              <h3 className="req-view-card-title">Budget Range</h3>
            </div>
            <div className="req-view-card-body">
              {requirement.budget?.min && requirement.budget?.max ? (
                <div className="req-view-budget">
                  <div className="req-view-budget-amount">
                    PKR {requirement.budget.min.toLocaleString()} - {requirement.budget.max.toLocaleString()}
                  </div>
                  <div className="req-view-budget-bar">
                    <div className="req-view-budget-range" style={{
                      width: "100%",
                      background: "linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)"
                    }}></div>
                  </div>
                </div>
              ) : (
                <p className="req-view-value">—</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {requirement.notes && (
            <div className="req-view-card">
              <div className="req-view-card-header">
                <FiFileText className="req-view-icon" />
                <h3 className="req-view-card-title">Additional Notes</h3>
              </div>
              <div className="req-view-card-body">
                <p className="req-view-notes">{requirement.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Sidebar ── */}
        <div className="req-view-column req-view-column--sidebar">
          {/* Quick Info */}
          <div className="req-view-card req-view-card--sidebar">
            <h3 className="req-view-card-title">Quick Info</h3>
            <div className="req-view-sidebar-list">
              {requirement.urgency && (
                <div className="req-view-sidebar-item">
                  <FiClock className="req-view-sidebar-icon" />
                  <div>
                    <label className="req-view-sidebar-label">Timeline</label>
                    <p className="req-view-sidebar-value">{requirement.urgency}</p>
                  </div>
                </div>
              )}
              <div className="req-view-sidebar-item">
                <FiCalendar className="req-view-sidebar-icon" />
                <div>
                  <label className="req-view-sidebar-label">Posted On</label>
                  <p className="req-view-sidebar-value">{postedDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="req-view-card req-view-card--sidebar req-view-card--actions">
            <h3 className="req-view-card-title">Actions</h3>
            <div className="req-view-action-buttons">
              <Link to={`/requirements/${id}/edit`} className="req-view-action-btn req-view-action-btn--primary">
                <FiEdit2 />
                Edit Requirement
              </Link>
              <Link to={`/dashboard/${viewRole}`} className="req-view-action-btn req-view-action-btn--secondary">
                <FiArrowLeft />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRequirement;