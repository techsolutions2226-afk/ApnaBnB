import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useGoogleMap,
} from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../../hooks/useGoogleMapsLoader";

const PAKISTAN_CENTER = { lat: 30.3753, lng: 69.3451 };
const PAKISTAN_ZOOM = 5;

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
    return { lat: c.lat, lng: c.lng };
  }
  return null;
};

const formatPrice = (price) => {
  if (!price && price !== 0) return "—";
  return `PKR ${Number(price).toLocaleString()}`;
};

/* Fits the viewport to all markers once the map is ready. */
const FitBounds = ({ points }) => {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || !points.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p.coords));
    map.fitBounds(bounds);
  }, [map, points]);

  return null;
};

const PropertySearchMap = ({ properties = [], height = 600 }) => {
  const { isLoaded, loadError } = useGoogleMapsLoader();

  const [active, setActive] = useState(null); // property id with open InfoWindow

  const points = useMemo(
    () =>
      properties
        .map((p) => ({ property: p, coords: getCoords(p) }))
        .filter((x) => x.coords),
    [properties],
  );

  const center = points[0]?.coords || PAKISTAN_CENTER;

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
      {loadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#555",
            fontSize: 14,
            padding: 16,
            textAlign: "center",
          }}
        >
          Map failed to load. Check your Google Maps API key.
        </div>
      )}
      {!loadError && !isLoaded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#777",
            fontSize: 13,
          }}
        >
          Loading map…
        </div>
      )}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={PAKISTAN_ZOOM}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          <FitBounds points={points} />
          {points.map(({ property, coords }) => {
            const id = property._id || property.id;
            const cover = property.photos?.[0] || property.image;
            return (
              <Marker
                key={id}
                position={coords}
                onClick={() => setActive(id)}
              >
                {active === id && (
                  <InfoWindow onCloseClick={() => setActive(null)}>
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
                      <div
                        style={{
                          fontSize: 12,
                          color: "#717171",
                          marginBottom: 6,
                        }}
                      >
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
                  </InfoWindow>
                )}
              </Marker>
            );
          })}
        </GoogleMap>
      )}
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