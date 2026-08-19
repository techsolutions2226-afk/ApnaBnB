/* Read-only map using Google Maps JavaScript API.
   Requires VITE_GOOGLE_MAPS_API_KEY in .env.
   Pass `coordinates: { lat, lng }` to centre + place a marker. */

import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../../hooks/useGoogleMapsLoader";

const FALLBACK_CENTER = { lat: 30.3753, lng: 69.3451 }; // Pakistan
const FALLBACK_ZOOM = 5;

const MapView = ({ coordinates, zoom = 14, height = 360 }) => {
  const { isLoaded, loadError } = useGoogleMapsLoader();

  const hasCoords =
    coordinates &&
    typeof coordinates.lat === "number" &&
    typeof coordinates.lng === "number";

  const center = hasCoords ? coordinates : FALLBACK_CENTER;
  const mapZoom = hasCoords ? zoom : FALLBACK_ZOOM;

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
          zoom={mapZoom}
          options={{
            disableDefaultUI: false,
            fullscreenControl: true,
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {hasCoords && <Marker position={center} />}
        </GoogleMap>
      )}
    </div>
  );
};

export default MapView;