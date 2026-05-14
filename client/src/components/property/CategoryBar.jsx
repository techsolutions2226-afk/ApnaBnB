import { useRef, useState, useEffect } from "react";
import {
  FiGrid,
  FiTrendingUp,
  FiAward,
  FiStar,
  FiHome,
  FiKey,
  FiDollarSign,
  FiShield,
  FiTruck,
  FiSunrise,
  FiActivity,
  FiZap,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FaSwimmingPool, FaUmbrellaBeach } from "react-icons/fa";
import "../../styles/CategoryBar.css";

/* Map icon-name strings from categories.js to actual components */
const ICON_MAP = {
  FiGrid: FiGrid,
  FiTrendingUp: FiTrendingUp,
  FiAward: FiAward,
  FiStar: FiStar,
  FiHome: FiHome,
  FiKey: FiKey,
  FiDollarSign: FiDollarSign,
  FiShield: FiShield,
  FiTruck: FiTruck,
  FiSunrise: FiSunrise,
  FiActivity: FiActivity,
  FiZap: FiZap,
  FaSwimmingPool: FaSwimmingPool,
  FaUmbrellaBeach: FaUmbrellaBeach,
};

export default function CategoryBar({ categories, activeId, onSelect }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (el)
      el.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };

  return (
    <div className="cat-bar">
      {canScrollLeft && (
        <button
          className="cat-bar-arrow cat-bar-arrow--left"
          onClick={() => scroll("left")}
          aria-label="Scroll categories left"
        >
          <FiChevronLeft size={16} />
        </button>
      )}

      <div className="cat-bar-scroll" ref={scrollRef}>
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || FiGrid;
          const isActive = cat.id === activeId;
          return (
            <button
              key={cat.id}
              className={`cat-bar-item${isActive ? " cat-bar-item--active" : ""}`}
              onClick={() => onSelect(cat.id)}
            >
              <Icon size={24} />
              <span className="cat-bar-label">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          className="cat-bar-arrow cat-bar-arrow--right"
          onClick={() => scroll("right")}
          aria-label="Scroll categories right"
        >
          <FiChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
