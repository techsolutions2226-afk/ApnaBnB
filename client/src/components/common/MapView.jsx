/* Read-only map using OpenStreetMap iframe embed.
   No API key, no SDK, no GCP config required.
   Pass `coordinates: { lat, lng }` to centre + place a marker. */

const FALLBACK_CENTER = { lat: 30.3753, lng: 69.3451 }; // Pakistan
const FALLBACK_DELTA = 6; // wide view when no coords supplied
const ZOOM_DELTA_BY_LEVEL = {
  10: 0.08,
  12: 0.04,
  14: 0.015,
  16: 0.005,
  18: 0.0015,
};

const MapView = ({ coordinates, zoom = 14, height = 360 }) => {
  const hasCoords =
    coordinates &&
    typeof coordinates.lat === "number" &&
    typeof coordinates.lng === "number";

  const { lat, lng } = hasCoords ? coordinates : FALLBACK_CENTER;
  const delta = hasCoords
    ? ZOOM_DELTA_BY_LEVEL[zoom] ?? 0.015
    : FALLBACK_DELTA;

  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join(",");

  const params = new URLSearchParams({
    bbox,
    layer: "mapnik",
  });
  if (hasCoords) params.set("marker", `${lat},${lng}`);

  const src = `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  const externalLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`
    : "https://www.openstreetmap.org/";

  return (
    <div
      style={{
        height,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        background: "#e8eef2",
      }}
    >
      <iframe
        title="Property location map"
        src={src}
        style={{ width: "100%", height: "100%", border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={externalLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          padding: "4px 10px",
          background: "rgba(255,255,255,0.92)",
          color: "#222",
          fontSize: 12,
          fontWeight: 500,
          textDecoration: "none",
          borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        View larger map
      </a>
    </div>
  );
};

export default MapView;
