import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { reverseGeocode } from "../../utils/geocode";

// Leaflet's default marker icon paths break under Vite's bundler.
// Point them at the CDN copies of the asset files.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Green location pin — self-contained DivIcon so we don't have to ship a
// separate PNG asset. Used for the "selected area" marker.
const GREEN_PIN = L.divIcon({
  className: "lp-green-pin",
  html: `
    <div style="
      position: relative;
      width: 28px;
      height: 36px;
    ">
      <div style="
        position: absolute;
        top: 0;
        left: 2px;
        width: 24px;
        height: 24px;
        background: #16a34a;
        border: 3px solid #fff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      "></div>
      <div style="
        position: absolute;
        top: 7px;
        left: 11px;
        width: 6px;
        height: 6px;
        background: #fff;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 }; // Lahore

/** Re-centres the map when `center` changes (e.g. user picks a new city). */
const Recenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.setView([center.lat, center.lng], zoom ?? map.getZoom(), {
      animate: true,
    });
  }, [center, zoom, map]);
  return null;
};

/** Captures click events to drop a pin. */
const ClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
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
  const [internal, setInternal] = useState(null);

  const initialCenter = useMemo(() => {
    if (value?.lat && value?.lng) return { lat: value.lat, lng: value.lng };
    if (defaultCenter?.lat && defaultCenter?.lng) return defaultCenter;
    return DEFAULT_CENTER;
  }, [value, defaultCenter]);

  const marker = value?.lat && value?.lng ? value : internal;

  const handlePick = (next) => {
    setInternal(next);
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
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={marker ? 14 : defaultZoom}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={handlePick} />
        <Recenter
          center={marker || (defaultCenter?.lat ? defaultCenter : null)}
          zoom={marker ? 14 : defaultZoom}
        />
        {marker && (
          <Marker position={[marker.lat, marker.lng]} icon={GREEN_PIN} />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;
