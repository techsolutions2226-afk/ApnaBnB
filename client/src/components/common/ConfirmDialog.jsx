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
   ─────────────────────────────────────────────── */

import { useEffect } from "react";
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
}) {
  /* Close on Escape */
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

  return (
    <div className="cm-confirm-overlay" onClick={onClose}>
      <div className="cm-confirm" onClick={(e) => e.stopPropagation()}>
        {icon && <div className="cm-confirm-icon">{icon}</div>}
        <h3 className="cm-confirm-title">{title}</h3>
        {message && <p className="cm-confirm-message">{message}</p>}
        <div className="cm-confirm-actions">
          <button
            type="button"
            className="cm-confirm-btn cm-confirm-btn--cancel"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cm-confirm-btn cm-confirm-btn--${variant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
