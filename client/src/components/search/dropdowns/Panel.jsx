import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

/* ─── Floating dropdown panel rendered into <body>.
     The dropdowns are deep inside the hero's stacking context
     (z-index), so a normal .dd-panel can be painted UNDER sibling
     sections that have their own z-index (e.g. the CTA cards),
     letting a click hit the wrong element. Portaling the panel to
     document.body keeps position:fixed identical but puts it in the
     ROOT stacking context, always on top of page content.

     `animated` swaps the CSS pop-in for a Framer enter/exit transition —
     wrap the panel in <AnimatePresence> so the close animates too. ─── */

const EASE = [0.22, 1, 0.36, 1];

export default function Panel({
  panelRef,
  position,
  className = "",
  animated = false,
  children,
}) {
  const reduce = useReducedMotion();

  if (!animated) {
    return createPortal(
      <div ref={panelRef} className={`dd-panel ${className}`} style={position}>
        {children}
      </div>,
      document.body,
    );
  }

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 };
  return createPortal(
    <motion.div
      ref={panelRef}
      className={`dd-panel dd-panel--animated ${className}`}
      style={position || undefined}
      initial={hidden}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={hidden}
      transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
    >
      {children}
    </motion.div>,
    document.body,
  );
}
