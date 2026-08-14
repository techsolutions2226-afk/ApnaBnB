import { useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  useGoogleMap,
} from "@react-google-maps/api";
import { reverseGeocode } from "../../utils/geocode";

const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 }; // Lahore
const PICK_ZOOM = 14;

/** Re-centres the map when `center` changes (e.g. user picks a new city). */
const Recenter = ({ center, zoom }) => {
  const map = useGoogleMap();
  useEffect(() => {
    if (!map || !center) return;
    map.panTo(center);
    map.setZoom(zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
};

/* Click-to-place marker. Calls onPick({ lat, lng }) when the user clicks the map.
   Optional onAddressResolved({ city, area, displayName }) fires after reverse-geocoding. */
const LocationPicker = ({
  value,
  onPick,
  onAddressResolved,
  height = 320,
  defaultCenter,
  defaultZoom = 11,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  const [internal, setInternal] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const initialCenter = useMemo(() => {
    if (value?.lat && value?.lng) return { lat: value.lat, lng: value.lng };
    if (defaultCenter?.lat && defaultCenter?.lng) return defaultCenter;
    return DEFAULT_CENTER;
  }, [value, defaultCenter]);

  const marker = value?.lat && value?.lng ? value : internal;

  const handleClick = (e) => {
    const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setInternal(next);
    setMapCenter(next);
    onPick?.(next);
    // Fire-and-forget reverse geocode; failure is silent so the pick still succeeds.
    if (onAddressResolved) {
      reverseGeocode(next)
        .then((address) => onAddressResolved(address))
        .catch(() => {});
    }
  };

  return (
    <div
      style={{
        height,
        borderRadius: 12,
        overflow: "hidden",
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
          center={initialCenter}
          zoom={marker ? PICK_ZOOM : defaultZoom}
          onClick={handleClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          <Recenter
            center={
              mapCenter || marker || (defaultCenter?.lat ? defaultCenter : null)
            }
            zoom={marker ? PICK_ZOOM : defaultZoom}
          />
          {marker && <Marker position={marker} />}
        </GoogleMap>
      )}
    </div>
  );
};

export default LocationPicker;