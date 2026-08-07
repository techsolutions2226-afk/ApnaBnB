import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { useMyMatches } from "../../hooks/useMatches";
import { useAuth } from "../../context/AuthContext";

/* Human-readable labels per match type — same scheme as RecentMatches. */
const TYPE_LABELS = {
  "seller-buyer": "Seller ↔ Buyer",
  "dealer-buyer": "Dealer ↔ Buyer",
  "dealer-dealer": "Dealer ↔ Dealer",
  "seller-dealer": "Seller ↔ Dealer",
};

const TYPE_COLORS = {
  "seller-buyer": "#1e7e34",
  "dealer-buyer": "#1565c0",
  "dealer-dealer": "#6a1b9a",
  "seller-dealer": "#e65100",
};

/* Crude relative-time formatter — keeps the bundle dep-free. */
const timeAgo = (date) => {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString();
};

/* Key into localStorage that tracks which match-IDs the user has already
   seen. Per-user so accounts on the same machine don't share read state. */
const seenKeyFor = (userId) => `notif_seen:${userId || "anon"}`;

const loadSeen = (userId) => {
  try {
    const raw = localStorage.getItem(seenKeyFor(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const saveSeen = (userId, set) => {
  try {
    localStorage.setItem(seenKeyFor(userId), JSON.stringify(Array.from(set)));
  } catch {
    /* quota errors swallowed — read state is best-effort */
  }
};

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { matches } = useMyMatches();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => loadSeen(currentUser?.id));
  const wrapperRef = useRef(null);

  // Refresh the seen-set when the user changes (login/logout).
  useEffect(() => {
    setSeen(loadSeen(currentUser?.id));
  }, [currentUser?.id]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Cap at 10 most-recent — older noise gets dropped from the dropdown but
     the user can hit "View all" to see everything on /matches. */
  const items = useMemo(() => (matches || []).slice(0, 10), [matches]);
  const unreadCount = useMemo(
    () => items.filter((m) => !seen.has(m._id)).length,
    [items, seen],
  );

  const markAllSeen = () => {
    const next = new Set(seen);
    items.forEach((m) => next.add(m._id));
    setSeen(next);
    saveSeen(currentUser?.id, next);
  };

  const handleItemClick = (match) => {
    const next = new Set(seen);
    next.add(match._id);
    setSeen(next);
    saveSeen(currentUser?.id, next);
    setOpen(false);
    navigate("/matches");
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        title="Notifications"
        style={{
          position: "relative",
          width: 38,
          height: 38,
          padding: 0,
          background: open ? "#f5f5f5" : "transparent",
          border: "1px solid transparent",
          borderRadius: "50%",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "#f5f5f5";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        <FiBell size={18} color="#222" />
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
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
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
            border: "1px solid #ebebeb",
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
            <span style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllSeen}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {items.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "#717171",
                  fontSize: 14,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔔</div>
                You're all caught up. New matches will appear here.
              </div>
            ) : (
              items.map((m) => {
                const isUnread = !seen.has(m._id);
                const typeLabel = TYPE_LABELS[m.type] || m.type;
                const typeColor = TYPE_COLORS[m.type] || "#444";
                const title =
                  m.property?.title || "New property match";
                const loc = [
                  m.property?.location?.area,
                  m.property?.location?.city,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => handleItemClick(m)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      background: isUnread ? "#f0f7ff" : "#fff",
                      border: "none",
                      borderBottom: "1px solid #f5f5f5",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isUnread
                        ? "#f0f7ff"
                        : "#fff";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#fff8e1",
                          flexShrink: 0,
                          fontSize: 14,
                        }}
                      >
                        🔗
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            color: "#222",
                            fontWeight: isUnread ? 600 : 500,
                            marginBottom: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          New match: {title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#717171",
                            marginBottom: 4,
                          }}
                        >
                          {loc || "Location pending"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: typeColor,
                            }}
                          >
                            {typeLabel} · {Math.round(m.score || 0)}%
                          </span>
                          <span style={{ fontSize: 11, color: "#9e9e9e" }}>
                            {timeAgo(m.createdAt)}
                          </span>
                        </div>
                      </div>
                      {isUnread && (
                        <span
                          aria-hidden="true"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#1a8f5a",
                            flexShrink: 0,
                            marginTop: 8,
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/matches");
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 16px",
                background: "#fafafa",
                color: "#222",
                border: "none",
                borderTop: "1px solid #ebebeb",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              View all matches
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
