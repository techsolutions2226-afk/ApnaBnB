import Modal from "../common/Modal";

const PROPERTY_TYPES = ["House", "Apartment", "Plot"];

const AMENITY_FILTERS = [
  "Parking",
  "Security",
  "Garden",
  "Servant quarter",
  "Elevator",
  "Backup power",
  "Corner plot",
];

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
  onApply,
  totalCount,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filters" size="large">
      <div className="sr-fm-content">
        <div className="sr-fm-section">
          <h4 className="sr-fm-section-title">Property type</h4>
          <div className="sr-fm-type-grid">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t}
                className={`sr-fm-type-btn${pendingFilters.types.includes(t) ? " sr-fm-type-btn--active" : ""}`}
                onClick={() => onToggleType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <hr className="sr-fm-divider" />

        <div className="sr-fm-section">
          <h4 className="sr-fm-section-title">Price range</h4>
          <p className="sr-fm-section-desc">Total listing price in PKR</p>
          <div className="sr-fm-price-inputs">
            <div className="sr-fm-price-field">
              <label className="sr-fm-price-label">Minimum</label>
              <div className="sr-fm-price-input-wrap">
                <span className="sr-fm-price-sign">PKR</span>
                <input
                  type="number"
                  className="sr-fm-price-input"
                  value={pendingFilters.minPrice}
                  min={0}
                  max={pendingFilters.maxPrice}
                  onChange={onSetMinPrice}
                />
              </div>
            </div>
            <span className="sr-fm-price-dash">–</span>
            <div className="sr-fm-price-field">
              <label className="sr-fm-price-label">Maximum</label>
              <div className="sr-fm-price-input-wrap">
                <span className="sr-fm-price-sign">PKR</span>
                <input
                  type="number"
                  className="sr-fm-price-input"
                  value={pendingFilters.maxPrice}
                  min={pendingFilters.minPrice}
                  onChange={onSetMaxPrice}
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="sr-fm-divider" />

        <div className="sr-fm-section">
          <h4 className="sr-fm-section-title">Bedrooms</h4>
          <div className="sr-fm-bedroom-row">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={`sr-fm-bedroom-btn${pendingFilters.bedrooms === n ? " sr-fm-bedroom-btn--active" : ""}`}
                onClick={() => onSetBedrooms(n)}
              >
                {n === 0 ? "Any" : `${n}+`}
              </button>
            ))}
          </div>
        </div>

        <hr className="sr-fm-divider" />

        <div className="sr-fm-section">
          <h4 className="sr-fm-section-title">Amenities</h4>
          <div className="sr-fm-amenity-grid">
            {AMENITY_FILTERS.map((a) => (
              <label key={a} className="sr-fm-amenity-label">
                <input
                  type="checkbox"
                  className="sr-fm-amenity-check"
                  checked={pendingFilters.amenities.includes(a)}
                  onChange={() => onToggleAmenity(a)}
                />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="sr-fm-divider" />

        <div className="sr-fm-section">
          <label className="sr-fm-toggle-row">
            <div>
              <h4 className="sr-fm-section-title" style={{ marginBottom: 2 }}>
                Verified listing
              </h4>
              <p className="sr-fm-section-desc">
                Only show verified sellers or dealers
              </p>
            </div>
            <button
              className={`sr-fm-toggle${pendingFilters.superhost ? " sr-fm-toggle--active" : ""}`}
              onClick={onToggleVerified}
              role="switch"
              aria-checked={pendingFilters.superhost}
            >
              <span className="sr-fm-toggle-knob" />
            </button>
          </label>
        </div>
      </div>

      <div className="sr-fm-footer">
        <button className="sr-fm-clear" onClick={onClear}>
          Clear all
        </button>
        <button className="sr-fm-apply" onClick={onApply}>
          Show {totalCount} listing{totalCount !== 1 ? "s" : ""}
        </button>
      </div>
    </Modal>
  );
}
