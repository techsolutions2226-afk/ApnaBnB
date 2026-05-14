import { AiFillStar } from "react-icons/ai";
import { FiCheck } from "react-icons/fi";
import { formatDate } from "../navbar/MonthGrid";

/* ─── Reservation confirmation modal (frontend-only) ─── */
const ReservationConfirmModal = ({ property, checkIn, checkOut, nightsCount, guestSummary, pricePerNight, totalPrice, serviceFee, grandTotal, onClose }) => {
  return (
    <div className="rv-modal-overlay" onClick={onClose}>
      <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
        {/* Success icon */}
        <div className="rv-modal-icon">
          <FiCheck size={36} />
        </div>

        <h2 className="rv-modal-title">Reservation confirmed!</h2>
        <p className="rv-modal-subtitle">
          Your stay at <strong>{property.title}</strong> has been booked.
        </p>

        {/* Details card */}
        <div className="rv-modal-details">
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Property</span>
            <span className="rv-modal-value">{property.title}</span>
          </div>
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Location</span>
            <span className="rv-modal-value">{property.location}</span>
          </div>
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Check-in</span>
            <span className="rv-modal-value">{formatDate(checkIn)}</span>
          </div>
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Checkout</span>
            <span className="rv-modal-value">{formatDate(checkOut)}</span>
          </div>
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Duration</span>
            <span className="rv-modal-value">{nightsCount} night{nightsCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Guests</span>
            <span className="rv-modal-value">{guestSummary}</span>
          </div>

          <div className="rv-modal-divider" />

          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">${pricePerNight} x {nightsCount} night{nightsCount !== 1 ? "s" : ""}</span>
            <span className="rv-modal-value">${totalPrice}</span>
          </div>
          <div className="rv-modal-detail-row">
            <span className="rv-modal-label">Service fee</span>
            <span className="rv-modal-value">${serviceFee}</span>
          </div>
          <div className="rv-modal-divider" />
          <div className="rv-modal-detail-row rv-modal-total">
            <span>Total</span>
            <span>${grandTotal}</span>
          </div>
        </div>

        {/* Rating */}
        <div className="rv-modal-rating">
          <AiFillStar size={14} />
          <span>{property.rating} ({property.reviews} reviews)</span>
        </div>

        <button className="rv-modal-btn" onClick={onClose}>
          Done
        </button>

        <p className="rv-modal-note">
          This is a frontend demo. No actual booking has been made.
        </p>
      </div>
    </div>
  );
};

export default ReservationConfirmModal;
