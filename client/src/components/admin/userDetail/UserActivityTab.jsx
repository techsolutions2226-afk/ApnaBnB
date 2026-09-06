import { useState } from "react";
import StatusBadge from "../../common/StatusBadge";
import RefreshButton from "../../common/RefreshButton";
import { FiMapPin, FiLink, FiStar } from "react-icons/fi";
import { fmtDate, fmtDateTime, formatPrice, titleCase } from "./userDetailUtils";

const SUBTABS = [
  { id: "visits", label: "Visits", icon: FiMapPin },
  { id: "matches", label: "Matches", icon: FiLink },
  { id: "reviews", label: "Reviews", icon: FiStar },
];

function Stars({ rating }) {
  const n = Number(rating) || 0;
  return (
    <span className="aud-stars" aria-label={`${n} of 5`}>
      {"★".repeat(Math.max(0, Math.min(5, n)))}
      <span className="aud-stars-empty">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

function Empty({ label }) {
  return <p className="adm-empty aud-empty">{label}</p>;
}

/** Activity tab — visits, matches, reviews (given + received). */
export default function UserActivityTab({
  visits = { scheduled: [], received: [] },
  matches = [],
  reviews = { given: [], received: [] },
  onRefresh,
  refreshing,
}) {
  const [sub, setSub] = useState("visits");
  const scheduled = visits.scheduled || [];
  const received = visits.received || [];
  const given = reviews.given || [];
  const receivedReviews = reviews.received || [];

  return (
    <div className="aud-activity">
      <div className="aud-activity-toolbar">
        <div className="aud-subtabs" role="tablist" aria-label="Activity sections">
          {SUBTABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={sub === id}
              className={`aud-subtab${sub === id ? " aud-subtab--active" : ""}`}
              onClick={() => setSub(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      </div>

      {sub === "visits" && (
        <div className="aud-activity-panels">
          <section className="aud-panel">
            <h3 className="aud-panel-title">Visits scheduled ({scheduled.length})</h3>
            {scheduled.length === 0 ? (
              <Empty label="No visits scheduled by this user." />
            ) : (
              <ul className="aud-feed">
                {scheduled.map((trip) => (
                  <li key={trip.id} className="aud-feed-item">
                    <div className="aud-feed-main">
                      <strong>{trip.property?.title || "Property"}</strong>
                      <StatusBadge status={trip.status} prefix="adm-badge" />
                    </div>
                    <p className="aud-feed-meta">
                      {trip.checkIn}
                      {trip.visitorProposal?.time ? ` · ${trip.visitorProposal.time}` : ""}
                      {" · Owner: "}
                      {trip.property?.listedBy?.name || "—"}
                      {" · "}
                      {fmtDate(trip.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="aud-panel">
            <h3 className="aud-panel-title">Visits received ({received.length})</h3>
            {received.length === 0 ? (
              <Empty label="No visits on this user's properties." />
            ) : (
              <ul className="aud-feed">
                {received.map((trip) => (
                  <li key={trip.id} className="aud-feed-item">
                    <div className="aud-feed-main">
                      <strong>{trip.property?.title || "Property"}</strong>
                      <StatusBadge status={trip.status} prefix="adm-badge" />
                    </div>
                    <p className="aud-feed-meta">
                      Visitor: {trip.user?.name || "—"} ({trip.user?.email || "—"})
                      {" · "}
                      {fmtDate(trip.createdAt)}
                      {trip.outcome && trip.outcome !== "pending"
                        ? ` · Outcome: ${titleCase(trip.outcome)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {sub === "matches" && (
        <section className="aud-panel">
          <h3 className="aud-panel-title">Matches ({matches.length})</h3>
          {matches.length === 0 ? (
            <Empty label="No matches involving this user." />
          ) : (
            <div className="aud-table-scroll">
              <table className="adm-table aud-mini-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Requirement</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="aud-cell-strong">{m.property?.title || "—"}</span>
                        <div className="adm-muted">{formatPrice(m.property?.price)}</div>
                      </td>
                      <td>{m.requirement?.title || "—"}</td>
                      <td>
                        <StatusBadge status={m.type} prefix="adm-badge" />
                      </td>
                      <td>{m.aiScore != null ? Math.round(m.aiScore) : m.score ?? "—"}</td>
                      <td>
                        <StatusBadge status={m.status} prefix="adm-badge" />
                      </td>
                      <td>{fmtDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {sub === "reviews" && (
        <div className="aud-activity-panels">
          <section className="aud-panel">
            <h3 className="aud-panel-title">Reviews given ({given.length})</h3>
            {given.length === 0 ? (
              <Empty label="No reviews written by this user." />
            ) : (
              <ul className="aud-feed">
                {given.map((r) => (
                  <li key={r.id} className="aud-feed-item">
                    <div className="aud-feed-main">
                      <Stars rating={r.rating} />
                      <span className="adm-muted">
                        on {titleCase(r.targetType)} · {fmtDateTime(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && <p className="aud-feed-comment">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="aud-panel">
            <h3 className="aud-panel-title">Reviews received ({receivedReviews.length})</h3>
            {receivedReviews.length === 0 ? (
              <Empty label="No reviews received yet." />
            ) : (
              <ul className="aud-feed">
                {receivedReviews.map((r) => (
                  <li key={r.id} className="aud-feed-item">
                    <div className="aud-feed-main">
                      <Stars rating={r.rating} />
                      <span className="adm-muted">
                        {r.reviewer?.name || "Someone"} · {r.targetLabel || titleCase(r.targetType)}{" "}
                        · {fmtDateTime(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && <p className="aud-feed-comment">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
