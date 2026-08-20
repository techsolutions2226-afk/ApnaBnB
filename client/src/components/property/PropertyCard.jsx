import { Link } from "react-router-dom";
import { AiFillStar } from "react-icons/ai";
import { FiHeart } from "react-icons/fi";
import { useWishlist } from "../../context/WishlistContext";

/* ─── Airbnb-style property card (Tailwind) ───
 *   Square rounded image → hover zoom · "Guest favorite" pill top-left ·
 *   heart top-right · content sits directly below with a bold title + rating
 *   on one row, muted location / availability lines, then price + "night".
 */
const formatLocation = (location) => {
  if (!location) return "";
  if (typeof location === "string") return location;
  return [location.area, location.city].filter(Boolean).join(", ");
};

const formatPrice = (price) => Number(price || 0).toLocaleString();

const formatRating = (rating) => {
  const v = Number(rating);
  if (!v) return "New";
  const s = v % 1 === 0 ? String(v) : v.toFixed(2).replace(/0$/, "");
  return s.replace(/\.$/, "");
};

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
  availability,
  status,
  purpose,
}) => {
  const actualId = id || _id;
  const { isWishlisted, toggleWishlist } = useWishlist();
  const saved = isWishlisted(actualId);

  // Availability label for cards. A rented-out rental shows "Rented", a sold
  // sale shows "Sold" (legacy rows where a rental was marked "sold" still read
  // as "Rented" via the purpose fallback).
  const statusLabel =
    status === "rented"
      ? "Rented"
      : status === "sold"
        ? purpose === "rent"
          ? "Rented"
          : "Sold"
        : null;

  const src =
    gallery && gallery.length > 0
      ? gallery[0]
      : photos && photos.length > 0
        ? photos[0]
        : image;

  const metaLine = [size ? `${size} ${sizeUnit || ""}` : null, propertyType]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group w-full min-w-0">
      <Link
        to={`/property/${actualId}`}
        aria-label={title}
        className="block"
      >
        {/* ── Image: square, rounded, hover zoom ── */}
        <div className="relative">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-neutral-200">
            {src ? (
              <img
                src={src}
                alt={title || "Property"}
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                No image
              </div>
            )}
          </div>

          {/* ── Sold / Rented overlay (unavailable properties) ── */}
          {statusLabel && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-black/25" />
              <span className="absolute left-4 top-4 z-10 rounded-full bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                {statusLabel}
              </span>
            </>
          )}

          {/* ── Top-left "Guest favorite" pill (hidden when Sold/Rented) ── */}
          {!statusLabel && isGuestFav && (
            <span className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-black shadow-sm">
              Guest favorite
            </span>
          )}

          {/* ── Top-right heart (dark stroke/drop shadow) ── */}
          <button
            type="button"
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(actualId);
            }}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full text-neutral-900 transition-transform duration-200 hover:scale-110"
          >
            <FiHeart
              className={`h-6 w-6 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)] ${
                saved ? "fill-red-500 text-red-500" : "fill-white text-neutral-700"
              }`}
            />
          </button>
        </div>

        {/* ── Content directly below the image ── */}
        <div className="mt-2.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-[15px] font-medium text-neutral-800">
              {title}
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-800">
              <AiFillStar className="h-[13px] w-[13px] text-neutral-800" />
              <span>{formatRating(rating)}</span>
            </div>
          </div>

          {formatLocation(location) && (
            <p className="mt-0.5 truncate text-sm text-neutral-500">
              {formatLocation(location)}
            </p>
          )}

          {(availability || metaLine) && (
            <p className="truncate text-sm text-neutral-500">
              {availability || metaLine}
            </p>
          )}

          <div className="mt-0.5 text-[15px]">
            <span className="font-semibold text-neutral-900">
              PKR {formatPrice(price)}
            </span>
            <span className="text-neutral-500"> night</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;