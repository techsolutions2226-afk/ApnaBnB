import { FiChevronRight, FiChevronLeft, FiArrowRight } from "react-icons/fi";
import PropertyCard from "./PropertyCard";

/* ─── Section Row with Scroll + Nav Arrows ─── */
const PropertySection = ({ heading, properties }) => {
  const rowId = `scroll-${heading.replace(/\s+/g, "-")}`;

  const scroll = (dir) => {
    const el = document.getElementById(rowId);
    if (el)
      el.scrollBy({ left: dir === "right" ? 900 : -900, behavior: "smooth" });
  };

  return (
    <div className="prop-section">
      <div className="prop-section-header">
        <h2 className="prop-section-title">
          {heading} <FiArrowRight size={18} className="prop-section-arrow" />
        </h2>
        <div className="prop-section-nav">
          <button className="prop-nav-btn" onClick={() => scroll("left")}>
            <FiChevronLeft size={18} />
          </button>
          <button className="prop-nav-btn" onClick={() => scroll("right")}>
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="prop-row" id={rowId}>
        {properties.map((p) => (
          <PropertyCard key={p.id} {...p} />
        ))}
      </div>
    </div>
  );
};

export default PropertySection;
