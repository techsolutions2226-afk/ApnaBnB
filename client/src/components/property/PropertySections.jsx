import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowRight } from "react-icons/fi";
import "../../styles/PropertyCards.css";
import PropertySection from "./PropertySection";
import { SkeletonCard } from "../ui/Skeleton";
import propertyService from "../../services/propertyService";
import { cachedRequest } from "../../utils/requestCache";
import { orderByProximity } from "../../utils/searchLocation";
import { CITY_CENTERS } from "../../config/locations";

const SKELETON_ROWS = 2;
const SKELETON_CARDS = 6;

/* ═════════════════════════════════════════════════════════
   PropertySections — the home page's "Popular homes in <city>" rows.

   The server groups listings by city (most popular first inside each city);
   this orders the rows for the visitor with the same nearest-first rule as
   the search bar: their own city, nearby cities, then the rest by listing
   count. `origin` is null when the location is unknown, which leaves the
   most-listed cities first.

   Skeleton rows stay up until both the data and `ready` (the location
   default, see useSearchLocation) are in, so rows never appear in one order
   and then jump to another.
   ═════════════════════════════════════════════════════════ */
export default function PropertySections({ origin, ready = true }) {
  const { t } = useTranslation("home");
  const [data, setData] = useState({ status: "loading", cities: [] });

  useEffect(() => {
    let cancelled = false;
    cachedRequest("properties/popular-by-city", () => propertyService.getPopularByCity())
      .then((cities) => {
        if (!cancelled) setData({ status: "ok", cities: Array.isArray(cities) ? cities : [] });
      })
      .catch(() => {
        // A failed home section must never break the page it sits on.
        if (!cancelled) setData({ status: "error", cities: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      orderByProximity(data.cities, {
        nameOf: (row) => row.city,
        countOf: (row) => row.total,
        origin,
        centers: CITY_CENTERS,
      }),
    [data.cities, origin],
  );

  if (data.status === "error") return null;
  const loading = !ready || data.status === "loading";

  return (
    <section
      id="popular-homes"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12 sm:pb-16 scroll-mt-16"
      aria-busy={loading}
    >
      {loading ? (
        Array.from({ length: SKELETON_ROWS }).map((_, r) => (
          <div key={r} className="prop-section" aria-hidden="true">
            <div className="prop-section-header">
              <div className="h-6 w-56 max-w-[60%] rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="prop-row">
              {Array.from({ length: SKELETON_CARDS }).map((__, i) => (
                <div key={i} className="prop-card-link">
                  <SkeletonCard />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-500 py-12">{t("popular.empty")}</p>
      ) : (
        <>
          {rows.map((row) => (
            <PropertySection
              key={row.city}
              heading={t("popular.cityHeading", { city: row.city })}
              href={`/search?dest=${encodeURIComponent(row.city)}`}
              properties={row.properties}
            />
          ))}
          <div className="mt-8 flex justify-center">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              {t("popular.exploreAll")}
              <FiArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
