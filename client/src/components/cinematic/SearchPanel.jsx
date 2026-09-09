import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiSearch, FiArrowRight, FiChevronDown, FiMapPin } from "react-icons/fi";
import SearchableList from "../search/dropdowns/SearchableList";
import TabbedGrid from "../search/dropdowns/TabbedGrid";
import RangeInputWithUnit from "../search/dropdowns/RangeInputWithUnit";
import BedCountPanel from "../search/dropdowns/BedCountPanel";
import {
  CITIES,
  PROPERTY_TABS,
  AREA_UNITS,
  CURRENCIES,
} from "../../config/searchOptions";

const CITY_OPTIONS = CITIES.map((c) => ({ value: c, label: c }));
const AREA_UNIT_OPTIONS = AREA_UNITS.map((u) => ({ value: u, label: u }));
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const TABS = [
  { id: "buy", label: "BUY" },
  { id: "rent", label: "RENT" },
];

const EASE = [0.22, 1, 0.36, 1];

/* ═════════════════════════════════════════════════════════
   SearchPanel — the functional marketplace search surface.
   Reused identically in the cinematic hero band (variant="card")
   and in the "Ready to find yours?" section below the walkthrough
   (variant="light"), so the hero→marketplace transition is seamless
   and every field keeps its existing behaviour (submitSearch → /sale,
   /rent with the same URL params the results page already reads).
   ═════════════════════════════════════════════════════════ */
export default function SearchPanel({
  variant = "card",
  tab,
  setTab,
  city,
  setCity,
  location,
  setLocation,
  propertyType,
  setPropertyType,
  propertyTab,
  setPropertyTab,
  area,
  setArea,
  maxArea,
  setMaxArea,
  areaUnit,
  setAreaUnit,
  beds,
  setBeds,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  currency,
  setCurrency,
  openField,
  setOpenField,
  searchExpanded,
  setSearchExpanded,
  submitSearch,
}) {
  const reduce = useReducedMotion();

  return (
    <div className={`search-panel search-panel--${variant}`}>
      {/* ── BUY / RENT toggle rail ── */}
      <div className="search-panel__toggle" role="group" aria-label="Buy or rent">
        <div className="search-toggle">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`search-toggle__btn ${
                tab === t.id ? "search-toggle__btn--active" : ""
              }`}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {tab === t.id && (
                <motion.span
                  layoutId={`search-toggle-pill-${variant}`}
                  className="search-toggle__pill"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className="search-toggle__label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Fields ── */}
      <form className="search-panel__fields" onSubmit={(e) => e.preventDefault()}>
        <div className="search-fields-row">
          <div className="search-cell search-cell--city">
            <SearchableList
              options={CITY_OPTIONS}
              value={city}
              onChange={setCity}
              placeholder="City"
              icon={FiMapPin}
              open={openField === "city"}
              onOpenChange={(o) => setOpenField(o ? "city" : null)}
            />
          </div>

          {searchExpanded ? (
            <div className="search-cell">
              <div className="search-input-wrap">
                <FiSearch className="search-input-ico" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  autoFocus
                  aria-label="Search by location"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="search-input-wrap search-input-wrap--button search-cell"
              onClick={() => setSearchExpanded(true)}
            >
              <FiSearch className="search-input-ico" />
              <span className="search-input-placeholder">
                {location || "Search by Location"}
              </span>
              <FiChevronDown className="search-input-chev" />
            </button>
          )}

          {!searchExpanded && (
            <button
              type="button"
              onClick={() => submitSearch()}
              className="search-cta"
            >
              Search
              <FiArrowRight className="search-cta__ico" />
            </button>
          )}
        </div>

        {/* ── Advanced row ── */}
        <AnimatePresence initial={false}>
          {searchExpanded && (
            <motion.div
              key="advanced"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.38, ease: EASE },
                opacity: { duration: 0.28, ease: EASE },
              }}
              className="search-advanced"
            >
              <div className="search-advanced__inner">
                <div>
                  <TabbedGrid
                    tabs={PROPERTY_TABS}
                    value={propertyType}
                    activeTab={propertyTab}
                    onTabChange={setPropertyTab}
                    onChange={(val, tabId) => {
                      setPropertyType(val);
                      setPropertyTab(tabId);
                    }}
                    open={openField === "propertyType"}
                    onOpenChange={(o) =>
                      setOpenField(o ? "propertyType" : null)
                    }
                  />
                </div>

                <div>
                  <RangeInputWithUnit
                    title="Area"
                    unit={areaUnit}
                    changeLabel="Area Unit"
                    modalTitle="Change Area"
                    unitOptions={AREA_UNIT_OPTIONS}
                    min={area}
                    max={maxArea}
                    onChange={({ min, max }) => {
                      setArea(min);
                      setMaxArea(max);
                    }}
                    onUnitChange={setAreaUnit}
                    open={openField === "area"}
                    onOpenChange={(o) => setOpenField(o ? "area" : null)}
                  />
                </div>

                <div>
                  <BedCountPanel
                    value={beds}
                    onChange={setBeds}
                    open={openField === "beds"}
                    onOpenChange={(o) => setOpenField(o ? "beds" : null)}
                  />
                </div>

                <div>
                  <RangeInputWithUnit
                    title="Price"
                    unit={currency}
                    changeLabel="Currency"
                    modalTitle="Change Currency"
                    unitOptions={CURRENCY_OPTIONS}
                    min={minPrice}
                    max={maxPrice}
                    onChange={({ min, max }) => {
                      setMinPrice(min);
                      setMaxPrice(max);
                    }}
                    onUnitChange={setCurrency}
                    open={openField === "price"}
                    onOpenChange={(o) => setOpenField(o ? "price" : null)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => submitSearch()}
                  className="search-cta search-cta--block"
                >
                  Search
                  <FiArrowRight className="search-cta__ico" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}