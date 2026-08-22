/* ─── ConfirmDialog — Confirmation modal ───
   A simple modal overlay for destructive or important actions.
   Used in MyListings (delete), and anywhere else requiring user confirmation.

   Props:
     isOpen      — whether the dialog is visible
     onClose     — callback to close without action
     onConfirm   — callback on confirm
     title       — dialog heading
     message     — description text (string or ReactNode)
     confirmLabel — text on confirm button (default "Confirm")
     cancelLabel  — text on cancel button (default "Cancel")
     variant      — "danger" | "default" (default "default")
     icon         — optional emoji/node above the title
     isLoading    — disables both buttons while the action is in flight
   ─────────────────────────────────────────────── */

import { useEffect, useId, useRef } from "react";
import "../../styles/Common.css";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  icon,
  isLoading = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  /* Close on Escape. Guarded so a caller that forgets onClose can't crash the
     dialog — losing the shortcut is recoverable, a TypeError here is not. */
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

  /* Move focus into the dialog on open and hand it back on close, so keyboard
     users aren't left stranded on the trigger behind the overlay. */
  useEffect(() => {
    if (!isOpen) return;
    restoreRef.current = document.activeElement;
    panelRef.current?.focus();
    return () => {
      const el = restoreRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [isOpen]);

  /* Keep Tab inside the dialog while it's open. */
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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

  if (!isOpen) return null;

  return (
    <div className="cm-confirm-overlay" onClick={() => onClose?.()}>
      <div
        ref={panelRef}
        className="cm-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {icon && <div className="cm-confirm-icon">{icon}</div>}
        <h3 className="cm-confirm-title" id={titleId}>
          {title}
        </h3>
        {message && <p className="cm-confirm-message">{message}</p>}
        <div className="cm-confirm-actions">
          <button
            type="button"
            className="cm-confirm-btn cm-confirm-btn--cancel"
            onClick={() => onClose?.()}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cm-confirm-btn cm-confirm-btn--${variant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
