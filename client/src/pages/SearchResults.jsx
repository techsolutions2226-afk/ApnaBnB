import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import SearchFiltersModal from "../components/search/SearchFiltersModal";
import PropertySearchMap from "../components/search/PropertySearchMap";
import Skeleton from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import {
  FiSliders,
  FiX,
  FiChevronDown,
  FiSearch,
  FiMap,
  FiList,
} from "react-icons/fi";
import "../styles/SearchResults.css";

/* ─── Constants ─── */
const PER_PAGE = 12;
const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

/* Pretty labels for the property-type pills that appear at the top of the
   results when a purpose is set. Keys match Property.propertyType enum values
   (kebab-case). */
const TYPE_LABEL = {
  house: "House",
  apartment: "Apartment",
  flat: "Flat",
  "upper-portion": "Upper Portion",
  "lower-portion": "Lower Portion",
  "farm-house": "Farm House",
  room: "Room",
  penthouse: "Penthouse",
  plot: "Plot",
  "residential-plot": "Residential Plot",
  "commercial-plot": "Commercial Plot",
  "agricultural-land": "Agricultural Land",
  "industrial-land": "Industrial Land",
  office: "Office",
  shop: "Shop",
  warehouse: "Warehouse",
  factory: "Factory",
  building: "Building",
};


