/* ─── ListingForm — Shared form for Create & Edit Listing ───
   Used by CreateListing and EditListing pages.
   Receives initial values (for edit) or blank defaults (for create).
   Calls onSubmit(formData) on save.
   ─────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { FiCrosshair } from "react-icons/fi";
import ImageUpload from "../common/ImageUpload";
import LocationPicker from "../common/LocationPicker";
import MapView from "../common/MapView";
import { forwardGeocode } from "../../utils/geocode";
import {
  loadListingDraft,
  saveListingDraft,
  clearListingDraft,
} from "../../utils/listingDraft";
import "../../styles/Listing.css";


/* ── Static Options ── */
const PROPERTY_TYPES = ["House", "Apartment", "Plot"];

const SIZE_UNITS = ["Marla", "Kanal", "sq ft"];

const CITIES = [
  "Lahore",
  "Islamabad",
  "Karachi",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Other",
];

// Area dropdown options keyed by city (proper case to match CITIES).
const AREAS_BY_CITY = {
  Lahore: [
    "Gulberg",
    "DHA",
    "Bahria Town",
    "Cantt",
    "Model Town",
    "Johar Town",
    "Wapda Town",
    "Faisal Town",
    "Garden Town",
    "Iqbal Town",
    "Other",
  ],
  Islamabad: [
    "F-6",
    "F-7",
    "F-8",
    "F-10",
    "F-11",
    "G-9",
    "G-10",
    "G-11",
    "E-7",
    "Bahria Town",
    "DHA",
    "PWD",
    "Other",
  ],
  Karachi: [
    "DHA",
    "Clifton",
    "Gulshan-e-Iqbal",
    "Bahria Town",
    "North Nazimabad",
    "PECHS",
    "Korangi",
    "Malir",
    "Other",
  ],
  Rawalpindi: [
    "Bahria Town",
    "DHA",
    "Saddar",
    "Westridge",
    "Chaklala",
    "Satellite Town",
    "Other",
  ],
  Faisalabad: [
    "Madina Town",
    "Jaranwala Road",
    "D-Ground",
    "Susan Road",
    "Peoples Colony",
    "Other",
  ],
  Multan: [
    "Bahria Town",
    "Cantt",
    "Gulgasht Colony",
    "New Multan",
    "Other",
  ],
  Peshawar: [
    "Hayatabad",
    "University Town",
    "Cantt",
    "Defence Colony",
    "Other",
  ],
  Quetta: ["Satellite Town", "Cantt", "Jinnah Town", "Brewery Road", "Other"],
};

// Map centre per city — used as the LocationPicker default when no pin yet.
const CITY_CENTERS = {
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Faisalabad: { lat: 31.4504, lng: 73.135 },
  Multan: { lat: 30.1575, lng: 71.5249 },
  Peshawar: { lat: 34.0151, lng: 71.5249 },
  Quetta: { lat: 30.1798, lng: 66.975 },
};

