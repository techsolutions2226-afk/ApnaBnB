import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useUserRequirements, useDeleteRequirement } from "../hooks/useRequirements";
import { useSellerBuyerMatches, useDealerBuyerMatches } from "../hooks/useMatches";
import RecentMatches from "../components/dashboard/RecentMatches";
import { useProperties } from "../hooks/useProperties";
import { formatPrice, formatCity } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import NotificationItem from "../components/common/NotificationItem";
import ConfirmDialog from "../components/common/ConfirmDialog";
import "../styles/Dashboard.css";

const BuyerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = currentUser?.id;
  
  // Fetch user's requirements
  const { requirements, isLoading: reqLoading, error: reqError, refetch: refetchReqs } = useUserRequirements(userId);
  
  // Delete requirement hook
  const { remove: deleteRequirement, isLoading: isDeleting } = useDeleteRequirement();
  
  // State for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState(null);
  
  // Fetch matches for this buyer. Their requirements can match either a seller's
  // or a dealer's property, so we pull both types and combine.
  const { matches: sellerMatches, isLoading: sbLoading, error: sbError } = useSellerBuyerMatches();
  const { matches: dealerMatches, isLoading: dbLoading, error: dbError } = useDealerBuyerMatches();
  const matches = [...(sellerMatches || []), ...(dealerMatches || [])].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );
  const matchesLoading = sbLoading || dbLoading;
  const matchesError = sbError || dbError;
  
  // Fetch all properties for mapping
  const { properties, isLoading: propsLoading } = useProperties({}, true);

  // Handle delete requirement
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

  // Calculate stats
  const stats = {
    activeRequirements: requirements?.filter(r => r.status === 'active').length || 0,
    savedProperties: 0, // TODO: Get from wishlists/saved service
    upcomingVisits: 0, // TODO: Get from trips service
    matches: matches?.length || 0,
    messages: 0, // TODO: Get from messages service
    notifications: 0, // TODO: Get from notifications
  };

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

  const deals = []; // TODO: Get from deals service
  const wishlists = []; // TODO: Get from wishlists service
  const trips = []; // TODO: Get from trips service
  const notifications = [];

  if (reqLoading || matchesLoading || propsLoading) {
    return (
      <div className="dash-page">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 20px' }} />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (reqError || matchesError) {
    return (
      <div className="dash-page">
        <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
          <p>Error loading dashboard: {reqError || matchesError}</p>
          <button onClick={() => { refetchReqs(); }} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
        <StatCard icon="📝" value={stats.activeRequirements} label="Active Requirements" />
        <StatCard icon="❤️" value={stats.savedProperties} label="Saved Properties" />
        <StatCard icon="📅" value={stats.upcomingVisits} label="Upcoming Visits" />
        <StatCard icon="🔗" value={stats.matches} label="Matches" />
        <StatCard icon="💬" value={stats.messages} label="Unread Messages" />
        <StatCard icon="🔔" value={stats.notifications} label="Notifications" />
      </div>

        {/* ── My Requirements Table ── */}
       <div className="dash-section">
         <div className="dash-section-header">
           <h2 className="dash-section-title">My Requirements</h2>
           <Link to="/requirements/new" className="dash-section-link">
             Post new
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
                   <th>Status</th>
                   <th>Posted</th>
                   <th>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {requirements.map((req) => (
                   <tr key={req._id}>
                     <td>
                       <div className="dash-table-title">{req.title || `${req.propertyType} in ${req.location?.city}`}</div>
                       <div className="dash-table-sub">
                         {req.location?.area || "N/A"} &middot; {req.bedrooms || "N/A"} beds
                       </div>
                     </td>
                     <td>{req.location?.city}</td>
                     <td>
                       PKR {formatPrice(req.budget?.min || 0)} – {formatPrice(req.budget?.max || 0)}
                     </td>
                     <td>{req.propertyType}</td>
                     <td>
                       <StatusBadge status={req.status || 'active'} prefix="dash-badge" />
                     </td>
                     <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                     <td>
                       <div className="dash-actions-cell">
                         <button 
                           className="dash-action-btn dash-action-btn--view"
                           onClick={() => navigate(`/requirements/${req._id}`)}
                           title="View Details"
                         >
                           👁️
                         </button>
                         <button 
                           className="dash-action-btn dash-action-btn--edit"
                           onClick={() => navigate(`/requirements/${req._id}/edit`)}
                           title="Edit"
                         >
                           ✏️
                         </button>
                         <button 
                           className="dash-action-btn dash-action-btn--delete"
                           onClick={() => handleDeleteClick(req)}
                           title="Delete"
                           disabled={isDeleting}
                         >
                           🗑️
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

      {/* ── Matches ── */}
      <RecentMatches
        emptyMessage="No matches yet. Post a requirement and we'll find properties for you — matches appear when a property is in the same city, same area, and within +/-10% of your budget."
      />

      {/* ── Upcoming Visits ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Property Visits</h2>
          <Link to="/trips" className="dash-section-link">
            View all
          </Link>
        </div>
        {trips.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Code</th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 5).map((trip) => {
                  const property = properties?.find((p) => p._id === trip.propertyId);
                  return (
                    <tr key={trip.id}>
                      <td>
                        <div className="dash-table-title">
                          {property?.title || trip.propertyId}
                        </div>
                        <div className="dash-table-sub">
                          {formatCity(property?.location, property?.city)}
                        </div>
                      </td>
                      <td>{trip.visitDate}</td>
                      <td>{trip.visitTime}</td>
                      <td>
                        <StatusBadge status={trip.status} prefix="dash-badge" />
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {trip.confirmationCode}
                      </td>
                    </tr>
                  );
                })}
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

      {/* ── Deals ── */}
      {deals.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">My Deals</h2>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Property</th>
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
        </div>
      )}

      {/* ── Wishlists ── */}
      {wishlists.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">My Wishlists</h2>
            <Link to="/wishlists" className="dash-section-link">
              View all
            </Link>
          </div>
          <div className="dash-actions">
            {wishlists.map((wl) => (
              <Link to="/wishlists" key={wl.id} className="dash-action">
                <span className="dash-action-icon">❤️</span>
                <span>
                  {wl.name}{" "}
                  <span style={{ color: "#717171", fontWeight: 400 }}>
                    ({wl.propertyIds.length})
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
        title="Delete Requirement"
        message={`Are you sure you want to delete "${requirementToDelete?.title || 'this requirement'}"? This action cannot be undone.`}
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
