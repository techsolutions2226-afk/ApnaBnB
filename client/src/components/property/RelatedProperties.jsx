/* ─── RelatedProperties — "similar properties" row on the detail page ───
   Renders the server's ranked list with the same PropertyCard used on Home
   and Search, so the cards, wishlist behaviour and price formatting stay
   identical everywhere and there is nothing extra to keep in sync.

   Renders nothing at all when there is no match: an empty "Similar
   properties" heading is worse than no section.
*/
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import propertyService from "../../services/propertyService";
import { cachedRequest } from "../../utils/requestCache";
import PropertyCard from "./PropertyCard";
import { SkeletonCard } from "../ui/Skeleton";

const SKELETON_COUNT = 4;

export default function RelatedProperties({ propertyId }) {
  const { t } = useTranslation("property");
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return undefined;

    let cancelled = false;
    setLoading(true);

    // Keyed by property id so navigating between listings does not reuse the
    // previous one's row (requestCache is shared across the app).
    cachedRequest(`properties/${propertyId}/related`, () =>
      propertyService.getRelated(propertyId),
    )
      .then((rows) => {
        if (!cancelled) setProperties(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        // A failed sidebar-style section must never break the page it sits on.
        if (!cancelled) setProperties([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Nothing to show and nothing still coming — render no section at all.
  if (!loading && properties.length === 0) return null;

  return (
    <section className="pd-card pd-related" aria-labelledby="pd-related-heading">
      <h2 className="pd-section-heading" id="pd-related-heading">
        {t("related.heading")}
      </h2>
      <p className="pd-related-sub">{t("related.subtitle")}</p>

      <div className="pd-related-grid">
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          : properties.map((p) => (
              <PropertyCard
                key={p._id || p.id}
                _id={p._id}
                id={p.id}
                title={p.title}
                photos={p.photos}
                location={p.location}
                price={p.price}
                rating={p.rating || 4.5}
                propertyType={p.propertyType}
                size={p.size}
                sizeUnit={p.sizeUnit}
                listedBy={p.listedBy}
                status={p.status}
                purpose={p.purpose}
              />
            ))}
      </div>
    </section>
  );
}
