import { useCallback, useEffect, useRef, useState } from "react";

/* ─── useStickyOffset ───
   Measures the rendered width of the first (checkbox) column and returns it,
   so the second sticky column can be offset by the REAL number.

   A constant cannot work here: under `border-collapse: collapse` a cell's
   rendered width includes the shared border, so a declared 44px renders at
   46px — and declaring 46px renders at 48px. The value has to come from the
   DOM after layout.

   Returns [ref, offsetPx]. Put the ref on the table.
*/
export const useStickyOffset = () => {
  const ref = useRef(null);
  const [offset, setOffset] = useState(46);

  const measure = useCallback(() => {
    const table = ref.current;
    if (!table) return;
    const cell = table.querySelector("thead .adm-sticky-check");
    if (!cell) return;
    const w = Math.round(cell.getBoundingClientRect().width);
    if (w > 0) setOffset((prev) => (prev === w ? prev : w));
  }, []);

  useEffect(() => {
    measure();
    const table = ref.current;
    if (!table || typeof ResizeObserver === "undefined") return undefined;
    // Column visibility changes and window resizes both move this number.
    const ro = new ResizeObserver(measure);
    ro.observe(table);
    return () => ro.disconnect();
  });

  return [ref, offset];
};

export default useStickyOffset;