// Hand-tuned approximate centres for popular areas so picking an area zooms
// the map straight to that neighbourhood. Keyed as `${city}|${area}`.
const AREA_CENTERS = {
  "Lahore|Gulberg": { lat: 31.5169, lng: 74.345 },
  "Lahore|DHA": { lat: 31.4707, lng: 74.4022 },
  "Lahore|Bahria Town": { lat: 31.367, lng: 74.193 },
  "Lahore|Cantt": { lat: 31.5497, lng: 74.3833 },
  "Lahore|Model Town": { lat: 31.4793, lng: 74.3204 },
  "Lahore|Johar Town": { lat: 31.4697, lng: 74.2728 },
  "Lahore|Wapda Town": { lat: 31.4197, lng: 74.2789 },
  "Lahore|Faisal Town": { lat: 31.4848, lng: 74.3061 },
  "Lahore|Garden Town": { lat: 31.5089, lng: 74.3286 },
  "Lahore|Iqbal Town": { lat: 31.5061, lng: 74.2956 },

  "Islamabad|F-6": { lat: 33.7297, lng: 73.0857 },
  "Islamabad|F-7": { lat: 33.7167, lng: 73.0556 },
  "Islamabad|F-8": { lat: 33.7059, lng: 73.045 },
  "Islamabad|F-10": { lat: 33.6909, lng: 73.0144 },
  "Islamabad|F-11": { lat: 33.6804, lng: 72.9939 },
  "Islamabad|G-9": { lat: 33.6936, lng: 73.0331 },
  "Islamabad|G-10": { lat: 33.6772, lng: 73.0103 },
  "Islamabad|G-11": { lat: 33.6675, lng: 72.9883 },
  "Islamabad|E-7": { lat: 33.7382, lng: 73.0775 },
  "Islamabad|Bahria Town": { lat: 33.5311, lng: 73.0976 },
  "Islamabad|DHA": { lat: 33.5328, lng: 73.1492 },
  "Islamabad|PWD": { lat: 33.6066, lng: 73.1411 },

  "Karachi|DHA": { lat: 24.8, lng: 67.07 },
  "Karachi|Clifton": { lat: 24.815, lng: 67.024 },
  "Karachi|Gulshan-e-Iqbal": { lat: 24.9128, lng: 67.0903 },
  "Karachi|Bahria Town": { lat: 25.0117, lng: 67.3133 },
  "Karachi|North Nazimabad": { lat: 24.9344, lng: 67.0381 },
  "Karachi|PECHS": { lat: 24.8722, lng: 67.0508 },
  "Karachi|Korangi": { lat: 24.8492, lng: 67.1614 },
  "Karachi|Malir": { lat: 24.9, lng: 67.2 },

  "Rawalpindi|Bahria Town": { lat: 33.5311, lng: 73.0976 },
  "Rawalpindi|DHA": { lat: 33.5328, lng: 73.1492 },
  "Rawalpindi|Saddar": { lat: 33.5969, lng: 73.0464 },
  "Rawalpindi|Westridge": { lat: 33.585, lng: 73.0314 },
  "Rawalpindi|Chaklala": { lat: 33.5683, lng: 73.0539 },
  "Rawalpindi|Satellite Town": { lat: 33.6294, lng: 73.0664 },
};

const ALL_AMENITIES = [
  "Backup power",
  "Corner plot",
  "Elevator",
  "Garden",
  "Gym",
  "Parking",
  "Security",
  "Servant quarter",
  "Store room",
];

/* ── Default blank form state ── */
const EMPTY_FORM = {
  title: "",
  propertyType: "",
  price: "",
  size: "",
  sizeUnit: "Marla",
  city: "",
  // Free-text city — used only when `city === "Other"`.
  customCity: "",
  area: "",
  // Free-text area — used when `area === "Other"` (or city === "Other").
  customArea: "",
  bedrooms: "",
  bathrooms: "",
  description: "",
  amenities: [],
  images: [], // Changed from image/gallery to images array
  featured: false,
  coordinates: null, // { lat, lng } picked on the map (optional)
};

/* ── Validation ── */
const validate = (data) => {
  const errors = {};

  if (!data.title.trim()) errors.title = "Title is required";
  else if (data.title.trim().length < 10)
    errors.title = "Title must be at least 10 characters";
  if (!data.propertyType) errors.propertyType = "Select a property type";
  if (!data.price || Number(data.price) <= 0)
    errors.price = "Enter a valid price";
  if (!data.size || Number(data.size) <= 0) errors.size = "Enter a valid size";
  if (!data.sizeUnit) errors.sizeUnit = "Select a size unit";

  if (!data.city) {
    errors.city = "Select a city";
  } else if (data.city === "Other" && !data.customCity.trim()) {
    errors.customCity = "Enter your city";
  }

  // Area rules: if city is "Other", only customArea matters; otherwise the
  // dropdown must be set and — if "Other" was picked — customArea is required.
  if (data.city === "Other") {
    if (!data.customArea.trim()) errors.customArea = "Enter your area";
  } else if (data.city) {
    if (!data.area) errors.area = "Select an area";
    else if (data.area === "Other" && !data.customArea.trim())
      errors.customArea = "Enter your area";
  }

  if (!data.bedrooms || Number(data.bedrooms) < 0)
    errors.bedrooms = "Enter bedrooms count";
  if (!data.bathrooms || Number(data.bathrooms) < 0)
    errors.bathrooms = "Enter bathrooms count";

  if (!data.description.trim()) errors.description = "Description is required";
  else if (data.description.trim().length < 20)
    errors.description = "Description must be at least 20 characters";

  // Amenities — at least one must be picked.
  if (!Array.isArray(data.amenities) || data.amenities.length === 0) {
    errors.amenities = "Select at least one amenity";
  }

  // Images — at least one photo is required.
  if (!Array.isArray(data.images) || data.images.length === 0) {
    errors.images = "Upload at least one property image";
  }

  // Map pin — required so the property lands at the right spot on the map.
  if (
    !data.coordinates ||
    typeof data.coordinates.lat !== "number" ||
    typeof data.coordinates.lng !== "number"
  ) {
    errors.coordinates = "Drop a pin on the map for this property";
  }

  return errors;
};

