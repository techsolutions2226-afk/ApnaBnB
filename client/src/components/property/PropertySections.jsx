import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowRight, FiMapPin } from "react-icons/fi";
import "../../styles/PropertyCards.css";
import PropertySection from "./PropertySection";
import { SkeletonCard } from "../ui/Skeleton";
import propertyService from "../../services/propertyService";
import { cachedRequest } from "../../utils/requestCache";
import { planPropertyRows } from "../../utils/searchLocation";
import { CITY_CENTERS, SEARCH_CITIES, SEARCH_COUNTRY_CODE } from "../../config/locations";

const SKELETON_ROWS = 2;
const SKELETON_CARDS = 6;
const PLAN_OPTIONS = {
  centers: CITY_CENTERS,
  countryCode: SEARCH_COUNTRY_CODE,
  searchCities: SEARCH_CITIES,
};

function Notice({ children }) {
  return (
    <p className="flex items-center justify-center gap-2 py-12 text-center text-slate-500">
      <FiMapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/* ═════════════════════════════════════════════════════════
   PropertySections — the home page's "Popular homes in <city>" rows, for the
   visitor's detected location (see planPropertyRows for the rules):
     • location unknown                     → "No properties found" only
     • country with no listings (e.g. USA)  → "No properties found in <country>" only
     • own city without listings            → "No properties found in <city>",
                                              then that country's other cities
     • otherwise                            → own city, nearby, then the rest

   Skeleton rows stay up until both this page load's detection (`ready`) and
   the listings are in, so rows never appear in one order and then jump.
   ═════════════════════════════════════════════════════════ */
export default function PropertySections({ detected, ready = true }) {
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

  const plan = useMemo(
    () => planPropertyRows(detected, data.cities, PLAN_OPTIONS),
    [detected, data.cities],
  );

  // Listings could not be loaded at all: that says nothing about the
  // visitor's location, so show no message rather than a wrong one.
  if (data.status === "error") return null;
  const loading = !ready || data.status === "loading";

  let body;
  if (loading) {
    body = Array.from({ length: SKELETON_ROWS }).map((_, r) => (
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
    ));
  } else if (plan.kind === "undetected") {
    body = <Notice>{t("popular.noneForLocation")}</Notice>;
  } else if (plan.kind === "no-country") {
    body = <Notice>{t("popular.noneInPlace", { place: plan.country })}</Notice>;
  } else {
    body = (
      <>
        {plan.missingCity && (
          <p className="flex items-center gap-2 pt-6 text-slate-600">
            <FiMapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("popular.noneInPlace", { place: plan.missingCity })}</span>
          </p>
        )}
        {plan.rows.map((row) => (
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
    );
  }

  return (
    <section
      id="popular-homes"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12 sm:pb-16 scroll-mt-16"
      aria-busy={loading}
      aria-live="polite"
    >
      {body}
    </section>
  );
}
