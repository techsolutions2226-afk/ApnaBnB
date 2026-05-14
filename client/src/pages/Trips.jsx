import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";
import { useProperties } from "../hooks/useProperties";
import { toast } from "react-toastify";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import StarRating from "../components/common/StarRating";
import {
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiX,
  FiChevronRight,
} from "react-icons/fi";
import "../styles/Trips.css";

const TAB_LIST = ["upcoming", "completed", "cancelled"];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TripCard({ trip, propertyMap, onCancel, onReview }) {
  const property = propertyMap[trip.propertyId];
  if (!property) return null;
  const coverImage = property.image || property.photos?.[0];
  const propertyLocation =
    property.location && typeof property.location === "object"
      ? `${property.location.area || ""}${property.location.city ? ", " + property.location.city : ""}`
      : property.location || "";

  const guestCount =
    trip.guests.adults + trip.guests.children + trip.guests.infants;

  return (
    <div className={`tr-card tr-card--${trip.status}`}>
      <Link to={`/property/${trip.propertyId}`} className="tr-card-image">
        <img src={coverImage} alt={property.title} />
        {trip.status === "cancelled" && (
          <span className="tr-card-badge tr-card-badge--cancelled">
            Cancelled
          </span>
        )}
        {trip.status === "upcoming" && (
          <span className="tr-card-badge tr-card-badge--upcoming">
            Upcoming
          </span>
        )}
      </Link>

      <div className="tr-card-body">
        <h3 className="tr-card-title">
          <Link to={`/property/${trip.propertyId}`}>{property.title}</Link>
        </h3>

        <div className="tr-card-details">
          <p className="tr-card-detail">
            <FiCalendar size={14} />
            {formatDate(trip.checkIn)} – {formatDate(trip.checkOut)}
          </p>
          <p className="tr-card-detail">
            <FiMapPin size={14} />
            {propertyLocation}
          </p>
          <p className="tr-card-detail">
            <FiUsers size={14} />
            {guestCount} guest{guestCount !== 1 ? "s" : ""} · {trip.nights}{" "}
            night{trip.nights !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="tr-card-footer">
          <div className="tr-card-price">
            <span className="tr-card-total">${trip.totalPrice}</span>
            <span className="tr-card-total-label">total</span>
          </div>

          <div className="tr-card-actions">
            {trip.status === "upcoming" && (
              <button
                className="tr-cancel-btn"
                onClick={() => onCancel(trip.id)}
              >
                Cancel reservation
              </button>
            )}
            {trip.status === "completed" && (
              <button className="tr-review-btn" onClick={() => onReview(trip)}>
                Write a review <FiChevronRight size={14} />
              </button>
            )}
            {trip.status === "cancelled" && trip.refundAmount && (
              <p className="tr-refund">Refund: ${trip.refundAmount}</p>
            )}
          </div>
        </div>

        <p className="tr-confirmation">
          Confirmation code: <strong>{trip.confirmationCode}</strong>
        </p>
      </div>
    </div>
  );
}

export default function Trips() {
  const { currentUser } = useAuth();
  const { trips, cancelTrip, getUpcoming, getCompleted, getCancelled } =
    useBooking();
  const { properties = [] } = useProperties();
  const navigate = useNavigate();

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((p) => {
      if (p._id) map[p._id] = p;
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [properties]);

  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const upcoming = getUpcoming(currentUser.id);
  const completed = getCompleted(currentUser.id);
  const cancelled = getCancelled(currentUser.id);

  const tabTrips = {
    upcoming,
    completed,
    cancelled,
  };

  const currentTrips = tabTrips[activeTab] || [];

   const handleCancel = async (tripId) => {
     try {
       await cancelTrip(tripId);
       toast.success("Reservation cancelled. Refund will be processed.");
     } catch (err) {
       toast.error(err?.message || "Failed to cancel reservation");
     } finally {
       setCancelConfirm(null);
     }
   };

  const handleReviewSubmit = () => {
    if (reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    /* In a real app this would save to backend */
    toast.success("Review submitted! Thank you.");
    setReviewModal(null);
    setReviewRating(0);
    setReviewText("");
  };

  return (
    <div className="tr-page">
      <div className="tr-container">
        <h1 className="tr-title">Trips</h1>

        {/* Tabs */}
        <div className="tr-tabs">
          {TAB_LIST.map((tab) => (
            <button
              key={tab}
              className={`tr-tab ${activeTab === tab ? "tr-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="tr-tab-count">
                ({tabTrips[tab]?.length || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Trip List */}
        {currentTrips.length === 0 ? (
          <EmptyState
            icon={<FiCalendar size={48} />}
            title={
              activeTab === "upcoming"
                ? "No upcoming trips"
                : activeTab === "completed"
                  ? "No completed trips yet"
                  : "No cancelled trips"
            }
            description={
              activeTab === "upcoming"
                ? "Time to dust off your bags and start planning your next adventure."
                : activeTab === "completed"
                  ? "Once you complete a trip, it will show up here."
                  : "Cancelled trips will appear here."
            }
            actionLabel={activeTab === "upcoming" ? "Start searching" : null}
            onAction={
              activeTab === "upcoming" ? () => navigate("/search") : null
            }
          />
        ) : (
          <div className="tr-list">
            {currentTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                propertyMap={propertyMap}
                onCancel={(id) => setCancelConfirm(id)}
                onReview={(t) => setReviewModal(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel Confirm Modal */}
      {cancelConfirm && (
        <Modal
          onClose={() => setCancelConfirm(null)}
          title="Cancel reservation"
          size="small"
        >
          <div className="tr-modal-body">
            <p>
              Are you sure you want to cancel this reservation? You will receive
              a refund per the cancellation policy.
            </p>
            <div className="tr-modal-actions">
              <button
                className="tr-modal-cancel"
                onClick={() => setCancelConfirm(null)}
              >
                Keep reservation
              </button>
              <button
                className="tr-modal-confirm"
                onClick={() => handleCancel(cancelConfirm)}
              >
                Cancel reservation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <Modal
          onClose={() => {
            setReviewModal(null);
            setReviewRating(0);
            setReviewText("");
          }}
          title="Write a review"
        >
          <div className="tr-review-modal">
            <p className="tr-review-property">
              {propertyMap[reviewModal.propertyId]?.title || "Property"}
            </p>
            <p className="tr-review-dates">
              {formatDate(reviewModal.checkIn)} –{" "}
              {formatDate(reviewModal.checkOut)}
            </p>

            <div className="tr-review-rating">
              <p className="tr-review-rating-label">Your rating</p>
              <StarRating
                value={reviewRating}
                onChange={setReviewRating}
                size={28}
              />
            </div>

            <div className="tr-review-text-wrap">
              <label className="tr-review-text-label">
                Tell others about your experience
              </label>
              <textarea
                className="tr-review-textarea"
                rows={5}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What was your stay like? What did you enjoy most?"
                maxLength={500}
              />
              <p className="tr-review-char-count">
                {500 - reviewText.length} characters remaining
              </p>
            </div>

            <button
              className="tr-review-submit"
              onClick={handleReviewSubmit}
              disabled={reviewRating === 0}
            >
              Submit review
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
