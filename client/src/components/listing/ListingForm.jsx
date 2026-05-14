/* ─── ListingForm — Shared form for Create & Edit Listing ───
   Used by CreateListing and EditListing pages.
   Receives initial values (for edit) or blank defaults (for create).
   Calls onSubmit(formData) on save.
   ─────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ImageUpload from "../common/ImageUpload";
import LocationPicker from "../common/LocationPicker";
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
  // Priority: resolved coords (city+area or just city) > known-city centre > LocationPicker fallback.
  const mapDefaultCenter =
    resolvedAreaCenter ||
    (form.city && form.city !== "Other" ? CITY_CENTERS[form.city] : null);
  // Zoom in tighter when we have an area match, looser for city-only.
  const mapDefaultZoom = effectiveArea && resolvedAreaCenter ? 14 : 11;

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
              type="number"
              className={fieldClass("lst-input", "price")}
              placeholder="e.g. 42000000"
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
              onBlur={() => handleBlur("price")}
              min="0"
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

        {/* Map pin (optional) */}
        <div className="lst-field">
          <label className="lst-label">
            Pin location on map
            <span className="lst-label-hint">(optional — click to drop a pin)</span>
          </label>
          <LocationPicker
            value={form.coordinates}
            onPick={(coords) => handleChange("coordinates", coords)}
            onAddressResolved={({ city, area }) => {
              // Only auto-fill blank fields — never overwrite a user choice.
              setForm((prev) => {
                const next = { ...prev };
                if (!prev.city && city) {
                  // Match against our known city list case-insensitively so the
                  // select can render the resolved value.
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
                  // Fall back to "Other" if the geocoded area isn't a known option
                  // — keeps the select valid and signals it was auto-resolved.
                  next.area = matchedArea || (areaOptions.includes("Other") ? "Other" : "");
                }
                return next;
              });
            }}
            defaultCenter={mapDefaultCenter}
            defaultZoom={mapDefaultZoom}
            height={300}
          />
          {form.coordinates && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                fontSize: 13,
                color: "#555",
              }}
            >
              <span>
                Lat: {form.coordinates.lat.toFixed(5)} · Lng: {form.coordinates.lng.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={() => handleChange("coordinates", null)}
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
