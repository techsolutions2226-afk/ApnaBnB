import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same marker-icon fix as LocationPicker (idempotent if applied twice).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PAKISTAN_CENTER = [30.3753, 69.3451];

/** Extract { lat, lng } from a property regardless of shape.
 *  Properties can store coords either flat on the object or nested under .location.coordinates. */
const getCoords = (p) => {
  const c = p?.location?.coordinates || p?.coordinates;
  if (
    c &&
    typeof c.lat === "number" &&
    typeof c.lng === "number" &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng)
  ) {
    return [c.lat, c.lng];
  }
  return null;
};

const formatPrice = (price) => {
  if (!price && price !== 0) return "—";
  return `PKR ${Number(price).toLocaleString()}`;
};

const PropertySearchMap = ({ properties = [], height = 600 }) => {
  const points = useMemo(
    () =>
      properties
        .map((p) => ({ property: p, coords: getCoords(p) }))
        .filter((x) => x.coords),
    [properties],
  );

  const center = points[0]?.coords || PAKISTAN_CENTER;
  const initialZoom = points.length > 0 ? 11 : 5;

  return (
    <div
      style={{
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #ebebeb",
        position: "relative",
      }}
    >
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map(({ property, coords }) => {
          const id = property._id || property.id;
          const cover = property.photos?.[0] || property.image;
          return (
            <Marker key={id} position={coords}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  {cover && (
                    <img
                      src={cover}
                      alt={property.title}
                      style={{
                        width: "100%",
                        height: 110,
                        objectFit: "cover",
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    />
                  )}
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {property.title || "Untitled property"}
                  </div>
                  <div style={{ fontSize: 12, color: "#717171", marginBottom: 6 }}>
                    {property.location?.area || property.area || ""}
                    {(property.location?.area || property.area) &&
                    (property.location?.city || property.city)
                      ? ", "
                      : ""}
                    {property.location?.city || property.city || ""}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    {formatPrice(property.price)}
                  </div>
                  <Link
                    to={`/property/${id}`}
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "#222",
                      color: "#fff",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: 13,
                    }}
                  >
                    View details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {points.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)",
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: 13,
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            color: "#555",
            zIndex: 1000,
          }}
        >
          No properties with map coordinates yet
        </div>
      )}
    </div>
  );
};

export default PropertySearchMap;
