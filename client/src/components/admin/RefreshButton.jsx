import { FiRefreshCw } from "react-icons/fi";

/* Reusable admin "Refresh" button. Sits in each tab's header and re-runs that
   page's existing fetch without a full browser reload. The icon spins while a
   refresh is in flight, and the button is disabled to prevent double-fires.

   Props:
     onRefresh  — callback that re-fetches the current view
     refreshing — true while a fetch is in flight (spins + disables) */
const RefreshButton = ({ onRefresh, refreshing = false }) => (
  <button
    type="button"
    className="adm-refresh-btn"
    onClick={onRefresh}
    disabled={refreshing}
    title="Refresh"
    aria-label="Refresh"
  >
    <FiRefreshCw size={15} className={refreshing ? "adm-refresh-spin" : ""} />
    <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
  </button>
);

export default RefreshButton;
