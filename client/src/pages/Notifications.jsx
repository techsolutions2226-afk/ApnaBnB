import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiTrash2, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import notificationService from "../services/notificationService";
import { getSocket } from "../api/socket";
import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";
import RefreshButton from "../components/common/RefreshButton";
import "../styles/Account.css";
import "../styles/Notifications.css";

/* ─── Notifications inbox ───
   This page used to be a set of preference toggles saved to localStorage that
   nothing ever read — the "Preference updated" toast was not true. It is now
   the real inbox behind the bell: server-owned, paginated, filterable. */

const PAGE_SIZE = 20;

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
  "visit.cancelled": "🗓️",
  "review.received": "⭐",
  "account.verified": "🛡️",
  "account.suspended": "⚠️",
  "account.reactivated": "🛡️",
};

/* Bucket by day so a long list stays scannable. */
const bucketOf = (date) => {
  const d = new Date(date);
  const today = new Date();
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return "Earlier";
};

const timeOf = (date) =>
  new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export default function Notifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationService.list({
        page,
        limit: PAGE_SIZE,
        unread: unreadOnly,
      });
      setItems(data?.items || []);
      setTotal(data?.total || 0);
      setPages(data?.pages || 1);
    } catch (err) {
      setError(err?.message || "Could not load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  /* Live: a notification arriving while the inbox is open should appear. */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on("notification:new", load);
    socket.on("notification:refresh", load);
    return () => {
      socket.off("notification:new", load);
      socket.off("notification:refresh", load);
    };
  }, [load]);

  /* One-time cleanup of the keys the old implementation left behind, so stale
     device-local state doesn't linger now that read state is server-side. */
  useEffect(() => {
    try {
      localStorage.removeItem("airbnb_notifications");
      if (currentUser?.id) localStorage.removeItem(`notif_seen:${currentUser.id}`);
    } catch {
      /* private mode — nothing to clean */
    }
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const handleOpen = async (n) => {
    if (!n.read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      notificationService.markRead(n.id).catch(() => load());
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead();
      toast.success("All notifications marked as read");
      if (unreadOnly) load();
    } catch {
      toast.error("Could not mark all as read");
      load();
    }
  };

  const handleDelete = async (e, n) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    try {
      await notificationService.remove(n.id);
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      toast.error("Could not remove that notification");
      load();
    }
  };

  const unreadHere = items.filter((n) => !n.read).length;

  /* Group in render order — the API already sorts newest first. */
  const groups = [];
  for (const n of items) {
    const label = bucketOf(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to="/account" className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <div className="ntf-head">
          <div>
            <h1 className="ac-title">Notifications</h1>
            <p className="ac-subtitle-text">
              {total} notification{total === 1 ? "" : "s"}
              {unreadHere > 0 ? ` · ${unreadHere} unread on this page` : ""}
            </p>
          </div>
          <RefreshButton onRefresh={load} refreshing={isLoading} />
        </div>

        <div className="ntf-toolbar">
          <div className="ntf-filters">
            <button
              type="button"
              className={`ntf-filter ${!unreadOnly ? "ntf-filter--active" : ""}`}
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`ntf-filter ${unreadOnly ? "ntf-filter--active" : ""}`}
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
            >
              Unread
            </button>
          </div>
          {items.some((n) => !n.read) && (
            <button type="button" className="ntf-markall" onClick={handleMarkAll}>
              <FiCheckCircle size={15} /> Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="ntf-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ntf-skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="ntf-error">{error}</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🔔"
            title={unreadOnly ? "Nothing unread" : "No notifications yet"}
            description={
              unreadOnly
                ? "You've read everything. Switch to All to see your history."
                : "Matches, payments, visits and reviews will show up here."
            }
          />
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.label} className="ntf-group">
                <h2 className="ntf-group-label">{group.label}</h2>
                <div className="ntf-list">
                  {group.items.map((n) => (
                    <div
                      key={n.id}
                      className={`ntf-row ${n.read ? "" : "ntf-row--unread"}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpen(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpen(n);
                        }
                      }}
                    >
                      <span className="ntf-icon">{ICONS[n.type] || "🔔"}</span>
                      <span className="ntf-body">
                        <span className="ntf-title">{n.title}</span>
                        <span className="ntf-text">{n.body}</span>
                        <span className="ntf-time">{timeOf(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="ntf-dot" aria-hidden="true" />}
                      <button
                        type="button"
                        className="ntf-delete"
                        aria-label="Remove notification"
                        onClick={(e) => handleDelete(e, n)}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <Pagination
              currentPage={page}
              totalPages={pages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
