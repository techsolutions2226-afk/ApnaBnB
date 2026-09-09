import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import SearchFiltersModal from "../components/search/SearchFiltersModal";
import PropertySearchMap from "../components/search/PropertySearchMap";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import {
  FiSliders,
  FiX,
  FiChevronDown,
  FiSearch,
  FiMap,
  FiList,
} from "react-icons/fi";
import "../styles/SearchDropdowns.css";
import Seo from "../components/seo/Seo";
import { PAGE_SEO } from "../config/seo";

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
  plaza: "Plaza",
  "commercial-building": "Commercial Building",
  other: "Other",
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
  const computeResults = useCallback(
    (props, flt, srt) => {
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

      let result = [...props];

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
      if (flt.types.length > 0) {
        result = result.filter(
          (p) => flt.types.includes(p.propertyType)
        );
      }

      /* Price range */
      result = result.filter(
        (p) => p.price >= flt.minPrice && p.price <= flt.maxPrice
      );

      /* Bedrooms */
      if (flt.bedrooms > 0) {
        result = result.filter((p) => (p.bedrooms || 0) >= flt.bedrooms);
      }

      /* Amenities — guarded since backend Property model has no amenities field */
      if (flt.amenities.length > 0) {
        result = result.filter((p) =>
          Array.isArray(p.amenities) &&
          flt.amenities.every((a) => p.amenities.includes(a))
        );
      }

      /* Verified host */
      if (flt.superhost) {
        result = result.filter((p) => p.listedBy?.verified);
      }

      /* Sort */
      switch (srt) {
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
    },
    [dest, properties, purpose, activeType]
  );

  /* Applied results — respects the live `filters` + `sortBy`. */
  const filteredProperties = useMemo(
    () => computeResults(properties, filters, sortBy),
    [computeResults, filters, sortBy, properties]
  );

  /* Live count shown inside the filter modal while the user adjusts
     `pendingFilters`, before they click Apply. */
  const pendingCount = useMemo(
    () => computeResults(properties, pendingFilters, sortBy).length,
    [computeResults, pendingFilters, sortBy, properties]
  );

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

  const seoPreset =
    purpose === "sale"
      ? PAGE_SEO.sale
      : purpose === "rent"
        ? PAGE_SEO.rent
        : PAGE_SEO.search;

  const seoDescription = dest
    ? `Browse ${filteredProperties.length} properties in ${dest} on ApnaBnB.`
    : seoPreset.description;

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo
        title={dest ? `Properties in ${dest}` : seoPreset.title}
        description={seoDescription}
        path={location.pathname}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ═══ Top Bar: search summary + sort + filter button ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading tracking-tight">
              {purposeHeading}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProperties.length} listing{filteredProperties.length !== 1 ? "s" : ""}
              {filters.bedrooms > 0 && <> &middot; {filters.bedrooms}+ bedrooms</>}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* List / Map toggle */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-pressed={viewMode === "list"}
              >
                <FiList size={15} /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "map"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-pressed={viewMode === "map"}
              >
                <FiMap size={15} /> Map
              </button>
            </div>

            {/* Filter button */}
            <button
              className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors relative"
              onClick={openFilterModal}
              aria-label="Open filters"
            >
              <FiSliders size={15} />
              <span>Filters</span>
              {activeChips.filter((c) => c.key !== "dest" && c.key !== "guests").length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-primary-600 rounded-full">
                  {activeChips.filter((c) => c.key !== "dest" && c.key !== "guests").length}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                className="inline-flex items-center gap-1.5 h-10 px-3.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
                onClick={() => setSortOpen(!sortOpen)}
                aria-haspopup="true"
                aria-expanded={sortOpen}
              >
                <span className="sm:hidden">Sort</span>
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <FiChevronDown size={15} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1 animate-scale-in">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === opt.value
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
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

        {/* ═══ Property-type Category Bar ═══ */}
        {typeChips.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setActiveType("")}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-full border transition-colors ${
                activeType === ""
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              All
              <span className={activeType === "" ? "text-white/70" : "text-slate-400"}>
                {typeChips.reduce((s, c) => s + c.count, 0)}
              </span>
            </button>
            {typeChips.map(({ type, count }) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-full border transition-colors ${
                  activeType === type
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {TYPE_LABEL[type] || type}
                <span className={activeType === type ? "text-white/70" : "text-slate-400"}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ═══ Active Filter Chips ═══ */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-sm bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors"
                onClick={() => removeChip(chip.key)}
              >
                <span>{chip.label}</span>
                <FiX size={13} />
              </button>
            ))}
            {activeChips.length > 1 && (
              <button
                className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                onClick={clearAllFilters}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* ═══ Results: Map or List ═══ */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : viewMode === "map" ? (
          filteredProperties.length > 0 ? (
            <PropertySearchMap properties={filteredProperties} height={600} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
              <EmptyState
                icon={FiSearch}
                title="No exact matches"
                description="Try changing or removing some of your filters, or adjust your search area."
                actionLabel="Clear all filters"
                onAction={clearAllFilters}
              />
            </div>
          )
        ) : paginatedProperties.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {paginatedProperties.map((p) => (
              <PropertyCard
                key={p._id || p.id}
                id={p._id || p.id}
                {...p}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
            <EmptyState
              icon={FiSearch}
              title="No exact matches"
              description="Try changing or removing some of your filters, or adjust your search area."
              actionLabel="Clear all filters"
              onAction={clearAllFilters}
            />
          </div>
        )}

        {/* ═══ Pagination (list view only) ═══ */}
        {viewMode === "list" && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <button
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >
              &lsaquo;
            </button>
            {getPageNumbers().map((n) => (
              <button
                key={n}
                className={`inline-flex items-center justify-center h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === n
                    ? "bg-primary-600 text-white"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setCurrentPage(n)}
                aria-current={currentPage === n ? "page" : undefined}
              >
                {n}
              </button>
            ))}
            <button
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
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
          onClearTypes={() =>
            setPendingFilters((f) => ({ ...f, types: [] }))
          }
          onApply={applyFilters}
          totalCount={pendingCount}
        />
      </div>
    </div>
  );
};

export default SearchResults;
