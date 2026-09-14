/* ─── LocalProperties — "Properties in <city>" row on the home page ───
   Follows the home search's City (the visitor's detected default, or the city
   they picked), using the existing GET /api/properties?city= filter. Same
   PropertyCard and grid as "Popular Homes" below it, so nothing extra to keep
   in sync.

   Renders nothing when there is no city or no listing in it: an empty
   "Properties in Gilgit" heading is worse than no section.
*/
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProperties } from "../../hooks/useProperties";
import PropertyCard from "./PropertyCard";
import { SkeletonCard } from "../ui/Skeleton";

const LIMIT = 8;

function LocalPropertiesRow({ city }) {
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const { properties, isLoading, error } = useProperties({ city, page: 1, limit: LIMIT });

  if (error || (!isLoading && properties.length === 0)) return null;

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16"
      aria-labelledby="local-properties-heading"
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2
          id="local-properties-heading"
          className="text-xl sm:text-2xl font-bold text-slate-900 font-heading"
        >
          {t("local.heading", { city })}
        </h2>
        <button
          type="button"
          onClick={() => navigate(`/search?dest=${encodeURIComponent(city)}`)}
          className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t("local.viewAll")}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : properties.map((p) => (
              <PropertyCard key={p._id || p.id} {...p} rating={p.rating || 4.5} />
            ))}
      </div>
    </section>
  );
}

export default function LocalProperties({ city }) {
  if (!city) return null;
  // Keyed by city so switching cities starts from a clean loading state.
  return <LocalPropertiesRow key={city} city={city} />;
}
