import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiCalendar, FiCheck, FiChevronRight, FiUser, FiFlag } from "react-icons/fi";
import SectionHeader from "./SectionHeader";
import { useBooking } from "../../context/BookingContext";
import tripService from "../../services/tripService";

/* ─── UpcomingVisitsSection ───
   Dashboard table of upcoming property visits with the mutual-confirmation
   status. Both sides see their visits here:
   - buyer/dealer-as-buyer sees visits they proposed (role = "visitor"),
   - seller/dealer-as-owner sees visits requested on their listings (role = "owner").
   Either side can confirm the schedule straight from the dashboard, and the
   "View" link opens the full two-way visit page (also where counter-proposing
   and contact reveal live). */

const visitDate = (trip) =>
  trip.visitorProposal?.date || trip.ownerProposal?.date || trip.checkIn || "—";

export default function UpcomingVisitsSection({ items = [], onRefresh, limit = 5 }) {
  const { confirmVisit } = useBooking();
  const [busyId, setBusyId] = useState(null);

  const handleConfirm = async (trip) => {
    setBusyId(trip.id);
    try {
      const updated = await confirmVisit(trip.id);
      toast.success(
        updated.visitorConfirmed && updated.ownerConfirmed
          ? "Visit confirmed — contact details revealed."
          : "You confirmed. Waiting for the other side to confirm."
      );
      if (typeof onRefresh === "function") onRefresh();
    } catch (err) {
      toast.error(err?.message || "Failed to confirm the visit.");
    } finally {
      setBusyId(null);
    }
  };

  /* Owner only: mark the visit completed after the visitor checked in. */
  const handleComplete = async (trip) => {
    setBusyId(trip.id);
    try {
      await tripService.complete(trip.id);
      toast.success("Visit completed successfully.");
      if (typeof onRefresh === "function") onRefresh();
    } catch (err) {
      toast.error(err?.message || "Failed to complete the visit.");
    } finally {
      setBusyId(null);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="dash-section">
        <SectionHeader title="Upcoming Visits" to="/trips" actionIcon={FiCalendar} />
        <div className="dash-empty">
          <div className="dash-empty-icon">📅</div>
          <p className="dash-empty-text">No property visits scheduled.</p>
          <Link to="/" className="dash-empty-link">
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section">
      <SectionHeader title="Upcoming Visits" to="/trips" actionIcon={FiCalendar} />
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Date</th>
              <th>Side</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, limit).map((trip) => {
              const bothConfirmed = !!(trip.visitorConfirmed && trip.ownerConfirmed);
              const myConfirmed = trip.role === "owner" ? trip.ownerConfirmed : trip.visitorConfirmed;
              const isCheckedIn = trip.status === "checked_in";
              const canConfirm =
                trip.status === "upcoming" && !myConfirmed && !bothConfirmed;

              return (
                <tr key={trip.id}>
                  <td data-label="Property">
                    <div className="dash-table-title">
                      {trip.property?.title || "Scheduled visit"}
                    </div>
                    <div className="dash-table-sub">
                      {trip.property?.listedBy?.name || "Property visit"}
                    </div>
                  </td>
                  <td data-label="Date">{visitDate(trip)}</td>
                  <td data-label="Side">
                    <span className="dash-side-chip">
                      {trip.role === "owner" ? (
                        <>
                          <FiUser size={12} /> Owner
                        </>
                      ) : (
                        <>
                          <FiUser size={12} /> Visitor
                        </>
                      )}
                    </span>
                  </td>
                  <td data-label="Status">
                    {isCheckedIn ? (
                      <span className="dash-visit-chip dash-visit-chip--done">
                        Checked in
                      </span>
                    ) : bothConfirmed ? (
                      <span className="dash-visit-chip dash-visit-chip--done">
                        Confirmed
                      </span>
                    ) : myConfirmed ? (
                      <span className="dash-visit-chip dash-visit-chip--wait">
                        Waiting for the other side
                      </span>
                    ) : (
                      <span className="dash-visit-chip">
                        Awaiting confirmation
                      </span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="dash-visit-actions">
                      {canConfirm && (
                        <button
                          type="button"
                          className="dash-visit-confirm"
                          disabled={busyId === trip.id}
                          onClick={() => handleConfirm(trip)}
                        >
                          <FiCheck size={14} />
                          {busyId === trip.id ? "Confirming…" : "Confirm"}
                        </button>
                      )}
                      {isCheckedIn && trip.role === "owner" && (
                        <button
                          type="button"
                          className="dash-visit-confirm"
                          disabled={busyId === trip.id}
                          onClick={() => handleComplete(trip)}
                        >
                          <FiFlag size={13} />
                          {busyId === trip.id ? "Completing…" : "Complete visit"}
                        </button>
                      )}
                      <Link to={`/visits/${trip.id}`} className="dash-visit-view">
                        View <FiChevronRight size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}