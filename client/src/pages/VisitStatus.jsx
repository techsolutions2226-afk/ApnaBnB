import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiChevronLeft,
  FiShield,
  FiMapPin,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiPhone,
  FiMail,
  FiUser,
  FiRefreshCw,
} from "react-icons/fi";
import tripService from "../services/tripService";
import Skeleton from "../components/common/Skeleton";
import { formatLocation } from "../utils/formatters";
import "../styles/Visit.css";

/* ─── Visit status — the mutual-confirmation hub ───
   Both the visitor and the owner land here. Each side can:
   - see the current proposed schedule(s),
   - confirm the schedule (both must confirm),
   - propose a different date/time.
   Only when BOTH have confirmed are the contact details revealed. */

const fmt = (p) => (p ? `${p.date} at ${p.time}` : "—");

export default function VisitStatus() {
  const { tripId } = useParams();
  const id = tripId;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null); // 'confirm' | 'propose' | null

  const [showPropose, setShowPropose] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await tripService.getById(id);
      setTrip(data);
    } catch (err) {
      setLoadError(err?.message || "Failed to load the visit.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="vs-page">
        <div className="vs-container">
          <Skeleton height={240} />
        </div>
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div className="vs-page">
        <div className="vs-container">
          <div className="vs-error">{loadError || "Visit not found."}</div>
        </div>
      </div>
    );
  }

  const property = trip.property || {};
  const isOwner = trip.role === "owner";
  const bothConfirmed = !!(trip.visitorConfirmed && trip.ownerConfirmed);
  const myConfirmed = isOwner ? trip.ownerConfirmed : trip.visitorConfirmed;
  const otherConfirmed = isOwner ? trip.visitorConfirmed : trip.ownerConfirmed;

  const otherProposal = isOwner ? trip.visitorProposal : trip.ownerProposal;

  const handleConfirm = async () => {
    setBusy("confirm");
    try {
      const updated = await tripService.confirm(id);
      setTrip(updated);
      toast.success(
        updated.visitorConfirmed && updated.ownerConfirmed
          ? "Visit confirmed! Contact details revealed."
          : "You confirmed. Waiting for the other side to confirm."
      );
    } catch (err) {
      toast.error(err?.message || "Failed to confirm the visit.");
    } finally {
      setBusy(null);
    }
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!newDate) {
      toast.info("Please choose a date.");
      return;
    }
    setBusy("propose");
    try {
      const updated = await tripService.proposeSchedule(id, {
        date: newDate,
        time: newTime || "12:00",
      });
      setTrip(updated);
      setShowPropose(false);
      setNewDate("");
      setNewTime("");
      toast.success(
        "New schedule proposed. The other side will confirm or counter-propose."
      );
    } catch (err) {
      toast.error(err?.message || "Failed to propose a new schedule.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="vs-page">
      <div className="vs-container">
        <Link to="/trips" className="vs-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Back to visits</span>
        </Link>

        <h1 className="vs-title">Visit details</h1>

        {/* Status banner */}
        <div className={`vs-banner vs-banner--${trip.status}`}>
          {bothConfirmed ? (
            <>
              <FiCheckCircle size={20} />
              <div>
                <strong>Confirmed by both sides</strong>
                <p>Visit on {fmt(otherProposal).split(" at ")[0]} — contact details are now unlocked.</p>
              </div>
            </>
          ) : trip.status === "cancelled" ? (
            <>
              <FiClock size={20} />
              <div>
                <strong>Visit cancelled</strong>
                <p>This visit was cancelled.</p>
              </div>
            </>
          ) : myConfirmed && !otherConfirmed ? (
            <>
              <FiClock size={20} />
              <div>
                <strong>You confirmed</strong>
                <p>Waiting for the {isOwner ? "visitor" : "owner"} to confirm the schedule.</p>
              </div>
            </>
          ) : (
            <>
              <FiClock size={20} />
              <div>
                <strong>Awaiting confirmation</strong>
                <p>A mutually confirmed schedule unlocks both sides' contact details.</p>
              </div>
            </>
          )}
        </div>

        <div className="vs-grid">
          {/* Left — property summary */}
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
              <p className="vs-schedule-summary">
                <FiCalendar size={15} />
                Proposed: {fmt(otherProposal || trip.visitorProposal)}
              </p>
            </div>
          </div>

          {/* Right — schedule + confirm card */}
          <div className="vs-card vs-actions-card">
            <h3 className="vs-card-head">Schedule</h3>

            <div className="vs-schedule-row">
              <span className="vs-schedule-label">
                {isOwner ? "Visitor's proposal" : "Your proposal"}
              </span>
              <span className="vs-schedule-value">
                {fmt(trip.visitorProposal)}
              </span>
              <span
                className={`vs-conf-chips${
                  trip.visitorConfirmed ? " vs-conf-chips--done" : ""
                }`}
              >
                {trip.visitorConfirmed ? "Confirmed ✓" : "Pending"}
              </span>
            </div>

            <div className="vs-schedule-row">
              <span className="vs-schedule-label">
                {isOwner ? "Your proposal" : "Owner's proposal"}
              </span>
              <span className="vs-schedule-value">
                {fmt(trip.ownerProposal)}
              </span>
              <span
                className={`vs-conf-chips${
                  trip.ownerConfirmed ? " vs-conf-chips--done" : ""
                }`}
              >
                {trip.ownerConfirmed ? "Confirmed ✓" : "Pending"}
              </span>
            </div>

            {bothConfirmed ? (
              <p className="vs-congrats">
                <FiCheckCircle size={16} />
                You can now contact each other directly to finalise the visit.
              </p>
            ) : (
              <div className="vs-action-buttons">
                <button
                  type="button"
                  className="vs-submit"
                  disabled={busy !== null || myConfirmed}
                  onClick={handleConfirm}
                >
                  <FiCheckCircle size={17} />
                  {busy === "confirm"
                    ? "Confirming…"
                    : myConfirmed
                      ? "Confirmed"
                      : "Confirm schedule"}
                </button>
                <button
                  type="button"
                  className="vs-outline"
                  onClick={() => setShowPropose((v) => !v)}
                >
                  <FiRefreshCw size={16} />
                  Propose another time
                </button>
              </div>
            )}

            {showPropose && !bothConfirmed && (
              <form className="vs-propose-form" onSubmit={handlePropose}>
                <label className="vs-label">Preferred date</label>
                <input
                  type="date"
                  className="vs-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
                <label className="vs-label">Preferred time</label>
                <input
                  type="time"
                  className="vs-input"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="vs-submit"
                  disabled={busy === "propose"}
                >
                  {busy === "propose" ? "Proposing…" : "Propose new schedule"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Contact reveal — only when both confirmed */}
        {bothConfirmed ? (
          <ContactCard trip={trip} />
        ) : (
          <div className="vs-lock">
            <FiShield size={18} />
            <p>
              Contact details are locked until the {isOwner ? "visitor" : "owner"} confirms
              the schedule. Once both sides confirm, names, phone numbers and
              emails are revealed to you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ trip }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await tripService.getContact(trip.id || trip._id);
        if (alive) setContact(data);
      } catch (e) {
        if (alive) setErr(e?.message || "Could not load contact details.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trip.id, trip._id]);

  return (
    <div className="vs-card vs-contact">
      <div className="vs-contact-head">
        <FiShield size={16} />
        <strong>Contact details revealed</strong>
        <span>Mutual confirmation complete</span>
      </div>

      {loading ? (
        <p className="vs-contact-loading">Loading contact details…</p>
      ) : err ? (
        <p className="vs-error">{err}</p>
      ) : contact ? (
        <div className="vs-contact-grid">
          <div className="vs-contact-person">
            <p className="vs-contact-role">Owner</p>
            <p className="vs-contact-name">
              <FiUser size={15} /> {contact.owner?.name || "—"}
            </p>
            <p className="vs-contact-line">
              <FiPhone size={15} /> {contact.owner?.phone || "—"}
            </p>
            <p className="vs-contact-line">
              <FiMail size={15} /> {contact.owner?.email || "—"}
            </p>
          </div>
          <div className="vs-contact-person">
            <p className="vs-contact-role">Visitor</p>
            <p className="vs-contact-name">
              <FiUser size={15} /> {contact.visitor?.name || "—"}
            </p>
            <p className="vs-contact-line">
              <FiPhone size={15} /> {contact.visitor?.phone || "—"}
            </p>
            <p className="vs-contact-line">
              <FiMail size={15} /> {contact.visitor?.email || "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="vs-error">No contact details available.</p>
      )}
    </div>
  );
}