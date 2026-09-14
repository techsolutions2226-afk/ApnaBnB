import { useRef } from "react";
import { Link } from "react-router-dom";
import { FiChevronRight, FiChevronLeft, FiArrowRight } from "react-icons/fi";
import PropertyCard from "./PropertyCard";

/* ─── One horizontally scrolling row of property cards ───
   Airbnb-style: heading (optionally a link to the full results), arrow
   buttons on wider screens, swipe on phones. Cards are the shared
   PropertyCard, sized by .prop-row .prop-card-link in PropertyCards.css. */
const PropertySection = ({ heading, properties, href }) => {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: (dir === "right" ? 1 : -1) * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const title = (
    <>
      {heading} <FiArrowRight size={18} className="prop-section-arrow" aria-hidden="true" />
    </>
  );

  return (
    <section className="prop-section" aria-label={heading}>
      <div className="prop-section-header">
        <h2 className="prop-section-title font-heading">
          {href ? (
            <Link to={href} className="inline-flex items-center gap-2">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <div className="prop-section-nav">
          <button type="button" className="prop-nav-btn" onClick={() => scroll("left")} aria-label="Scroll left">
            <FiChevronLeft size={18} />
          </button>
          <button type="button" className="prop-nav-btn" onClick={() => scroll("right")} aria-label="Scroll right">
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="prop-row" ref={rowRef}>
        {properties.map((p) => (
          <div key={p._id || p.id} className="prop-card-link">
            <PropertyCard {...p} rating={p.rating || 4.5} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default PropertySection;