/* ─── Search Results Page ─── */
const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { properties = [], isLoading, error } = useProperties();

  /* URL-synced state */
  const dest = searchParams.get("dest") || "";
  /* Purpose comes from the pathname (/sale, /rent) so the URL stays clean.
     Falls back to the legacy ?purpose= query param if someone arrives that way. */
  const purpose = useMemo(() => {
    if (location.pathname === "/sale") return "sale";
    if (location.pathname === "/rent") return "rent";
    return searchParams.get("purpose") || "";
  }, [location.pathname, searchParams]);

  /* Selected property-type chip from the category bar. Empty = "All". */
  const [activeType, setActiveType] = useState("");

  /* Reset the type chip whenever the URL purpose changes — moving between
     /sale and /rent shouldn't carry the old type filter across. */
  useEffect(() => {
    setActiveType("");
  }, [purpose]);

  /* Local filter/sort/page state */
  const [sortBy, setSortBy] = useState("recommended");
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"

  /* Filter state. URL-derived fields (bedrooms/minPrice/maxPrice/amenities)
     are synced from searchParams below; types/superhost stay client-only. */
  const [filters, setFilters] = useState(() => {
    const amStr = searchParams.get("amenities") || "";
    return {
      types: [],
      minPrice: parseInt(searchParams.get("minPrice") || "0", 10) || 0,
      maxPrice:
        parseInt(searchParams.get("maxPrice") || "0", 10) || 150000000,
      bedrooms:
        parseInt(
          searchParams.get("bedrooms") || searchParams.get("guests") || "0",
          10
        ) || 0,
      amenities: amStr ? amStr.split(",").filter(Boolean) : [],
      superhost: false,
    };
  });

  /* Re-sync URL-derived filter fields whenever the URL changes (e.g. user
     runs another search from the navbar while already on /search). Local
     fields (types, superhost) are preserved. */
  useEffect(() => {
    const amStr = searchParams.get("amenities") || "";
    setFilters((prev) => ({
      ...prev,
      minPrice: parseInt(searchParams.get("minPrice") || "0", 10) || 0,
      maxPrice:
        parseInt(searchParams.get("maxPrice") || "0", 10) || 150000000,
      bedrooms:
        parseInt(
          searchParams.get("bedrooms") || searchParams.get("guests") || "0",
          10
        ) || 0,
      amenities: amStr ? amStr.split(",").filter(Boolean) : [],
    }));
  }, [searchParams]);

  /* Pending filters (inside modal before applying) */
  const [pendingFilters, setPendingFilters] = useState({ ...filters });

    /* Reset page on filter/sort/query changes */
    useEffect(() => {
      setCurrentPage(1);
    }, [dest, purpose, activeType, sortBy, filters]);

  /* ── Filter + sort logic ── */
  const filteredProperties = useMemo(() => {
    // Build a single searchable string per property so the haystack matches
    // however the backend stores location (object `{ city, area }` from the
    // API, or legacy string from mock data).
    const haystack = (p) => {
      const loc = p.location;
      const locStr =
        typeof loc === "string"
          ? loc
          : loc && typeof loc === "object"
            ? [loc.city, loc.area].filter(Boolean).join(" ")
            : "";
      return `${p.title || ""} ${locStr}`.toLowerCase();
    };

    let result = [...properties];

    /* Purpose filter (sale vs rent). Properties without a `purpose` field
       default to "sale" — matches the Mongoose schema default. */
    if (purpose === "sale" || purpose === "rent") {
      result = result.filter((p) => (p.purpose || "sale") === purpose);
    }

    /* Property-type chip (from the category bar at the top of results). */
    if (activeType) {
      result = result.filter(
        (p) => (p.propertyType || "").toLowerCase() === activeType,
      );
    }

    /* Destination search — split on commas so e.g. "Rawalpindi, Pakistan"
       matches any property whose haystack contains "rawalpindi". */
    if (dest) {
      const tokens = dest
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (tokens.length > 0) {
        result = result.filter((p) => {
          const h = haystack(p);
          return tokens.some((t) => h.includes(t));
        });
      }
    }

    /* Property type */
    if (filters.types.length > 0) {
      result = result.filter((p) => filters.types.includes(p.propertyType));
    }

    /* Price range */
    result = result.filter(
      (p) => p.price >= filters.minPrice && p.price <= filters.maxPrice
    );

    /* Bedrooms */
    if (filters.bedrooms > 0) {
      result = result.filter((p) => (p.bedrooms || 0) >= filters.bedrooms);
    }

    /* Amenities — guarded since backend Property model has no amenities field */
    if (filters.amenities.length > 0) {
      result = result.filter((p) =>
        Array.isArray(p.amenities) &&
        filters.amenities.every((a) => p.amenities.includes(a))
      );
    }

    /* Verified host */
    if (filters.superhost) {
      result = result.filter((p) => p.listedBy?.verified);
    }

    /* Sort */
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        /* recommended — guest favs first, then by rating, then newest */
        result.sort((a, b) => {
          const favDiff = (b.isGuestFav ? 1 : 0) - (a.isGuestFav ? 1 : 0);
          if (favDiff !== 0) return favDiff;
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }

    return result;
  }, [dest, filters, sortBy, properties, purpose, activeType]);

  /* Pagination */
  const totalPages = Math.ceil(filteredProperties.length / PER_PAGE);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  /* ── Active filter chips ── */
  const activeChips = useMemo(() => {
    const chips = [];
    if (dest) chips.push({ key: "dest", label: `"${dest}"`, removable: true });
    filters.types.forEach((t) =>
      chips.push({ key: `type-${t}`, label: t, removable: true })
    );
    if (filters.minPrice > 0 || filters.maxPrice < 150000000)
      chips.push({
        key: "price",
        label: `PKR ${filters.minPrice.toLocaleString()}–${filters.maxPrice.toLocaleString()}`,
        removable: true,
      });
    if (filters.bedrooms > 0)
      chips.push({ key: "bedrooms", label: `${filters.bedrooms}+ bedrooms`, removable: true });
    filters.amenities.forEach((a) =>
      chips.push({ key: `amenity-${a}`, label: a, removable: true })
    );
    if (filters.superhost)
      chips.push({ key: "superhost", label: "Verified", removable: true });
    return chips;
  }, [dest, filters]);

  const removeChip = useCallback(
    (chipKey) => {
      const p = new URLSearchParams(searchParams);
      if (chipKey === "dest") {
        p.delete("dest");
        setSearchParams(p);
      } else if (chipKey.startsWith("type-")) {
        const t = chipKey.replace("type-", "");
        setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) }));
      } else if (chipKey === "price") {
        p.delete("minPrice");
        p.delete("maxPrice");
        setSearchParams(p);
      } else if (chipKey === "bedrooms") {
        p.delete("bedrooms");
        p.delete("guests");
        setSearchParams(p);
      } else if (chipKey.startsWith("amenity-")) {
        const a = chipKey.replace("amenity-", "");
        const remaining = filters.amenities.filter((x) => x !== a);
        if (remaining.length > 0) p.set("amenities", remaining.join(","));
        else p.delete("amenities");
        setSearchParams(p);
      } else if (chipKey === "superhost") {
        setFilters((f) => ({ ...f, superhost: false }));
      }
    },
    [searchParams, setSearchParams, filters.amenities]
  );

  const clearAllFilters = () => {
    setFilters((f) => ({ ...f, types: [], superhost: false }));
    const p = new URLSearchParams(searchParams);
    p.delete("dest");
    p.delete("guests");
    p.delete("bedrooms");
    p.delete("minPrice");
    p.delete("maxPrice");
    p.delete("amenities");
    setSearchParams(p);
  };

  /* ── Filter modal helpers ── */
  const openFilterModal = () => {
    setPendingFilters({ ...filters });
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...pendingFilters });
    setFilterModalOpen(false);
  };

  const togglePendingType = (t) => {
    setPendingFilters((f) => ({
      ...f,
      types: f.types.includes(t)
        ? f.types.filter((x) => x !== t)
        : [...f.types, t],
    }));
  };

  const togglePendingAmenity = (a) => {
    setPendingFilters((f) => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter((x) => x !== a)
        : [...f.amenities, a],
    }));
  };

  /* ── Page numbers for pagination ── */
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  /* Available property-type chips for the category bar. Computed from the
     *purpose-scoped* property list so users only see types that actually have
     listings under the current purpose (e.g. no "Plot" chip if there are zero
     plots for rent). Sorted by descending count. */
  const typeChips = useMemo(() => {
    const scope = purpose
      ? properties.filter((p) => (p.purpose || "sale") === purpose)
      : properties;
    const counts = new Map();
    for (const p of scope) {
      const t = (p.propertyType || "").toLowerCase();
      if (!t) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [properties, purpose]);

  const purposeHeading =
    purpose === "sale"
      ? "Properties For Sale"
      : purpose === "rent"
        ? "Properties For Rent"
        : dest
          ? `Properties in ${dest}`
          : "All properties";

  return (
    <div className="sr-wrapper">
      {/* ═══ Top Bar: search summary + sort + filter button ═══ */}
      <div className="sr-top-bar">
        <div className="sr-summary">
          <h1 className="sr-heading">{purposeHeading}</h1>
          <p className="sr-meta">
            {filteredProperties.length} listing{filteredProperties.length !== 1 ? "s" : ""}
            {filters.bedrooms > 0 && <> &middot; {filters.bedrooms}+ bedrooms</>}
          </p>
        </div>
        <div className="sr-actions">
          <div
            style={{
              display: "inline-flex",
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: viewMode === "list" ? "#222" : "#fff",
                color: viewMode === "list" ? "#fff" : "#222",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
              aria-pressed={viewMode === "list"}
            >
              <FiList size={16} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: viewMode === "map" ? "#222" : "#fff",
                color: viewMode === "map" ? "#fff" : "#222",
                border: "none",
                borderLeft: "1px solid #ddd",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
              aria-pressed={viewMode === "map"}
            >
              <FiMap size={16} /> Map
            </button>
          </div>
          <button className="sr-filter-btn" onClick={openFilterModal}>
            <FiSliders size={16} />
            <span>Filters</span>
            {activeChips.filter((c) => c.key !== "dest" && c.key !== "guests").length > 0 && (
              <span className="sr-filter-badge">
                {activeChips.filter((c) => c.key !== "dest" && c.key !== "guests").length}
              </span>
            )}
          </button>
          <div className="sr-sort-wrap">
            <button
              className="sr-sort-btn"
              onClick={() => setSortOpen(!sortOpen)}
            >
              <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</span>
              <FiChevronDown size={16} className={`sr-sort-chevron${sortOpen ? " sr-sort-chevron--open" : ""}`} />
            </button>
            {sortOpen && (
              <>
                <div className="sr-sort-backdrop" onClick={() => setSortOpen(false)} />
                <div className="sr-sort-dropdown">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`sr-sort-option${sortBy === opt.value ? " sr-sort-option--active" : ""}`}
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Property-type Category Bar — chips for every type that exists
            under the current purpose. Filters results when a chip is clicked. ═══ */}
      {typeChips.length > 0 && (
        <div className="sr-type-bar">
          <button
            type="button"
            onClick={() => setActiveType("")}
            className={`sr-type-chip${activeType === "" ? " sr-type-chip--active" : ""}`}
          >
            All
            <span className="sr-type-count">
              {typeChips.reduce((s, c) => s + c.count, 0)}
            </span>
          </button>
          {typeChips.map(({ type, count }) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`sr-type-chip${activeType === type ? " sr-type-chip--active" : ""}`}
            >
              {TYPE_LABEL[type] || type}
              <span className="sr-type-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══ Active Filter Chips ═══ */}
      {activeChips.length > 0 && (
        <div className="sr-chips">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              className="sr-chip"
              onClick={() => removeChip(chip.key)}
            >
              <span>{chip.label}</span>
              <FiX size={14} />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button className="sr-chip sr-chip--clear" onClick={clearAllFilters}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ═══ Results: Map or List ═══ */}
      {isLoading ? (
        <div className="sr-grid">
          <Skeleton count={8} />
        </div>
      ) : viewMode === "map" ? (
        filteredProperties.length > 0 ? (
          <PropertySearchMap properties={filteredProperties} height={600} />
        ) : (
          <EmptyState
            icon={<FiSearch size={48} />}
            title="No exact matches"
            description="Try changing or removing some of your filters, or adjust your search area."
            actionLabel="Clear all filters"
            onAction={clearAllFilters}
          />
        )
      ) : paginatedProperties.length > 0 ? (
        <div className="sr-grid">
          {paginatedProperties.map((p) => (
            <PropertyCard
              key={p._id || p.id}
              id={p._id || p.id}
              {...p}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FiSearch size={48} />}
          title="No exact matches"
          description="Try changing or removing some of your filters, or adjust your search area."
          actionLabel="Clear all filters"
          onAction={clearAllFilters}
        />
      )}

      {/* ═══ Pagination (list view only) ═══ */}
      {viewMode === "list" && totalPages > 1 && (
        <div className="sr-pagination">
          <button
            className="sr-page-btn sr-page-arrow"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            &lsaquo;
          </button>
          {getPageNumbers().map((n) => (
            <button
              key={n}
              className={`sr-page-btn${currentPage === n ? " sr-page-btn--active" : ""}`}
              onClick={() => setCurrentPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="sr-page-btn sr-page-arrow"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            &rsaquo;
          </button>
        </div>
      )}

      {/* ═══ Filter Modal ═══ */}
      <SearchFiltersModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        pendingFilters={pendingFilters}
        onToggleType={togglePendingType}
        onToggleAmenity={togglePendingAmenity}
        onSetMinPrice={(e) =>
          setPendingFilters((f) => ({
            ...f,
            minPrice: Math.max(0, parseInt(e.target.value) || 0),
          }))
        }
        onSetMaxPrice={(e) =>
          setPendingFilters((f) => ({
            ...f,
            maxPrice: Math.max(0, parseInt(e.target.value) || 0),
          }))
        }
        onSetBedrooms={(n) => setPendingFilters((f) => ({ ...f, bedrooms: n }))}
        onToggleVerified={() =>
          setPendingFilters((f) => ({ ...f, superhost: !f.superhost }))
        }
        onClear={() =>
          setPendingFilters({
            types: [],
            minPrice: 0,
            maxPrice: 150000000,
            bedrooms: 0,
            amenities: [],
            superhost: false,
          })
        }
        onApply={applyFilters}
        totalCount={filteredProperties.length}
      />
    </div>
  );
};

export default SearchResults;
