import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Modal from "../ui/Modal";
import { PROPERTY_TABS } from "../../config/searchOptions";
import { AMENITY_GROUPS } from "../../config/amenities";

export default function SearchFiltersModal({
  isOpen,
  onClose,
  pendingFilters,
  onToggleType,
  onToggleAmenity,
  onSetMinPrice,
  onSetMaxPrice,
  onSetBedrooms,
  onToggleVerified,
  onClear,
  onClearTypes,
  onApply,
  totalCount,
}) {
  const [activeTypeTab, setActiveTypeTab] = useState(
    PROPERTY_TABS[0]?.id || "home"
  );
  const [amenityGroupIdx, setAmenityGroupIdx] = useState(0);

  const currentTab =
    PROPERTY_TABS.find((t) => t.id === activeTypeTab) || PROPERTY_TABS[0];

  const isTypeSelected = (value) =>
    value === "" ? false : pendingFilters.types.includes(value);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Filters"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            className="h-11 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            onClick={onClear}
          >
            Clear all
          </button>
          <button
            className="h-11 px-6 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
            onClick={onApply}
          >
            Show {totalCount} listing{totalCount !== 1 ? "s" : ""}
          </button>
        </div>
      }
    >
      {/* Property type — tabbed categories with sub-types (matches search bar) */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
          Property type
        </h4>

        {/* Category tabs: Homes | Plots | Commercial */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3">
          {PROPERTY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTypeTab(tab.id)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTypeTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-type grid for the active tab */}
        <div className="grid grid-cols-2 gap-2">
          {currentTab.options.map((opt) => {
            const isAll = opt.value === "";
            const selected = isAll ? false : isTypeSelected(opt.value);
            return (
              <button
                key={opt.label}
                className={`h-10 flex items-center gap-2 px-3 text-sm font-medium rounded-lg border transition-colors min-w-0 ${
                  selected
                    ? "bg-primary-50 text-primary-700 border-primary-500"
                    : "text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => (isAll ? onClearTypes() : onToggleType(opt.value))}
              >
                {opt.icon && <opt.icon className="h-4 w-4 shrink-0" />}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-100 my-5" />

      {/* Price range */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-0.5">
          Price range
        </h4>
        <p className="text-xs text-slate-400 mb-2.5">
          Total listing price in PKR
        </p>
        <div className="grid grid-cols-2 gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">
              Minimum
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 pointer-events-none">
                PKR
              </span>
              <input
                type="number"
                className="w-full h-10 pl-12 pr-3 text-sm rounded-lg bg-white text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                value={pendingFilters.minPrice}
                min={0}
                max={pendingFilters.maxPrice}
                onChange={onSetMinPrice}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">
              Maximum
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 pointer-events-none">
                PKR
              </span>
              <input
                type="number"
                className="w-full h-10 pl-12 pr-3 text-sm rounded-lg bg-white text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                value={pendingFilters.maxPrice}
                min={pendingFilters.minPrice}
                onChange={onSetMaxPrice}
              />
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-100 my-5" />

      {/* Bedrooms */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
          Bedrooms
        </h4>
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`h-9 px-3.5 text-sm font-medium rounded-lg border transition-colors ${
                pendingFilters.bedrooms === n
                  ? "bg-primary-50 text-primary-700 border-primary-500"
                  : "text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => onSetBedrooms(n)}
            >
              {n === 0 ? "Any" : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-slate-100 my-5" />

      {/* Amenities — carousel slider, same as Create Listing */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
          Amenities
        </h4>

        {(() => {
          const total = AMENITY_GROUPS.length;
          const group = AMENITY_GROUPS[amenityGroupIdx];
          const selectedInGroup = group.items.filter((a) =>
            pendingFilters.amenities.includes(a),
          ).length;
          return (
            <div className="relative px-12 sm:px-14">
              {/* Left arrow */}
              <button
                type="button"
                className="absolute top-[38%] left-0 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-colors z-[2]"
                onClick={() =>
                  setAmenityGroupIdx((i) => (i - 1 + total) % total)
                }
                aria-label="Previous group"
              >
                <FiChevronLeft size={22} />
              </button>

              {/* Right arrow */}
              <button
                type="button"
                className="absolute top-[38%] right-0 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-colors z-[2]"
                onClick={() => setAmenityGroupIdx((i) => (i + 1) % total)}
                aria-label="Next group"
              >
                <FiChevronRight size={22} />
              </button>

              {/* Slide card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 min-h-[260px]">
                {/* Title row */}
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3.5">
                  <h4 className="text-[13px] font-bold text-slate-600 uppercase tracking-wide m-0">
                    {group.label}
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {amenityGroupIdx + 1} / {total}
                    {selectedInGroup > 0 && (
                      <span className="text-primary-600 font-semibold">
                        {" "}
                        · {selectedInGroup} selected
                      </span>
                    )}
                  </span>
                </div>

                {/* Chips (same visual as Create Listing) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((a) => {
                    const selected = pendingFilters.amenities.includes(a);
                    return (
                      <label
                        key={a}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none min-w-0 ${
                          selected
                            ? "bg-primary-50 border-primary-500"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() => onToggleAmenity(a)}
                        />
                        <span
                          className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-colors ${
                            selected
                              ? "bg-primary-600 text-white"
                              : "bg-slate-200 text-slate-500"
                          }`}
                          aria-hidden="true"
                        >
                          {selected ? "✓" : "+"}
                        </span>
                        <span
                          className={`min-w-0 text-[13.5px] leading-tight ${
                            selected
                              ? "text-primary-700 font-semibold"
                              : "text-slate-700"
                          }`}
                        >
                          {a}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Dot pager */}
                <div className="flex justify-center gap-2 mt-4">
                  {AMENITY_GROUPS.map((g, i) => (
                    <button
                      key={g.label}
                      type="button"
                      aria-label={`Go to ${g.label}`}
                      onClick={() => setAmenityGroupIdx(i)}
                      className={`h-2 w-2 rounded-full transition-all p-0 cursor-pointer border-none ${
                        i === amenityGroupIdx
                          ? "bg-primary-600 scale-125"
                          : "bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <hr className="border-slate-100 my-5" />

      {/* Verified toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Verified listing
          </h4>
          <p className="text-xs text-slate-400">
            Only show verified sellers or dealers
          </p>
        </div>
        <button
          className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
            pendingFilters.superhost ? "bg-primary-600" : "bg-slate-300"
          }`}
          onClick={onToggleVerified}
          role="switch"
          aria-checked={pendingFilters.superhost}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              pendingFilters.superhost ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </Modal>
  );
}
