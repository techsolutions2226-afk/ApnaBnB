import { useCallback, useEffect, useMemo, useState } from "react";

/* ─── useRowSelection ───
   Checkbox selection for an admin table.

   Scoped deliberately to the rows currently on screen. The header checkbox
   means "select the 15 rows I can see", never "select all 4,000 in the
   database" — selecting records you cannot see is how people bulk-delete
   things by accident.

   The selection is dropped whenever `rows` changes identity (a page change,
   a filter change, a refetch), because an id set that outlives the rows it
   came from will happily delete something the admin never looked at.

   Params:
     rows    — the array currently rendered
     getId   — (row) => stable id; defaults to the _id/id shape used across admin

   Returns:
     selected      — array of selected ids, in render order
     count         — selected.length
     isSelected    — (id) => bool
     toggle        — (id) => void
     toggleAll     — () => void, selects all visible or clears
     allSelected   — every visible row is selected (and there is at least one)
     someSelected  — a partial selection, for the header checkbox's indeterminate state
     clear         — () => void
*/
export const useRowSelection = (rows, getId = (r) => r._id || r.id) => {
  const [selectedSet, setSelectedSet] = useState(() => new Set());

  const ids = useMemo(() => (rows || []).map(getId).filter(Boolean), [rows, getId]);
  const idKey = ids.join("|");

  // New page / new filter / refetch => start clean.
  useEffect(() => {
    setSelectedSet((prev) => (prev.size ? new Set() : prev));
  }, [idKey]);

  const toggle = useCallback((id) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedSet((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }, [ids]);

  const clear = useCallback(() => setSelectedSet(new Set()), []);

  // Keep render order so "Delete 3 selected" matches what the eye scanned.
  const selected = useMemo(() => ids.filter((id) => selectedSet.has(id)), [ids, selectedSet]);

  return {
    selected,
    count: selected.length,
    isSelected: useCallback((id) => selectedSet.has(id), [selectedSet]),
    toggle,
    toggleAll,
    allSelected: ids.length > 0 && selected.length === ids.length,
    someSelected: selected.length > 0 && selected.length < ids.length,
    clear,
  };
};

export default useRowSelection;
