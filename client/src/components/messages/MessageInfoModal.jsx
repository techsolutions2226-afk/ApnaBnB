/* MessageInfoModal — "Message information": sent / delivered / read timestamps
   for a message (WhatsApp-style tray). */
import { FiX } from "react-icons/fi";

const formatFull = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const Row = ({ label, value }) => (
  <div className="info-row">
    <span className="info-row-label">{label}</span>
    <span className="info-row-value">{value}</span>
  </div>
);

const MessageInfoModal = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-tray" onClick={(e) => e.stopPropagation()}>
        <div className="info-tray-head">
          <strong>Message Info</strong>
          <button type="button" className="info-tray-close" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <div className="info-tray-body">
          <Row label="Sent" value={formatFull(message.createdAt) || "—"} />
          <Row label="Delivered" value={formatFull(message.deliveredAt) || "Not yet delivered"} />
          <Row label="Read" value={formatFull(message.readAt) || "Not yet read"} />
          {message.edited && (
            <Row label="Edited" value={formatFull(message.editedAt) || "—"} />
          )}
          {message.type === "text" && message.content && (
            <div className="info-tray-msg">{message.content}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;