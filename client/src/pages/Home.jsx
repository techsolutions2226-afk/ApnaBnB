import { useState, useMemo } from "react";
import categories from "../config/categories";
import CategoryBar from "../components/property/CategoryBar";
import PropertyCard from "../components/property/PropertyCard";
import Skeleton from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import { useProperties } from "../hooks/useProperties";
import { FiSearch } from "react-icons/fi";
import "../styles/PropertyCards.css";

const Home = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const { properties = [], isLoading, error } = useProperties();

  /* Find the active category's filter function */
  const filtered = useMemo(() => {
    const cat = categories.find((c) => c.id === activeCategory);
    if (!cat || cat.id === "all") return properties;
    return properties.filter(cat.filter);
  }, [activeCategory, properties]);

  return (
    <div className="home-page">
      <CategoryBar
        categories={categories}
        activeId={activeCategory}
        onSelect={setActiveCategory}
      />

      {isLoading ? (
        <div className="prop-grid-wrapper">
          <div className="prop-grid">
            <Skeleton count={8} />
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="prop-grid-wrapper">
          <div className="prop-grid">
            {filtered.map((p) => (
              <PropertyCard key={p._id || p.id || Math.random()} id={p._id || p.id} {...p} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<FiSearch />}
          title="No results"
          description="Try adjusting your search by selecting a different category."
          actionLabel="Clear category"
          onAction={() => setActiveCategory("all")}
        />
      )}
    </div>
  );
};

export default Home;
