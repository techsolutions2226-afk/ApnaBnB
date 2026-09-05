import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiChevronLeft, FiShield, FiMapPin, FiCalendar } from "react-icons/fi";
import { useProperty } from "../hooks/useProperties";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";
import Skeleton from "../components/common/Skeleton";
import { formatPrice, formatLocation } from "../utils/formatters";
import "../styles/Visit.css";

/* ─── Visit plan — visitor proposes a date + time for the property visit ───
   Buyer picks a preferred day/time, the trip is created, and the owner is
   notified. Contact details are NOT shown here nor on the status page until
   BOTH sides confirm the schedule. */

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function VisitPlan({ propertyId }) {
  const { id } = useParams();
  const actualId = propertyId || id;
  const { property, isLoading, error } = useProperty(actualId);
  const { currentUser } = useAuth();
  const { addTrip } = useBooking();
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(todayISO, []);

  const isOwnListing =
    property && currentUser && (property.listedById || property.listedBy?._id) === currentUser.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      toast.info("Please choose a visit date.");
      return;
    }

    setSubmitting(true);
    try {
      const trip = await addTrip({
        propertyId: actualId,
        checkIn: date,
        checkOut: date,
        nights: 1,
        guests: { adults: 1, children: 0, infants: 0 },
        totalPrice: 0,
        serviceFee: 0,
        visitorProposal: { date, time },
      });
      toast.success("Visit proposed! Waiting for the owner to confirm the schedule.");
      const tripId = trip.id || trip._id;
      navigate(`/visits/${tripId}`, { replace: true });
    } catch (err) {
      toast.error(err?.message || "Failed to propose the visit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vs-page">
      <div className="vs-container">
        <Link to={actualId ? `/property/${actualId}` : "/"} className="vs-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Back to property</span>
        </Link>

        <h1 className="vs-title">Confirm your visit</h1>
        <p className="vs-subtitle">
          Propose a date and time. The owner will confirm it or offer an
          alternative. Contact details are revealed to both of you once the
          visit is mutually confirmed.
        </p>

        {isLoading ? (
          <div className="vs-loading">
            <Skeleton height={220} />
          </div>
        ) : error || !property ? (
          <div className="vs-error">{error || "Property not found."}</div>
        ) : (
          <div className="vs-grid">
            <div className="vs-card vs-property">
              {property.photos?.[0] && (
                <img
                  src={property.photos[0]}
                  alt={property.title}
                  className="vs-property-img"
                />
              )}
              <div className="vs-property-body">
                <h2 className="vs-property-title">{property.title}</h2>
                <p className="vs-property-loc">
                  <FiMapPin size={15} />
                  {formatLocation(property.location)}
                </p>
                <div className="vs-property-meta">
                  <span className="vs-meta-chip">
                    {property.purpose === "rent" ? "For rent" : "For sale"}
                  </span>
                  <span className="vs-meta-price">
                    {formatPrice(property.price, { prefix: true })}
                    {property.purpose === "rent" ? " / month" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="vs-card vs-form-card">
              {isOwnListing ? (
                <p className="vs-own-note">
                  You cannot book a visit on your own listing.
                </p>
              ) : (
                <form onSubmit={handleSubmit}>
                  <label className="vs-label" htmlFor="vs-date">
                    Preferred date
                  </label>
                  <input
                    id="vs-date"
                    type="date"
                    className="vs-input"
                    value={date}
                    min={minDate}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />

                  <label className="vs-label" htmlFor="vs-time">
                    Preferred time
                  </label>
                  <input
                    id="vs-time"
                    type="time"
                    className="vs-input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />

                  <div className="vs-fee">
                    <FiShield size={16} />
                    <span>
                      <strong>₹200 refundable visit fee</strong> — returned if
                      the owner no-shows or the listing is fake.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="vs-submit"
                    disabled={submitting}
                  >
                    <FiCalendar size={17} />
                    {submitting ? "Proposing…" : "Propose visit"}
                  </button>

                  <p className="vs-form-note">
                    You will be notified when the owner confirms the schedule or
                    proposes another time.
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}