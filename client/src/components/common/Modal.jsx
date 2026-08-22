import { useEffect, useId, useRef } from "react";
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
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const titleId = useId();

  /* Close on Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  /* Focus the dialog on open, restore the trigger on close. */
  useEffect(() => {
    if (!isOpen) return;
    restoreRef.current = document.activeElement;
    panelRef.current?.focus();
    return () => {
      const el = restoreRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  /* Keep Tab cycling inside the modal rather than escaping to the page behind. */
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
      <div
        ref={panelRef}
        className={`cm-modal-container${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="cm-modal-header">
          <button
            type="button"
            className="cm-modal-close"
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            <FiX />
          </button>
          {title && (
            <span className="cm-modal-title" id={titleId}>
              {title}
            </span>
          )}
        </div>
        <div className="cm-modal-body">{children}</div>
        {footer && <div className="cm-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
