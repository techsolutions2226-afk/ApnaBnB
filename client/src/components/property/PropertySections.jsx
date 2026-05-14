import { useMemo } from "react";
import "../../styles/PropertyCards.css";
import PropertySection from "./PropertySection";
import { useProperties } from "../../hooks/useProperties";

/* ─── Renders properties grouped by city as separate sections ─── */
const PropertySections = () => {
  const { properties = [], isLoading } = useProperties();

  const sections = useMemo(() => {
    const byCity = new Map();
    properties.forEach((p) => {
      const city = p.location?.city || p.city || "Other";
      if (!byCity.has(city)) byCity.set(city, []);
      byCity.get(city).push(p);
    });
    return Array.from(byCity.entries()).map(([city, props]) => ({
      heading: `Popular homes in ${city}`,
      properties: props,
    }));
  }, [properties]);

  if (isLoading) return null;

  return (
    <div className="prop-sections-wrapper">
      {sections.map((s, i) => (
        <PropertySection key={i} heading={s.heading} properties={s.properties} />
      ))}
    </div>
  );
};

export default PropertySections;
