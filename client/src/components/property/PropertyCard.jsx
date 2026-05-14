import { Link } from "react-router-dom";
import { AiFillStar } from "react-icons/ai";
import ImageCarousel from "../common/ImageCarousel";
import { useWishlist } from "../../context/WishlistContext";

/* ─── Enhanced Property Card with carousel + wishlist ─── */
const PropertyCard = ({
  id,
  _id,
  image,
  photos,
  gallery,
  title,
  location,
  price,
  rating,
  isGuestFav,
  propertyType,
  size,
  sizeUnit,
  listedBy,
}) => {
  const actualId = id || _id;
  const { isWishlisted, toggleWishlist } = useWishlist();
  const saved = isWishlisted(actualId);

  /* Use gallery if available, fall back to photos from backend, then single image */
  const images = gallery?.length > 0 ? gallery : (photos?.length > 0 ? photos : [image]);

  return (
    <div className="prop-card">
      <Link to={`/property/${actualId}`} className="prop-card-link">
        <ImageCarousel
          images={images}
          alt={title}
          badge={isGuestFav ? "Guest favorite" : null}
          isWishlisted={saved}
          onWishlistToggle={() => toggleWishlist(actualId)}
        />
        <div className="prop-info">
          <div className="prop-top-row">
            <span className="prop-title">{title}</span>
            <span className="prop-rating">
              <AiFillStar size={13} /> {rating}
            </span>
          </div>
          {location && (
            <span className="prop-location">
              {typeof location === "object" 
                ? [location.area, location.city].filter(Boolean).join(", ") 
                : location}
            </span>
          )}
          <span className="prop-price">
            <strong>PKR {Number(price || 0).toLocaleString()}</strong>
            <span className="prop-meta">
              {propertyType ? ` · ${propertyType}` : ""}
              {size ? ` · ${size} ${sizeUnit || ""}` : ""}
            </span>
          </span>
          {listedBy && (
            <span className="prop-listed-by">
              Listed by {listedBy.role === "dealer" ? "Dealer" : "Owner"}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;
