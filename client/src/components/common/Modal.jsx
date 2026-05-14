import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import "../../styles/Common.css";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "default", // "small" | "default" | "large"
}) {
  const overlayRef = useRef(null);

  /* Close on Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const sizeClass =
    size === "large"
      ? " cm-modal-container--large"
      : size === "small"
        ? " cm-modal-container--small"
        : "";

  return (
    <div
      className="cm-modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className={`cm-modal-container${sizeClass}`}>
        <div className="cm-modal-header">
          <button className="cm-modal-close" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
          {title && <span className="cm-modal-title">{title}</span>}
        </div>
        <div className="cm-modal-body">{children}</div>
        {footer && <div className="cm-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
