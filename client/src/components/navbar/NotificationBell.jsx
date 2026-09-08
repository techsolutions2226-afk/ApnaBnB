import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { toast } from "react-toastify";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../context/AuthContext";

/* ─── NotificationBell ───
   Reads real notifications from the API. Read state is server-side, so the
   badge is consistent across devices — it used to live in localStorage, which
   meant marking read on one device left it unread on another.

   Styling is deliberately inline and self-contained: that is what lets the
   same component drop into both the public navbar and the dashboard topbar
   without either stylesheet needing to know about it. */

/* Emoji per notification type. Falls back to the bell for anything new, so an
   unrecognised type from a newer server never renders blank. */
const ICONS = {
  "match.created": "🔗",
  "match.accepted": "🤝",
  "match.rejected": "✖️",
  "listing.created": "🏠",
  "property.created": "🏠",
  "property.approved": "✅",
  "property.rejected": "⛔",
  "requirement.created": "📝",
  "payment.approved": "💳",
  "payment.rejected": "⛔",
  "plan.activated": "⭐",
  "visit.booked": "📅",
  "visit.proposed": "📅",
  "visit.schedule_requested": "🔄",
  "visit.confirmed": "✅",
  "visit.checked_in": "📍",
  "visit.completed": "🏁",
  "visit.cancelled": "🗓️",
  "review.received": "⭐",
  "account.verified": "🛡️",
  "account.suspended": "⚠️",
  "account.reactivated": "🛡️",
};

const TINTS = {
  approved: "#e8f5e9",
  rejected: "#fdecea",
  suspended: "#fdecea",
};

const tintFor = (type = "") => {
  const tail = type.split(".")[1];
  return TINTS[tail] || "#fff8e1";
};

/* Relative time, dependency-free. */
const timeAgo = (date) => {
  if (!date) return "";
  const sec = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString();
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { items, unreadCount, isLoading, error, markSeen, markAllRead } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  /* Close on outside click. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Opening the panel marks what is shown as read — "seeing" it clears the
     badge, which is the behaviour people expect from a bell. Only the visible
     rows are marked, so nothing further down the inbox is silently cleared. */
  useEffect(() => {
    if (!open) return;
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length) markSeen(unreadIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Guests still see the bell, but tapping it points them at login instead of
     rendering an empty/unauthorized panel the dashboards show. */
  const handleToggle = () => {
    if (!currentUser) {
      toast.info("Please login first to view your notifications.");
      navigate("/login");
      return;
    }
    setOpen((o) => !o);
  };

  const handleItemClick = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={wrapperRef}>
      <button
        type="button"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        onClick={handleToggle}
        style={{
          position: "relative",
          width: 38,
          height: 38,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: "none",
          background: open ? "#f5f5f5" : "transparent",
          cursor: "pointer",
          color: "#222",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "#f5f5f5";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        <FiBell size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "#1a8f5a",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "16px",
              textAlign: "center",
              border: "2px solid #fff",
              boxSizing: "content-box",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #ebebeb",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "#222" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  border: "none",
                  background: "none",
                  color: "#1976d2",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {/* Loading and error used to be swallowed here — a failed fetch
                rendered as "you're all caught up", which is a lie. */}
            {isLoading && items.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#717171", fontSize: 13 }}>
                Loading notifications…
              </div>
            ) : error ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#c13515", fontSize: 13 }}>
                {error}
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#717171", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                You&apos;re all caught up.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    border: "none",
                    borderBottom: "1px solid #f5f5f5",
                    background: n.read ? "#fff" : "#f0f7ff",
                    cursor: n.link ? "pointer" : "default",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read ? "#fff" : "#f0f7ff";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: tintFor(n.type),
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                      }}
                    >
                      {ICONS[n.type] || "🔔"}
                    </span>

                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13.5,
                          fontWeight: n.read ? 500 : 600,
                          color: "#222",
                          marginBottom: 2,
                        }}
                      >
                        {n.title}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "#717171",
                          lineHeight: 1.45,
                        }}
                      >
                        {n.body}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#9e9e9e",
                          marginTop: 4,
                        }}
                      >
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>

                    {!n.read && (
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#1a8f5a",
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/account/notifications");
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "12px 16px",
              border: "none",
              borderTop: "1px solid #ebebeb",
              background: "#fafafa",
              fontSize: 13,
              fontWeight: 600,
              color: "#222",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
