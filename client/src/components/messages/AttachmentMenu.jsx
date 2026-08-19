/* AttachmentMenu — paperclip menu: Photos, Videos, Documents, Location, Property.
   Each item triggers a callback; file inputs live in the parent composer. */
import { useEffect, useRef } from "react";
import {
  FiImage, FiVideo, FiFileText, FiMapPin, FiHome, FiChevronDown,
} from "react-icons/fi";

const AttachmentMenu = ({ onPick, onClose, onOpenChange, propertyCount = 0 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const items = [
    { key: "photos", icon: FiImage, label: "Photos", desc: "Send pictures" },
    { key: "videos", icon: FiVideo, label: "Video", desc: "Send a video clip" },
    { key: "documents", icon: FiFileText, label: "Document", desc: "PDF, Word, Excel" },
    { key: "location", icon: FiMapPin, label: "Location", desc: "Share your spot" },
    { key: "property", icon: FiHome, label: "Property", desc: "Share a listing", count: propertyCount },
  ];

  return (
    <div ref={ref} className="attach-menu">
      <div className="attach-menu-head">
        <span>Attach</span>
        <button type="button" className="attach-menu-close" onClick={() => onOpenChange?.(false)} aria-label="Close">
          <FiChevronDown size={16} />
        </button>
      </div>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            type="button"
            className="attach-menu-item"
            onClick={() => {
              onPick(it.key);
              onClose?.();
            }}
          >
            <span className="attach-menu-icon">
              <Icon size={18} />
            </span>
            <span className="attach-menu-text">
              <strong>{it.label}</strong>
              <small>{it.desc}</small>
            </span>
            {it.count ? <span className="attach-menu-count">{it.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
};

export default AttachmentMenu;