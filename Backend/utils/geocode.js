// Thin wrapper around the Google Maps Geocoding API. Used by propertyController to
// auto-populate location.coordinates when the client doesn't provide a pin.
//
// Uses Node's built-in fetch (Node 18+). Returns null on failure so callers can
// gracefully fall back to saving the property without coordinates.

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const geocodeAddress = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set — skipping geocoding.');
    return null;
  }
  if (!address || !address.trim()) return null;

  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Geocoding HTTP ${response.status} for "${address}"`);
      return null;
    }
    const data = await response.json();
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      console.warn(`Geocoding "${address}" returned status=${data.status}`);
      return null;
    }
    const loc = data.results[0].geometry?.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (error) {
    console.error('Geocoding request failed:', error.message);
    return null;
  }
};

module.exports = { geocodeAddress };
