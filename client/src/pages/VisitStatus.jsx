import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
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
  FiCamera,
  FiKey,
  FiFlag,
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
   Only when BOTH have confirmed are the contact details revealed.

   On the confirmed visit day the owner generates a 10-minute check-in code and
   shows it to the visitor on site. The visitor (their SAME account that booked
   the trip) proves arrival by scanning the QR or typing the code. The owner
   then marks the visit completed — which records a SUCCESSFUL visit. */

const fmt = (p) => (p ? `${p.date} at ${p.time}` : "—");

export default function VisitStatus() {
  const { tripId } = useParams();
  const id = tripId;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null); // 'confirm' | 'propose' | 'checkin' | 'complete' | 'code'

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

  const isCheckedIn = trip.status === "checked_in";
  const isCompleted = trip.status === "completed";
  const isCancelled = trip.status === "cancelled";

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
          {isCompleted ? (
            <>
              <FiCheckCircle size={20} />
              <div>
                <strong>Visit completed</strong>
                <p>This visit was completed successfully on {fmtDate(trip.completedAt || trip.checkIn)}.</p>
              </div>
            </>
          ) : isCancelled ? (
            <>
              <FiClock size={20} />
              <div>
                <strong>Visit cancelled</strong>
                <p>This visit was cancelled and recorded as unsuccessful.</p>
              </div>
            </>
          ) : isCheckedIn ? (
            <>
              <FiCheckCircle size={20} />
              <div>
                <strong>Visitor checked in</strong>
                <p>
                  {isOwner
                    ? "The visitor arrived at your property. Mark the visit completed after you meet."
                    : "You are checked in — the owner will mark the visit completed."}
                </p>
              </div>
            </>
          ) : bothConfirmed ? (
            <>
              <FiClock size={20} />
              <div>
                <strong>Visit confirmed</strong>
                <p>
                  {isOwner
                    ? "Use the check-in code below when the visitor arrives."
                    : "When you reach the property, scan the owner's QR code (shown on their phone) to check in."}
                </p>
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
                <p>A mutually confirmed schedule unlocks the check-in flow and contact details.</p>
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
                Scheduled: {fmt(otherProposal || trip.visitorProposal)}
              </p>
              {isCheckedIn && (
                <p className="vs-schedule-summary">
                  <FiCheckCircle size={15} />
                  Checked in: {fmtDate(trip.checkedInAt)} at {(trip.checkedInAt || "").includes("T") ? new Date(trip.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              )}
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

            {isCompleted ? (
              <p className="vs-congrats">
                <FiCheckCircle size={16} />
                Visit completed — you can leave a review from the Visits page.
              </p>
            ) : bothConfirmed && !isCancelled ? (
              <>
                <p className="vs-congrats">
                  <FiCheckCircle size={16} />
                  Both sides confirmed. {isOwner ? "Generate the check-in code when the visitor arrives." : "Check in below when you arrive."}
                </p>
                {isCheckedIn && isOwner && (
                  <button
                    type="button"
                    className="vs-submit vs-submit--complete"
                    disabled={busy === "complete"}
                    onClick={async () => {
                      setBusy("complete");
                      try {
                        const res = await tripService.complete(id);
                        setTrip(res.trip);
                        toast.success("Visit completed successfully!");
                      } catch (err) {
                        toast.error(err?.message || "Failed to complete the visit.");
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <FiFlag size={17} />
                    {busy === "complete" ? "Completing…" : "Mark visit completed"}
                  </button>
                )}
              </>
            ) : (
              <>
                {!bothConfirmed && (
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
              </>
            )}
          </div>
        </div>

        {/* Check-in panel — only once both sides confirmed and not cancelled */}
        {bothConfirmed && !isCancelled && (
          <CheckInPanel
            trip={trip}
            isOwner={isOwner}
            busy={busy}
            setBusy={setBusy}
            onTrip={setTrip}
          />
        )}

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

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Check-in panel ──
   Owner: generate/show a 10-minute QR code + fallback digits.
   Visitor: prove arrival by scanning the QR (or typing the code).
   Only the booking buyer's account can successfully check in. */
function CheckInPanel({ trip, isOwner, busy, setBusy, onTrip }) {
  const id = trip.id || trip._id;

  const [codeState, setCodeState] = useState(null); // { code, qrPayload, expiresAt }
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const scannerRef = useRef(null);
  const scannerActive = useRef(false);

  /* On mount, if the owner already has a valid code, display it. */
  const refreshCode = useCallback(async () => {
    if (!isOwner) return;
    try {
      const res = await tripService.getCheckinCode(id);
      if (res.available) setCodeState(res);
    } catch {
      /* no active code yet — fine, owner generates on demand */
    }
  }, [isOwner, id]);

  useEffect(() => {
    refreshCode();
  }, [refreshCode]);

  /* Stop any running camera on unmount. */
  useEffect(() => {
    return () => {
      if (scannerActive.current && scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerActive.current = false;
          });
      }
    };
  }, []);

  const handleGenerate = async () => {
    setBusy("code");
    try {
      const res = await tripService.generateCheckinCode(id);
      setCodeState({ code: res.code, qrPayload: res.qrPayload, expiresAt: res.expiresAt });
      onTrip(res.trip);
      toast.success("Check-in code generated. It expires in 10 minutes.");
    } catch (err) {
      toast.error(err?.message || "Failed to generate the check-in code.");
    } finally {
      setBusy(null);
    }
  };

  const submitCheckIn = async (raw) => {
    const code = String(raw || "").trim();
    const parsed = code.includes(":") ? code.split(":").pop().trim() : code;
    if (!parsed) {
      toast.info("No code detected — ask the owner to show the QR again.");
      return;
    }
    setBusy("checkin");
    try {
      const res = await tripService.checkIn(id, parsed);
      onTrip(res.trip);
      toast.success(res.message || "Checked in!");
      setShowScanner(false);
      setManualCode("");
    } catch (err) {
      toast.error(err?.message || "Failed to check in.");
    } finally {
      setBusy(null);
    }
  };

  const startScanner = async () => {
    setShowScanner(true);
    try {
      scannerRef.current = new Html5Qrcode("vs-scanner");
      scannerActive.current = true;
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await scannerRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
              scannerActive.current = false;
            });
          setShowScanner(false);
          submitCheckIn(decodedText);
        },
        () => {}
      );
    } catch {
      toast.error("Camera unavailable. Use the code entry below instead.");
      setShowScanner(false);
      scannerActive.current = false;
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerActive.current) {
        await scannerRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    scannerActive.current = false;
    setShowScanner(false);
  };

  /* Only meaningful while the visit is upcoming or already checked in. */
  if (trip.status !== "upcoming" && trip.status !== "checked_in") {
    return null;
  }

  if (trip.status === "checked_in") {
    return (
      <div className="vs-card vs-checkin">
        <div className="vs-checkin-head">
          <FiKey size={18} />
          <div>
            <strong>Checked in ✓</strong>
            <p>
              {isOwner
                ? "The visitor arrived. Mark the visit completed after you meet."
                : "You have arrived. The owner will mark the visit completed after the meeting."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Owner side: QR generator + display */
  if (isOwner) {
    const expiresIn = codeState?.expiresAt
      ? Math.max(0, Math.ceil((new Date(codeState.expiresAt) - Date.now()) / 60000))
      : 0;
    return (
      <div className="vs-card vs-checkin">
        <div className="vs-checkin-head">
          <FiKey size={18} />
          <div>
            <strong>Check-in code</strong>
            <p>Show this when the visitor arrives. It expires in 10 minutes.</p>
          </div>
        </div>

        {!codeState ? (
          <div className="vs-checkin-empty">
            <button
              type="button"
              className="vs-submit"
              disabled={busy === "code"}
              onClick={handleGenerate}
            >
              <FiKey size={17} />
              {busy === "code" ? "Generating…" : "Generate check-in code"}
            </button>
          </div>
        ) : (
          <div className="vs-qr-wrap">
            <div className="vs-qr-box">
              <QRCodeSVG size={190} value={codeState.qrPayload} />
            </div>
            <div className="vs-qr-meta">
              <span className="vs-qr-code">{codeState.code}</span>
              <span className="vs-qr-expiry">
                {expiresIn > 0 ? `Expires in ${expiresIn} min` : "Code expired — regenerate"}
              </span>
              <button
                type="button"
                className="vs-outline"
                disabled={busy === "code"}
                onClick={handleGenerate}
              >
                <FiRefreshCw size={16} />
                Regenerate code
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* Visitor side: scan or type the code. */
  return (
    <div className="vs-card vs-checkin">
      <div className="vs-checkin-head">
        <FiKey size={18} />
        <div>
          <strong>Check in — I'm here</strong>
          <p>
            Scan the QR the owner is showing, or type the code. Only your
            account (the one that booked this visit) can check in.
          </p>
        </div>
      </div>

      {showScanner ? (
        <div className="vs-scanner-wrap">
          <div id="vs-scanner" className="vs-scanner" />
          <button type="button" className="vs-outline" onClick={stopScanner}>
            Cancel scan
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="vs-submit"
            disabled={busy === "checkin"}
            onClick={startScanner}
          >
            <FiCamera size={17} />
            {busy === "checkin" ? "Checking in…" : "Scan QR code"}
          </button>

          <div className="vs-checkin-or">
            <span>or enter the code manually</span>
          </div>

          <form
            className="vs-manual-code"
            onSubmit={(e) => {
              e.preventDefault();
              submitCheckIn(manualCode);
            }}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="vs-input vs-code-input"
              placeholder="6-digit code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              className="vs-submit"
              disabled={busy === "checkin" || manualCode.length < 6}
            >
              <FiCheckCircle size={17} />
              {busy === "checkin" ? "Checking…" : "Check in"}
            </button>
          </form>
        </>
      )}
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