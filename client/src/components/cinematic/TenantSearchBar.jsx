import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import SearchableList from "../search/dropdowns/SearchableList";
import DateRangePanel from "../search/dropdowns/DateRangePanel";
import GuestCountPanel from "../search/dropdowns/GuestCountPanel";
import "../../styles/SearchModes.css";

/* ═════════════════════════════════════════════════════════
   TenantSearchBar — the rental row of the hero search:
   Where | When | Who | Search.
   Sits inside SearchPanel's existing .search-panel__fields pill, so the
   bar's width, height and position match the Buyer row exactly. All state
   lives in Home; Search calls the same submitSearch as Buyer.
   ═════════════════════════════════════════════════════════ */

const ACTIVE_LAYOUT_ID = "tenant-search-active";

export default function TenantSearchBar({
  cityOptions,
  city,
  setCity,
  stayDates,
  setStayDates,
  guests,
  setGuests,
  openField,
  setOpenField,
  submitSearch,
}) {
  const reduce = useReducedMotion();

  const sectionProps = (id) => ({
    open: openField === id,
    onOpenChange: (isOpen) => setOpenField(isOpen ? id : null),
    activeLayoutId: ACTIVE_LAYOUT_ID,
  });

  const cellClass = (id, name) =>
    `search-cell tsearch-cell tsearch-cell--${name}${
      openField === id ? " tsearch-cell--active" : ""
    }`;

  return (
    <div className="search-fields-row tsearch-row">
      <div className={cellClass("city", "where")}>
        <SearchableList
          options={cityOptions}
          value={city}
          onChange={setCity}
          label="Where"
          placeholder="Search destinations"
          {...sectionProps("city")}
        />
      </div>

      <div className={cellClass("dates", "when")}>
        <DateRangePanel
          checkIn={stayDates.checkIn}
          checkOut={stayDates.checkOut}
          onChange={setStayDates}
          {...sectionProps("dates")}
        />
      </div>

      <div className={cellClass("guests", "who")}>
        <GuestCountPanel
          value={guests}
          onChange={setGuests}
          {...sectionProps("guests")}
        />
      </div>

      <motion.button
        type="button"
        className="search-cta tsearch-cta"
        onClick={() => {
          setOpenField(null);
          submitSearch();
        }}
        whileHover={reduce ? undefined : { y: -1 }}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        Search
        <FiArrowRight className="search-cta__ico" />
      </motion.button>
    </div>
  );
}
