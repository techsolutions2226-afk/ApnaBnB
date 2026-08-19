/* PropertyMessageCard — a shared-property message bubble body. Renders live
   from the referenced property (id-only stored in the message) and links to the
   property details page. */
import { FiArrowRight, FiMapPin } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "../../utils/formatters";

const PropertyMessageCard = ({ property, compact = false }) => {
  const navigate = useNavigate();
  if (!property) {
    return <div className="prop-card prop-card--gone">Property no longer available</div>;
  }

  const loc = [property.location?.area, property.location?.city].filter(Boolean).join(", ");
  const photo = property.photos?.[0];
  const title = property.title || "Untitled property";

  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/property/${property._id || property.id}`);
  };

  return (
    <div className={`prop-card ${compact ? "prop-card--compact" : ""}`} onClick={open} role="button" tabIndex={0}>
      {photo && <img src={photo} alt={title} className="prop-card-img" />}
      <div className="prop-card-body">
        <strong className="prop-card-title">{title}</strong>
        {loc && (
          <span className="prop-card-loc">
            <FiMapPin size={12} /> {loc}
          </span>
        )}
        <span className="prop-card-price">
          {property.price != null ? `PKR ${formatPrice(property.price)}` : "—"}
        </span>
        <span className="prop-card-link">
          View Property <FiArrowRight size={14} />
        </span>
      </div>
    </div>
  );
};

export default PropertyMessageCard;