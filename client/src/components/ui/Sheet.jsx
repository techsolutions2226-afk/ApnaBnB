import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

const positionClasses = {
  bottom: "inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]",
  left: "inset-y-0 left-0 w-80 max-w-[85vw]",
  right: "inset-y-0 right-0 w-80 max-w-[85vw]",
};

export default function Sheet({
  open,
  onClose,
  title,
  position = "bottom",
  children,
  className = "",
}) {
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

  if (!open) return null;

  const isBottom = position === "bottom";
  const isHorizontal = position === "left" || position === "right";

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`
          absolute bg-white shadow-2xl flex flex-col
          ${positionClasses[position]}
          ${isBottom ? "animate-slide-up" : ""}
          ${position === "left" ? "animate-slide-in-left" : ""}
          ${position === "right" ? "animate-slide-in-right" : ""}
          ${className}
        `.trim()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Mobile drag handle */}
        {isBottom && (
          <div className="flex justify-center pb-2 pt-1">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>
        )}
      </div>
    </div>
  );
}
