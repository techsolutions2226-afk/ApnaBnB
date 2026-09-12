import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";
import RefreshButton from "../components/common/RefreshButton";
import useRefresh from "../hooks/useRefresh";
import { useProperties } from "../hooks/useProperties";
import { toast } from "react-toastify";
import reviewService from "../services/reviewService";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import StarRating from "../components/common/StarRating";
import {
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiX,
  FiChevronRight,
  FiCheckCircle,
} from "react-icons/fi";
import "../styles/Trips.css";

import { useTranslation } from "react-i18next";
const TAB_LIST = ["upcoming", "completed", "cancelled"];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TripCard({ trip, propertyMap, onCancel, onReview, reviewed }) {
  const { t } = useTranslation("visit");
  const property = propertyMap[trip.propertyId] || trip.property;
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
            {t("trips.cancelled")}
          </span>
        )}
        {trip.status === "upcoming" && (
          <span className="tr-card-badge tr-card-badge--upcoming">
            {t("trips.upcoming")}
          </span>
        )}
        {trip.status === "checked_in" && (
          <span className="tr-card-badge tr-card-badge--checked_in">
            {t("trips.checkedIn")}
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
          {trip.status === "upcoming" && (
            <p className="tr-card-detail">
              <FiUsers size={14} />
              {guestCount} guest{guestCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {(trip.status === "upcoming" || trip.status === "checked_in") && (
          <div className="tr-visit-state">
            {trip.status === "checked_in" ? (
              <span className="tr-visit-state-chip tr-visit-state-chip--done">
                ✅ Visitor checked in — awaiting completion
              </span>
            ) : trip.visitorConfirmed && trip.ownerConfirmed ? (
              <span className="tr-visit-state-chip tr-visit-state-chip--done">
                ✅ Confirmed — contact revealed
              </span>
            ) : (
              <span className="tr-visit-state-chip">
                {trip.scheduleState === "reschedule"
                  ? "🔄 New schedule proposed — awaiting confirmation"
                  : "⏳ Awaiting mutual confirmation"}
              </span>
            )}
          </div>
        )}

        <div className="tr-card-footer">
          <div className="tr-card-price">
            <span className="tr-card-total">${trip.totalPrice}</span>
            <span className="tr-card-total-label">total</span>
          </div>

          <div className="tr-card-actions">
            {(trip.status === "upcoming" || trip.status === "checked_in") && (
              <>
                <Link to={`/visits/${trip.id}`} className="tr-detail-btn">
                  <FiChevronRight size={16} />
                  {t("trips.viewVisit")}
                </Link>
                {trip.status === "upcoming" && (
                  <button
                    className="tr-cancel-btn"
                    onClick={() => onCancel(trip.id)}
                  >
                    {t("trips.cancelVisit")}
                  </button>
                )}
              </>
            )}
            {trip.status === "completed" &&
              (reviewed ? (
                <span className="tr-review-done">
                  {t("trips.reviewSubmitted")} <FiCheckCircle size={14} />
                </span>
              ) : (
                <button className="tr-review-btn" onClick={() => onReview(trip)}>
                  {t("trips.writeReview")} <FiChevronRight size={14} />
                </button>
              ))}
            {trip.status === "cancelled" && trip.refundAmount && (
              <p className="tr-refund">Refund: ${trip.refundAmount}</p>
            )}
          </div>
        </div>

        <p className="tr-confirmation">
          {t("trips.confirmationCode")} <strong>{trip.confirmationCode}</strong>
        </p>
        {trip.status === "upcoming" && (
          <p className="tr-visit-fee-note">
            ₹200 refundable visit fee — returned if the owner no-shows or the
            listing is fake.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Trips() {
  const { t } = useTranslation("visit");
  const { currentUser } = useAuth();
  const {
    cancelTrip,
    getUpcoming,
    getCompleted,
    getCancelled,
    getVisitCounts,
    refresh: refreshTrips,
  } = useBooking();
  const { properties = [], refetch: refetchProperties } = useProperties();

  // Refresh just this tab — no browser reload.
  const { refresh, refreshing } = useRefresh(refreshTrips, refetchProperties);
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
  const [reviewedProps, setReviewedProps] = useState(() => new Set());
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  /* Which properties the user has already reviewed — those visits show a
     "Review submitted" note instead of the button. */
  const loadReviewed = useCallback(async () => {
    try {
      const data = await reviewService.getByUser(currentUser?.id);
      const ids = (data?.reviews || [])
        .filter((r) => r.targetType === "property")
        .map((r) => r.target);
      setReviewedProps(new Set(ids));
    } catch {
      setReviewedProps(new Set());
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadReviewed();
  }, [loadReviewed]);

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  /* getUpcoming() (no user arg) — the trips list already only contains the
     current user's visits: ones they proposed + ones on their own listings. */
  const upcoming = getUpcoming();
  const completed = getCompleted();
  const cancelled = getCancelled();
  const { successful, unsuccessful } = getVisitCounts();

  const tabTrips = {
    upcoming,
    completed,
    cancelled,
  };

  const currentTrips = tabTrips[activeTab] || [];

   const handleCancel = async (tripId) => {
     try {
       await cancelTrip(tripId);
       toast.success(t("trips.cancelledToast"));
     } catch (err) {
       toast.error(err?.message || "Failed to cancel visit");
     } finally {
       setCancelConfirm(null);
     }
   };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0) {
      toast.error(t("trips.selectRating"));
      return;
    }
    if (reviewText.trim().length < 10) {
      toast.error(t("trips.minChars"));
      return;
    }
    const trip = reviewModal;
    if (!trip) return;
    setReviewSubmitting(true);
    try {
      await reviewService.create({
        target: trip.propertyId,
        targetType: "property",
        rating: reviewRating,
        comment: reviewText.trim(),
      });
      setReviewedProps((prev) => new Set(prev).add(trip.propertyId));
      toast.success(t("trips.reviewDone"));
      setReviewModal(null);
      setReviewRating(0);
      setReviewText("");
    } catch (err) {
      toast.error(err?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="tr-page">
      <div className="tr-container">
        <div className="tr-header-row">
          <h1 className="tr-title">{t("trips.title")}</h1>
          <RefreshButton onRefresh={refresh} refreshing={refreshing} />
        </div>

        {/* Outcome summary — successful vs unsuccessful visits */}
        <div className="tr-summary">
          <div className="tr-summary-item tr-summary-item--success">
            <span className="tr-summary-value">{successful}</span>
            <span className="tr-summary-label">{t("trips.successful")}</span>
          </div>
          <div className="tr-summary-item tr-summary-item--unsuccess">
            <span className="tr-summary-value">{unsuccessful}</span>
            <span className="tr-summary-label">{t("trips.unsuccessful")}</span>
          </div>
          <div className="tr-summary-hint">
            Successful = checked in and completed. Unsuccessful = cancelled or
            no-show after the agreed date.
          </div>
        </div>

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
                ? t("trips.emptyUpcoming")
                : activeTab === "completed"
                  ? t("trips.emptyCompleted")
                  : t("trips.emptyCancelled")
            }
            description={
              activeTab === "upcoming"
                ? t("trips.emptyUpcomingDesc")
                : activeTab === "completed"
                  ? t("trips.emptyCompletedDesc")
                  : t("trips.emptyCancelledDesc")
            }
            actionLabel={activeTab === "upcoming" ? t("trips.startSearching") : null}
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
                reviewed={reviewedProps.has(trip.propertyId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel Confirm Modal */}
      {cancelConfirm && (
        <Modal
          onClose={() => setCancelConfirm(null)}
          title={t("trips.cancelVisit")}
          size="small"
        >
          <div className="tr-modal-body">
            <p>
              Are you sure you want to cancel this visit? If the property owner
              was a no-show or the listing was fake, your refundable visit fee
              is returned. Otherwise, cancellation is per the visit policy.
            </p>
            <div className="tr-modal-actions">
              <button
                className="tr-modal-cancel"
                onClick={() => setCancelConfirm(null)}
              >
                {t("trips.keepVisit")}
              </button>
              <button
                className="tr-modal-confirm"
                onClick={() => handleCancel(cancelConfirm)}
              >
                {t("trips.cancelVisit")}
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
          title={t("trips.writeReview")}
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
              <p className="tr-review-rating-label">{t("trips.yourRating")}</p>
              <StarRating
                value={reviewRating}
                onChange={setReviewRating}
                size={28}
              />
            </div>

            <div className="tr-review-text-wrap">
              <label className="tr-review-text-label">
                {t("trips.reviewLabel")}
              </label>
              <textarea
                className="tr-review-textarea"
                rows={5}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={t("trips.reviewPlaceholder")}
                maxLength={500}
              />
              <p className="tr-review-char-count">
                {t("trips.charsRemaining", { count: 500 - reviewText.length })}
              </p>
            </div>

            <button
              className="tr-review-submit"
              onClick={handleReviewSubmit}
              disabled={reviewRating === 0 || reviewSubmitting}
            >
              {reviewSubmitting ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
