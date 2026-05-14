import { useState, useRef, useEffect } from "react";
import { AiFillStar } from "react-icons/ai";
import { FiChevronDown } from "react-icons/fi";
import { formatDate } from "../navbar/MonthGrid";
import ReservationCalendar from "./ReservationCalendar";
import ReservationGuests from "./ReservationGuests";
import ReservationConfirmModal from "./ReservationConfirmModal";

/* ─── Calculate nights between two dates ─── */
const calcNights = (start, end) => {
  if (!start || !end) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

/* ─── Reservation Card ─── */
const ReservationCard = ({ property }) => {
  const { price, nights: defaultNights, rating, reviews, guests: maxGuests } = property;

  /* ── State ── */
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState("checkin"); // "checkin" | "checkout"
  const [showGuests, setShowGuests] = useState(false);
  const [guestData, setGuestData] = useState({
    adults: 1, children: 0, infants: 0, pets: 0,
    total: 1, summary: "1 guest",
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [reserveError, setReserveError] = useState("");

  /* ── Refs for click-outside ── */
  const calRef = useRef(null);
  const guestRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
      if (guestRef.current && !guestRef.current.contains(e.target)) {
        setShowGuests(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Computed pricing ── */
  const nightsCount = checkIn && checkOut ? calcNights(checkIn, checkOut) : defaultNights;
  const pricePerNight = price;
  const totalPrice = pricePerNight * nightsCount;
  const serviceFee = Math.round(totalPrice * 0.14);
  const cleaningFee = Math.round(pricePerNight * 0.4);
  const grandTotal = totalPrice + serviceFee + cleaningFee;

  /* ── Handlers ── */
  const openCheckin = () => {
    setCalendarTarget("checkin");
    setShowCalendar(true);
    setShowGuests(false);
    setReserveError("");
  };

  const openCheckout = () => {
    setCalendarTarget("checkout");
    setShowCalendar(true);
    setShowGuests(false);
    setReserveError("");
  };

  const toggleGuests = () => {
    setShowGuests((p) => !p);
    setShowCalendar(false);
    setReserveError("");
  };

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      setReserveError("Please select check-in and checkout dates.");
      if (!checkIn) {
        openCheckin();
      } else {
        openCheckout();
      }
      return;
    }
    setShowCalendar(false);
    setShowGuests(false);
    setReserveError("");
    setShowConfirm(true);
  };

  const handleCheckInChange = (date) => {
    setCheckIn(date);
    setReserveError("");
    /* Auto-switch to checkout after picking check-in */
    if (date && !checkOut) {
      setCalendarTarget("checkout");
    }
  };

  const handleCheckOutChange = (date) => {
    setCheckOut(date);
    setReserveError("");
    /* Close calendar after both dates picked */
    if (checkIn && date) {
      setTimeout(() => setShowCalendar(false), 300);
    }
  };

  return (
    <>
      <div className="rv-card">
        {/* Price header */}
        <div className="rv-card-price">
          <span className="rv-card-amount">${pricePerNight}</span>
          <span className="rv-card-per">/ night</span>
        </div>

        <div className="rv-card-rating">
          <AiFillStar size={13} />
          <span>{rating}</span>
          <span className="rv-card-dot">&middot;</span>
          <span className="rv-card-reviews">{reviews} review{reviews !== 1 ? "s" : ""}</span>
        </div>

        {/* Date + Guest selector */}
        <div className="rv-card-inputs">
          {/* Dates row */}
          <div className="rv-card-dates" ref={calRef}>
            <div
              className={`rv-card-field rv-card-field-left ${showCalendar && calendarTarget === "checkin" ? "rv-card-field--active" : ""}`}
              onClick={openCheckin}
            >
              <label>CHECK-IN</label>
              <span className={checkIn ? "rv-card-field-value" : ""}>
                {checkIn ? formatDate(checkIn) : "Add date"}
              </span>
            </div>
            <div
              className={`rv-card-field rv-card-field-right ${showCalendar && calendarTarget === "checkout" ? "rv-card-field--active" : ""}`}
              onClick={openCheckout}
            >
              <label>CHECKOUT</label>
              <span className={checkOut ? "rv-card-field-value" : ""}>
                {checkOut ? formatDate(checkOut) : "Add date"}
              </span>
            </div>

            {/* Calendar dropdown */}
            {showCalendar && (
              <ReservationCalendar
                startDate={checkIn}
                endDate={checkOut}
                onStartChange={handleCheckInChange}
                onEndChange={handleCheckOutChange}
                onClose={() => setShowCalendar(false)}
              />
            )}
          </div>

          {/* Guests row */}
          <div className="rv-card-guests-wrap" ref={guestRef}>
            <div
              className={`rv-card-field rv-card-field-guests ${showGuests ? "rv-card-field--active" : ""}`}
              onClick={toggleGuests}
            >
              <label>GUESTS</label>
              <div className="rv-card-guest-value">
                <span className={guestData.total > 0 ? "rv-card-field-value" : ""}>
                  {guestData.summary}
                </span>
                <FiChevronDown size={16} className={`rv-card-chevron ${showGuests ? "rv-card-chevron--open" : ""}`} />
              </div>
            </div>

            {/* Guests dropdown */}
            {showGuests && (
              <ReservationGuests
                maxGuests={maxGuests}
                onGuestsChange={setGuestData}
                onClose={() => setShowGuests(false)}
              />
            )}
          </div>
        </div>

        {/* Error message */}
        {reserveError && (
          <p className="rv-card-error">{reserveError}</p>
        )}

        {/* Reserve button */}
        <button className="rv-card-btn" onClick={handleReserve}>
          Reserve
        </button>
        <p className="rv-card-note">You won't be charged yet</p>

        {/* Price breakdown (only shown when dates are selected) */}
        {checkIn && checkOut && (
          <div className="rv-card-breakdown">
            <div className="rv-card-row">
              <span>${pricePerNight} x {nightsCount} night{nightsCount !== 1 ? "s" : ""}</span>
              <span>${totalPrice}</span>
            </div>
            <div className="rv-card-row">
              <span>Cleaning fee</span>
              <span>${cleaningFee}</span>
            </div>
            <div className="rv-card-row">
              <span>Service fee</span>
              <span>${serviceFee}</span>
            </div>
            <div className="rv-card-row-divider" />
            <div className="rv-card-row rv-card-row-total">
              <span>Total before taxes</span>
              <span>${grandTotal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ReservationConfirmModal
          property={property}
          checkIn={checkIn}
          checkOut={checkOut}
          nightsCount={nightsCount}
          guestSummary={guestData.summary}
          pricePerNight={pricePerNight}
          totalPrice={totalPrice}
          serviceFee={serviceFee}
          grandTotal={grandTotal}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export default ReservationCard;
