import { useEffect, useRef } from "react";

/* ─── SelectCheckbox ───
   A row / header checkbox for admin tables.

   `indeterminate` is a DOM property, not an HTML attribute — React cannot set
   it declaratively, so it goes on via a ref. That is what gives the header its
   third state: a dash when some but not all visible rows are picked.
*/
const SelectCheckbox = ({ checked, indeterminate = false, onChange, label }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="adm-row-check"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      // Rows are clickable in places; don't let a tick bubble into the row.
      onClick={(e) => e.stopPropagation()}
    />
  );
};

export default SelectCheckbox;
