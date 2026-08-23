import { useLayoutEffect, useRef, useState } from "react";
import { FiMaximize2 } from "react-icons/fi";

/* ─── TruncatedCell ───
   A table cell that clamps long text to one line with an ellipsis, and only
   offers a "show full value" control when the text is ACTUALLY cut off.

   The overflow check is measured, not guessed from a character count: at a
   given column width, "Islamabad" fits and "Flat 4B, Gulberg III, Lahore"
   does not, and a length threshold would get both wrong at some widths. The
   icon appearing therefore always means there is more to see.
*/
const TruncatedCell = ({ value, mono = false, onExpand, label }) => {
  const ref = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      // +1 absorbs sub-pixel rounding, which otherwise reports a false
      // overflow on text that fits exactly.
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
    };

    measure();

    // Column widths change when other columns are toggled or the window
    // resizes, so the check has to survive layout changes.
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);

  if (value === null || value === undefined || value === "") {
    return <span className="adm-muted">—</span>;
  }

  return (
    <div className="adm-trunc">
      <span
        ref={ref}
        className={`adm-trunc-text${mono ? " adm-trunc-text--mono" : ""}`}
        title={overflowing ? undefined : String(value)}
      >
        {value}
      </span>
      {overflowing && (
        <button
          type="button"
          className="adm-trunc-btn"
          onClick={() => onExpand({ label, value: String(value) })}
          title="Show full value"
          aria-label={`Show full ${label || "value"}`}
        >
          <FiMaximize2 size={12} />
        </button>
      )}
    </div>
  );
};

export default TruncatedCell;
