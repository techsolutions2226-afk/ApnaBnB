import { createPortal } from "react-dom";

/* ─── Floating dropdown panel rendered into <body>.
     The dropdowns are deep inside the hero's stacking context
     (z-index), so a normal .dd-panel can be painted UNDER sibling
     sections that have their own z-index (e.g. the CTA cards),
     letting a click hit the wrong element. Portaling the panel to
     document.body keeps position:fixed identical but puts it in the
     ROOT stacking context, always on top of page content. ─── */

export default function Panel({ panelRef, position, className = "", children }) {
  return createPortal(
    <div ref={panelRef} className={`dd-panel ${className}`} style={position}>
      {children}
    </div>,
    document.body,
  );
}