import { useEffect, useLayoutEffect, useRef, useState } from "react";

const GAP = 6; // px between the trigger field and the floating panel

/* ── Floating dropdown panel positioning + dismissal hook ──
   - Renders the panel with position:fixed so it overlays page content even
     when anchored inside an overflow:hidden hero (no layout shift).
   - Closes on outside click and Escape.
   - Recomputes its position on scroll/resize so it stays glued to the field.
   Returns { anchorRef, panelRef, position } — attach anchorRef to the field
   wrapper (trigger + panel) and panelRef + position to the panel element. */
const useDropdownPanel = (isOpen, onClose) => {
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const recalc = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const r = anchor.getBoundingClientRect();
      const pw = panel.offsetWidth;
      // Clamp so the panel never goes off-screen on small viewports.
      const left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
      setPosition({ top: Math.round(r.bottom + GAP), left: Math.round(left) });
    };
    recalc();
    const onScroll = () => recalc();
    const onResize = () => recalc();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e) => {
      /* The panel is portaled to <body>, so it's no longer a child of the
         anchor — both must be treated as "inside" for outside-click. */
      const insideAnchor =
        anchorRef.current && anchorRef.current.contains(e.target);
      const insidePanel =
        panelRef.current && panelRef.current.contains(e.target);
      if (!insideAnchor && !insidePanel) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  return { anchorRef, panelRef, position };
};

export default useDropdownPanel;