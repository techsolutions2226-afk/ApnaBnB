import { FiTrash2, FiX } from "react-icons/fi";

/* ─── BulkActionBar ───
   Appears only when something is selected, so the toolbar stays quiet in the
   normal case. Says exactly how many records are affected, because "Delete
   selected" alone is not enough information to confirm a destructive action.

   `actions` lets a page add its own buttons (e.g. Verify / Suspend on Users)
   without this component knowing anything about them.
*/
const BulkActionBar = ({
  count,
  noun = "item",
  onClear,
  onDelete,
  deleteLabel = "Delete selected",
  busy = false,
  actions = null,
}) => {
  if (!count) return null;

  const plural = count === 1 ? noun : `${noun}s`;

  return (
    <div className="adm-bulkbar" role="status" aria-live="polite">
      <span className="adm-bulkbar-count">
        <strong>{count}</strong> {plural} selected
      </span>

      <div className="adm-bulkbar-actions">
        {actions}
        {onDelete && (
          <button
            type="button"
            className="adm-btn adm-btn--danger adm-bulkbar-btn"
            onClick={onDelete}
            disabled={busy}
          >
            <FiTrash2 size={14} />
            {busy ? "Working…" : deleteLabel}
          </button>
        )}
        <button
          type="button"
          className="adm-bulkbar-clear"
          onClick={onClear}
          disabled={busy}
          title="Clear selection"
        >
          <FiX size={14} />
          Clear
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
