import { useEffect, useRef, useState } from "react";
import { FiColumns, FiCheck } from "react-icons/fi";

/* ─── ColumnPicker ───
   Dropdown for choosing which columns a wide table shows, grouped by area.

   The sticky column (Full Name) is deliberately not toggleable: it is the
   row's identity, and hiding it would leave an admin scrolling a wall of
   values with no idea whose they are.
*/
const ColumnPicker = ({ columns, visible, onChange, onReset }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click and on Escape — a panel this large is easy to
  // strand open otherwise.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = [...new Set(columns.map((c) => c.group))];

  const toggle = (key) => {
    onChange(
      visible.includes(key)
        ? visible.filter((k) => k !== key)
        : [...visible, key],
    );
  };

  const toggleGroup = (group) => {
    const keys = columns
      .filter((c) => c.group === group && !c.sticky)
      .map((c) => c.key);
    const allOn = keys.every((k) => visible.includes(k));
    onChange(
      allOn
        ? visible.filter((k) => !keys.includes(k))
        : [...new Set([...visible, ...keys])],
    );
  };

  return (
    <div className="adm-colpick" ref={ref}>
      <button
        type="button"
        className="adm-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <FiColumns size={15} />
        Columns
        <span className="adm-colpick-count">
          {visible.length}/{columns.length}
        </span>
      </button>

      {open && (
        <div className="adm-colpick-menu" role="dialog" aria-label="Choose columns">
          <div className="adm-colpick-head">
            <span>Show columns</span>
            <button type="button" className="adm-colpick-reset" onClick={onReset}>
              Reset
            </button>
          </div>

          <div className="adm-colpick-body">
            {groups.map((group) => {
              const groupCols = columns.filter((c) => c.group === group);
              return (
                <div key={group} className="adm-colpick-group">
                  <button
                    type="button"
                    className="adm-colpick-grouphead"
                    onClick={() => toggleGroup(group)}
                  >
                    {group}
                  </button>
                  {groupCols.map((col) => {
                    const on = visible.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className={`adm-colpick-item${col.sticky ? " adm-colpick-item--locked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={on || !!col.sticky}
                          disabled={!!col.sticky}
                          onChange={() => toggle(col.key)}
                        />
                        <span>{col.label}</span>
                        {col.sticky && (
                          <span className="adm-colpick-lock" title="Always shown">
                            <FiCheck size={11} /> pinned
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnPicker;