/* Red asterisk indicator used on every required label. */
const Required = () => (
  <span style={{ color: "#d32f2f", marginLeft: 2 }} aria-hidden="true">
    *
  </span>
);

const ListingForm = ({
  initialData = null,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Create Listing",
  // When set (typically the current user's id), the create-listing flow
  // auto-saves form state to localStorage so a closed tab doesn't lose work.
  // Ignored when editing — that flow always seeds from the server.
  draftKey = null,
}) => {
  /* ── Merge initial data with defaults ── */
  const defaults = useMemo(() => {
    if (!initialData) return { ...EMPTY_FORM };

    // Convert old image/gallery format to new images array
    const images = [];
    if (initialData.image) {
      images.push({ url: initialData.image, isCover: true });
    }
    if (initialData.gallery && Array.isArray(initialData.gallery)) {
      initialData.gallery.forEach((url) => {
        if (url) images.push({ url });
      });
    }

    // Detect "unknown" city/area from existing data and route them into the
    // custom fields so the user can still edit the listing.
    const rawCity =
      initialData.city || initialData.location?.city || "";
    const rawArea =
      initialData.area || initialData.location?.area || "";

    let city = "";
    let customCity = "";
    if (rawCity) {
      if (CITIES.includes(rawCity)) {
        city = rawCity;
      } else {
        city = "Other";
        customCity = rawCity;
      }
    }

    let area = "";
    let customArea = "";
    if (rawArea) {
      if (city === "Other") {
        area = "Other";
        customArea = rawArea;
      } else if (city) {
        const knownAreas = AREAS_BY_CITY[city] || [];
        if (knownAreas.includes(rawArea)) {
          area = rawArea;
        } else {
          area = "Other";
          customArea = rawArea;
        }
      }
    }

    return {
      title: initialData.title || "",
      propertyType: initialData.propertyType || "",
      price: initialData.price ? String(initialData.price) : "",
      size: initialData.size ? String(initialData.size) : "",
      sizeUnit: initialData.sizeUnit || "Marla",
      city,
      customCity,
      area,
      customArea,
      bedrooms:
        initialData.bedrooms != null ? String(initialData.bedrooms) : "",
      bathrooms:
        initialData.bathrooms != null ? String(initialData.bathrooms) : "",
      description: initialData.description || "",
      amenities: initialData.amenities || [],
      images: images.length > 0 ? images : [],
      featured: initialData.featured != null ? initialData.featured : false,
      coordinates:
        initialData.coordinates ||
        initialData.location?.coordinates ||
        null,
    };
  }, [initialData]);

  // Only restore a draft for new listings (no initialData) and when a draftKey
  // was provided. Editing an existing listing always trumps any saved draft.
  const restoredDraft = useMemo(() => {
    if (initialData || !draftKey) return null;
    return loadListingDraft(draftKey);
  }, [initialData, draftKey]);

  const [form, setForm] = useState(() =>
    restoredDraft?.form ? { ...defaults, ...restoredDraft.form } : defaults,
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredDraft));
  // Coords resolved from (city, area) via Nominatim. Used to centre the map
  // when the user picks an area, before they drop a pin.
  const [resolvedAreaCenter, setResolvedAreaCenter] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  // How the user sets the map pin: "map" (click), "device" (geolocation), or "manual" (typed lat/lng).
  const [locationMode, setLocationMode] = useState("map");
  // Local string state for the manual lat/lng inputs so partial typing doesn't blow up form.coordinates.
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // Suppresses the first auto-save fire (which would just persist the initial
  // defaults / restored draft right back to where it came from).
  const skipFirstSaveRef = useRef(true);

  /* ── Auto-save draft on every form change (create flow only) ── */
  useEffect(() => {
    if (initialData || !draftKey) return;
    if (skipFirstSaveRef.current) {
      skipFirstSaveRef.current = false;
      return;
    }
    saveListingDraft(draftKey, form);
  }, [form, draftKey, initialData]);

  // Skip the first auto-fill fire so restored drafts / edit-mode initial data
  // don't get their coordinates clobbered on mount.
  const skipFirstAutoFillRef = useRef(true);

  // When the user picks a city + area we know, auto-fill the map pin to that
  // area's centre. The marker is green so it reads as a system suggestion.
  useEffect(() => {
    if (skipFirstAutoFillRef.current) {
      skipFirstAutoFillRef.current = false;
      return;
    }
    if (!form.city || form.city === "Other") return;
    if (!form.area || form.area === "Other") return;
    const center = AREA_CENTERS[`${form.city}|${form.area}`];
    if (!center) return;
    setForm((prev) => ({ ...prev, coordinates: center }));
    setErrors((prev) => {
      if (!prev.coordinates) return prev;
      const next = { ...prev };
      delete next.coordinates;
      return next;
    });
  }, [form.city, form.area]);

  const discardDraft = useCallback(() => {
    if (draftKey) clearListingDraft(draftKey);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setTouched({});
    setDraftRestored(false);
  }, [draftKey]);

  /* ── Available areas based on selected city ── */
  // No predefined areas for "Other" — we render a free-text input instead.
  const availableAreas =
    form.city && form.city !== "Other" ? AREAS_BY_CITY[form.city] || [] : [];

  /* ── Effective city + area (resolves "Other" to its custom text) ── */
  const effectiveCity =
    form.city === "Other" ? form.customCity.trim() : form.city;
  const effectiveArea =
    form.city === "Other" || form.area === "Other"
      ? form.customArea.trim()
      : form.area;

  /* ── Forward-geocode (area, city) so the map recenters when the user selects an area ── */
  useEffect(() => {
    // No city → nothing to resolve.
    if (!effectiveCity) {
      setResolvedAreaCenter(null);
      return;
    }
    let cancelled = false;
    // Query "area, city, Pakistan" if both, otherwise just "city, Pakistan".
    const query = effectiveArea
      ? `${effectiveArea}, ${effectiveCity}, Pakistan`
      : `${effectiveCity}, Pakistan`;
    forwardGeocode(query)
      .then((hit) => {
        if (cancelled || !hit) return;
        setResolvedAreaCenter({ lat: hit.lat, lng: hit.lng });
      })
      .catch(() => {
        if (!cancelled) setResolvedAreaCenter(null);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveCity, effectiveArea]);

  /* ── Effective default centre + zoom for the LocationPicker ── */
  // Priority: hardcoded area centre (instant) > Nominatim-resolved coords
  // (slower, network-bound) > known-city centre > LocationPicker fallback.
  const hardcodedAreaCenter =
    effectiveCity && effectiveArea
      ? AREA_CENTERS[`${effectiveCity}|${effectiveArea}`] || null
      : null;
  const mapDefaultCenter =
    hardcodedAreaCenter ||
    resolvedAreaCenter ||
    (form.city && form.city !== "Other" ? CITY_CENTERS[form.city] : null);
  const mapDefaultZoom =
    effectiveArea && (hardcodedAreaCenter || resolvedAreaCenter) ? 14 : 11;

  /* ── Handlers ── */
  const handleChange = useCallback(
    (field, value) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "city" && value !== prev.city) {
          // Always reset area + customArea when city changes.
          next.customArea = "";
          if (value === "Other") {
            // City is now free-text. Force area into "custom mode" so the input
            // appears, and clear the city dropdown's previous custom value
            // (user will type a new one).
            next.area = "Other";
          } else {
            // Switched to a known city — drop any free-text city; user must
            // pick an area from the dropdown.
            next.area = "";
            next.customCity = "";
          }
        }
        if (field === "area" && value !== "Other") {
          // Picked a known area — discard any free-text area.
          next.customArea = "";
        }
        return next;
      });
      /* Clear error on change */
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleAmenityToggle = useCallback((amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }, []);

  const handleToggleFeatured = useCallback(() => {
    setForm((prev) => ({ ...prev, featured: !prev.featured }));
  }, []);

  // Strip any non-digit chars (commas, spaces, letters) and store only digits
  // so the underlying value stays a clean integer. No upper cap on amount.
  const handlePriceChange = useCallback(
    (raw) => {
      const digits = raw.replace(/[^\d]/g, "");
      handleChange("price", digits);
    },
    [handleChange]
  );

  const handleApplyManualCoords = useCallback(() => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!manualLat.trim() || !manualLng.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Enter valid numbers for both latitude and longitude.");
      return;
    }
    if (lat < -90 || lat > 90) {
      toast.error("Latitude must be between -90 and 90.");
      return;
    }
    if (lng < -180 || lng > 180) {
      toast.error("Longitude must be between -180 and 180.");
      return;
    }
    setForm((prev) => ({ ...prev, coordinates: { lat, lng } }));
    setErrors((prev) => {
      if (!prev.coordinates) return prev;
      const next = { ...prev };
      delete next.coordinates;
      return next;
    });
    toast.success("Pin set from latitude/longitude");
  }, [manualLat, manualLng]);

  // When switching modes, sync the manual inputs from the current coordinates
  // so the user can see/edit whatever's already there.
  const handleModeChange = useCallback(
    (mode) => {
      setLocationMode(mode);
      if (mode === "manual" && form.coordinates) {
        setManualLat(String(form.coordinates.lat));
        setManualLng(String(form.coordinates.lng));
      }
    },
    [form.coordinates]
  );

  const handleFetchCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser does not support geolocation.");
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setForm((prev) => ({ ...prev, coordinates: coords }));
        setErrors((prev) => {
          if (!prev.coordinates) return prev;
          const next = { ...prev };
          delete next.coordinates;
          return next;
        });
        setIsFetchingLocation(false);
        toast.success("Location set from your device");
      },
      (err) => {
        setIsFetchingLocation(false);
        const msg =
          err.code === 1
            ? "Permission denied. Allow location access in your browser and try again."
            : err.code === 3
              ? "Timed out while fetching your location. Try again."
              : err.message || "Could not fetch your location.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  /* ── Submit ── */
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const validationErrors = validate(form);
      setErrors(validationErrors);

      /* Mark all as touched so errors show */
      const allTouched = {};
      Object.keys(EMPTY_FORM).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);

      if (Object.keys(validationErrors).length > 0) return;

      /* Build clean output — resolve "Other" placeholders to their custom text. */
      const finalCity =
        form.city === "Other" ? form.customCity.trim() : form.city;
      const finalArea =
        form.city === "Other" || form.area === "Other"
          ? form.customArea.trim()
          : form.area;

      const output = {
        title: form.title.trim(),
        propertyType: form.propertyType,
        price: Number(form.price),
        size: Number(form.size),
        sizeUnit: form.sizeUnit,
        city: finalCity,
        area: finalArea,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        description: form.description.trim(),
        amenities: form.amenities,
        images: form.images.map(img => img.url), // Extract URLs from image objects
        featured: form.featured,
        coordinates: form.coordinates, // null if not picked — backend geocodes from city/area
      };

      onSubmit(output);
    },
    [form, onSubmit],
  );

  /* ── Error display helper ── */
  const showError = (field) => touched[field] && errors[field];
  const fieldClass = (base, field) =>
    `${base}${showError(field) ? ` ${base}--error` : ""}`;

  return (
    <form className="lst-form" onSubmit={handleSubmit} noValidate>
      {/* ── Restored Draft Banner ── */}
      {draftRestored && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            background: "#fff8e1",
            border: "1px solid #f6c453",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, color: "#5d4200" }}>
            <strong>Draft restored.</strong>{" "}
            {restoredDraft?.savedAt && (
              <span style={{ color: "#7a6b3d" }}>
                Last edited{" "}
                {new Date(restoredDraft.savedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </span>
            )}{" "}
            Keep editing — we'll save as you go.
          </div>
          <button
            type="button"
            onClick={discardDraft}
            style={{
              padding: "6px 12px",
              background: "#fff",
              border: "1px solid #d9b75e",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              color: "#5d4200",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Discard draft
          </button>
        </div>
      )}

      {/* ── Basic Details ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Basic Details</h3>

        {/* Title */}
        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-title">
            Property Title
          </label>
          <input
            id="lst-title"
            type="text"
            className={fieldClass("lst-input", "title")}
            placeholder="e.g. 10 Marla House in Gulberg III"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            onBlur={() => handleBlur("title")}
          />
          {showError("title") && (
            <div className="lst-error">{errors.title}</div>
          )}
        </div>

        {/* Property Type + Price */}
        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-type">
              Property Type
            </label>
            <select
              id="lst-type"
              className={fieldClass("lst-select", "propertyType")}
              value={form.propertyType}
              onChange={(e) => handleChange("propertyType", e.target.value)}
              onBlur={() => handleBlur("propertyType")}
            >
              <option value="">Select type</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {showError("propertyType") && (
              <div className="lst-error">{errors.propertyType}</div>
            )}
          </div>

          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-price">
              Price
              <span className="lst-label-hint">(PKR)</span>
            </label>
            <input
              id="lst-price"
              type="text"
              inputMode="numeric"
              className={fieldClass("lst-input", "price")}
              placeholder="e.g. 42,000,000"
              value={form.price ? Number(form.price).toLocaleString("en-US") : ""}
              onChange={(e) => handlePriceChange(e.target.value)}
              onBlur={() => handleBlur("price")}
            />
            {showError("price") && (
              <div className="lst-error">{errors.price}</div>
            )}
          </div>
        </div>

        {/* Size + Size Unit */}
        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-size">
              Size
            </label>
            <input
              id="lst-size"
              type="number"
              className={fieldClass("lst-input", "size")}
              placeholder="e.g. 10"
              value={form.size}
              onChange={(e) => handleChange("size", e.target.value)}
              onBlur={() => handleBlur("size")}
              min="0"
            />
            {showError("size") && (
              <div className="lst-error">{errors.size}</div>
            )}
          </div>

          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-size-unit">
              Unit
            </label>
            <select
              id="lst-size-unit"
              className={fieldClass("lst-select", "sizeUnit")}
              value={form.sizeUnit}
              onChange={(e) => handleChange("sizeUnit", e.target.value)}
              onBlur={() => handleBlur("sizeUnit")}
            >
              {SIZE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {showError("sizeUnit") && (
              <div className="lst-error">{errors.sizeUnit}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Location ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Location</h3>

        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-city">
              City
            </label>
            <select
              id="lst-city"
              className={fieldClass("lst-select", "city")}
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              onBlur={() => handleBlur("city")}
            >
              <option value="">Select city</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {form.city === "Other" && (
              <input
                type="text"
                className={fieldClass("lst-input", "customCity")}
                placeholder="Enter your city"
                value={form.customCity}
                onChange={(e) => handleChange("customCity", e.target.value)}
                onBlur={() => handleBlur("customCity")}
                style={{ marginTop: 8 }}
              />
            )}
            {showError("city") && (
              <div className="lst-error">{errors.city}</div>
            )}
            {showError("customCity") && (
              <div className="lst-error">{errors.customCity}</div>
            )}
          </div>

          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-area">
              Area
            </label>
            {form.city === "Other" ? (
              // Custom city → free-text area only (no dropdown).
              <input
                id="lst-area"
                type="text"
                className={fieldClass("lst-input", "customArea")}
                placeholder="Enter your area / neighbourhood"
                value={form.customArea}
                onChange={(e) => handleChange("customArea", e.target.value)}
                onBlur={() => handleBlur("customArea")}
              />
            ) : (
              <select
                id="lst-area"
                className={fieldClass("lst-select", "area")}
                value={form.area}
                onChange={(e) => handleChange("area", e.target.value)}
                onBlur={() => handleBlur("area")}
                disabled={!form.city}
              >
                <option value="">
                  {form.city ? "Select area" : "Select city first"}
                </option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            )}
            {form.city !== "Other" && form.area === "Other" && (
              <input
                type="text"
                className={fieldClass("lst-input", "customArea")}
                placeholder="Enter your area / neighbourhood"
                value={form.customArea}
                onChange={(e) => handleChange("customArea", e.target.value)}
                onBlur={() => handleBlur("customArea")}
                style={{ marginTop: 8 }}
              />
            )}
            {showError("area") && (
              <div className="lst-error">{errors.area}</div>
            )}
            {showError("customArea") && (
              <div className="lst-error">{errors.customArea}</div>
            )}
          </div>
        </div>

        {/* Map pin — three input modes */}
        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-location-mode">
            How do you want to set the location?
          </label>
          <select
            id="lst-location-mode"
            className="lst-select"
            value={locationMode}
            onChange={(e) => handleModeChange(e.target.value)}
            style={{ marginBottom: 12 }}
          >
            <option value="map">Pick on map</option>
            <option value="device">Use my current location</option>
            <option value="manual">Enter latitude & longitude</option>
          </select>

          {/* Mode 1: Current device location */}
          {locationMode === "device" && (
            <div>
              <button
                type="button"
                onClick={handleFetchCurrentLocation}
                disabled={isFetchingLocation}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  border: "1px solid #222",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#222",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isFetchingLocation ? "wait" : "pointer",
                }}
              >
                <FiCrosshair size={16} />
                {isFetchingLocation ? "Fetching…" : "Fetch current location"}
              </button>
              <p style={{ fontSize: 12, color: "#717171", margin: "8px 0 0" }}>
                Reads your device GPS. Your browser will ask for permission the first time.
              </p>
            </div>
          )}

          {/* Mode 2: Click on map */}
          {locationMode === "map" && (
            <LocationPicker
              value={form.coordinates}
              onPick={(coords) => handleChange("coordinates", coords)}
              onAddressResolved={({ city, area }) => {
                setForm((prev) => {
                  const next = { ...prev };
                  if (!prev.city && city) {
                    const matched = CITIES.find(
                      (c) => c.toLowerCase() === String(city).toLowerCase(),
                    );
                    if (matched) next.city = matched;
                  }
                  if (!prev.area && next.city && area) {
                    const areaOptions = AREAS_BY_CITY[next.city] || [];
                    const matchedArea = areaOptions.find(
                      (a) => a.toLowerCase() === String(area).toLowerCase(),
                    );
                    next.area = matchedArea || (areaOptions.includes("Other") ? "Other" : "");
                  }
                  return next;
                });
              }}
              defaultCenter={mapDefaultCenter}
              defaultZoom={mapDefaultZoom}
              height={300}
            />
          )}

          {/* Mode 3: Manual lat / lng */}
          {locationMode === "manual" && (
            <div>
              <div className="lst-row" style={{ marginBottom: 10 }}>
                <div className="lst-field" style={{ margin: 0 }}>
                  <label className="lst-label" htmlFor="lst-manual-lat">
                    Latitude
                    <span className="lst-label-hint">(-90 to 90)</span>
                  </label>
                  <input
                    id="lst-manual-lat"
                    type="number"
                    step="any"
                    className="lst-input"
                    placeholder="e.g. 31.5204"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                  />
                </div>
                <div className="lst-field" style={{ margin: 0 }}>
                  <label className="lst-label" htmlFor="lst-manual-lng">
                    Longitude
                    <span className="lst-label-hint">(-180 to 180)</span>
                  </label>
                  <input
                    id="lst-manual-lng"
                    type="number"
                    step="any"
                    className="lst-input"
                    placeholder="e.g. 74.3587"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyManualCoords}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  border: "1px solid #222",
                  borderRadius: 8,
                  background: "#222",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Apply coordinates
              </button>
              <p style={{ fontSize: 12, color: "#717171", margin: "8px 0 0" }}>
                Tip: paste a "lat, lng" pair from Google Maps. Right-click any spot in Maps and copy the coordinates.
              </p>
            </div>
          )}

          {/* Map preview — shown in device/manual modes once coordinates are set.
              Map-mode already shows the LocationPicker map, so a second preview
              would be redundant there. */}
          {form.coordinates && locationMode !== "map" && (
            <div style={{ marginTop: 12 }}>
              <MapView coordinates={form.coordinates} height={280} zoom={16} />
            </div>
          )}

          {/* Picked-coordinates badge — shown for every mode once set */}
          {form.coordinates && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                padding: "8px 12px",
                background: "#f0f7ff",
                borderRadius: 8,
                fontSize: 13,
                color: "#1a4d8a",
                fontWeight: 500,
              }}
            >
              <span>
                ✓ Pinned at {form.coordinates.lat.toFixed(5)}, {form.coordinates.lng.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={() => {
                  handleChange("coordinates", null);
                  setManualLat("");
                  setManualLng("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: 13,
                }}
              >
                Clear pin
              </button>
            </div>
          )}
          {showError("coordinates") && (
            <div className="lst-error">{errors.coordinates}</div>
          )}
        </div>
      </div>

      {/* ── Property Details ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Property Details</h3>

        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-bedrooms">
              Bedrooms
            </label>
            <input
              id="lst-bedrooms"
              type="number"
              className={fieldClass("lst-input", "bedrooms")}
              placeholder="e.g. 4"
              value={form.bedrooms}
              onChange={(e) => handleChange("bedrooms", e.target.value)}
              onBlur={() => handleBlur("bedrooms")}
              min="0"
              max="20"
            />
            {showError("bedrooms") && (
              <div className="lst-error">{errors.bedrooms}</div>
            )}
          </div>

          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-bathrooms">
              Bathrooms
            </label>
            <input
              id="lst-bathrooms"
              type="number"
              className={fieldClass("lst-input", "bathrooms")}
              placeholder="e.g. 4"
              value={form.bathrooms}
              onChange={(e) => handleChange("bathrooms", e.target.value)}
              onBlur={() => handleBlur("bathrooms")}
              min="0"
              max="20"
            />
            {showError("bathrooms") && (
              <div className="lst-error">{errors.bathrooms}</div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-desc">
            Description
          </label>
          <textarea
            id="lst-desc"
            className={fieldClass("lst-textarea", "description")}
            placeholder="Describe your property — highlight key features, nearby landmarks, and what makes it special."
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            onBlur={() => handleBlur("description")}
          />
          {showError("description") && (
            <div className="lst-error">{errors.description}</div>
          )}
        </div>

        {/* Amenities */}
        <div className="lst-field">
          <label className="lst-label">Amenities</label>
          <div className="lst-amenities">
            {ALL_AMENITIES.map((amenity) => {
              const selected = form.amenities.includes(amenity);
              return (
                <label
                  key={amenity}
                  className={`lst-amenity${selected ? " lst-amenity--selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleAmenityToggle(amenity)}
                  />
                  {amenity}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Images ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Images</h3>

        {/* Image Upload Component */}
        <div className="lst-field">
          <ImageUpload
            images={form.images || []}
            onChange={(newImages) => handleChange("images", newImages)}
            maxImages={10}
            label="Property Images"
            helperText="Drag & drop images here or click to browse (Max 10)"
          />
        </div>
      </div>

      {/* ── Listing Options ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Listing Options</h3>

        <div className="lst-field">
          <div
            className="lst-toggle"
            onClick={handleToggleFeatured}
            role="switch"
            aria-checked={form.featured}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleFeatured();
              }
            }}
          >
            <div
              className={`lst-toggle-track${form.featured ? " lst-toggle-track--on" : ""}`}
            >
              <div className="lst-toggle-thumb" />
            </div>
            <div>
              <div className="lst-toggle-label">Featured Listing</div>
              <div className="lst-toggle-desc">
                Featured listings appear at the top of search results
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="lst-actions">
        <button
          type="submit"
          className="lst-btn lst-btn--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ListingForm;
