/* ─── NotificationItem — Single notification row ───
   Used in dashboard notification lists (seller, buyer, dealer).

   Props:
     notification — { id, type, title, message, read, createdAt }
     iconMap      — optional type→emoji mapping (defaults to NOTIF_ICONS)
   ─────────────────────────────────────────────── */

import { NOTIF_ICONS, timeAgo } from "../../utils/formatters";
import "../../styles/Common.css";

export default function NotificationItem({
  notification,
  iconMap = NOTIF_ICONS,
}) {
  const n = notification;
  return (
    <div className={`cm-notif ${!n.read ? "cm-notif--unread" : ""}`}>
      <div className={`cm-notif-icon cm-notif-icon--${n.type}`}>
        {iconMap[n.type] || "\uD83D\uDD14"}
      </div>
      <div className="cm-notif-body">
        <p className="cm-notif-title">{n.title}</p>
        <p className="cm-notif-msg">{n.message}</p>
      </div>
      <span className="cm-notif-time">{timeAgo(n.createdAt)}</span>
    </div>
  );
}
