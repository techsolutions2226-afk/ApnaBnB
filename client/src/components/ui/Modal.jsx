import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  className = "",
}) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content — bottom sheet on mobile, centered dialog on desktop */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`
          relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl
          w-full sm:${sizeClasses[size]}
          max-h-[85vh] sm:max-h-[85vh]
          flex flex-col
          animate-slide-up sm:animate-scale-in
          ${className}
        `.trim()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-semibold text-slate-900 font-heading">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>

        {/* Footer slot — rendered outside the scroll area so it never overlaps content */}
        {footer && (
          <div className="px-5 py-4 border-t border-slate-200 bg-white sm:px-6 shrink-0">
            {footer}
          </div>
        )}

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}
