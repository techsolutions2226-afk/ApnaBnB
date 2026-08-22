/* ─── PostRequirement — Post a property requirement ───
    Buyers post what they're looking for.
    Dealers post on behalf of their clients.
    Inputs mirror the dealer's Create-Listing form (cities/areas dropdowns,
    "Other" free-text fallback, map pin) so the two flows stay consistent.
    ─────────────────────────────────────────────── */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useViewRole from "../hooks/useViewRole";
import { toast } from "react-toastify";
import {
  FiCrosshair,
  FiChevronDown,
  FiCheck,
  FiHome,
  FiLayout,
  FiChevronsUp,
  FiChevronsDown,
  FiSunrise,
  FiColumns,
  FiLayers,
  FiBriefcase,
  FiTruck,
  FiFileText,
  FiFolder,
  FiShoppingBag,
  FiMonitor,
  FiTool,
  FiBox,
  FiGrid,
} from "react-icons/fi";
import requirementService from "../services/requirementService";
import LocationPicker from "../components/common/LocationPicker";
import MapView from "../components/common/MapView";
import Modal from "../components/common/Modal";
import { forwardGeocode, forwardGeocodeWithGoogle } from "../utils/geocode";
import {
  loadRequirementDraft,
  saveRequirementDraft,
  clearRequirementDraft,
} from "../utils/requirementDraft";
import "../styles/Requirement.css";
import "../styles/Listing.css"; /* category/subtype/unit-picker styles shared with Create Listing */
import "../styles/SearchDropdowns.css"; /* unit-picker modal option styles */

/* ── Static Options ── */
const URGENCY_OPTIONS = ["30 days", "45 days", "60 days", "90 days"];

// Buy vs rent — same two-option toggle as the Create Listing page.
const PURPOSES = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
];

// Top-level property category — drives which sub-types the user can pick.
// Mirrors the Create Listing form exactly so both pickers stay identical.
const CATEGORIES = [
  { value: "home", label: "Home", icon: "🏠" },
  { value: "plot", label: "Plot", icon: "📐" },
  { value: "commercial", label: "Commercial", icon: "🏢" },
];

// Sub-types per category (same values as listings — matchmaking compares
// propertyType verbatim, so a requirement must use the listing's kebab-case).
const SUBTYPES_BY_CATEGORY = {
  home: [
    { value: "house", label: "House", icon: FiHome },
    { value: "flat", label: "Flat", icon: FiLayout },
    { value: "upper-portion", label: "Upper Portion", icon: FiChevronsUp },
    { value: "lower-portion", label: "Lower Portion", icon: FiChevronsDown },
    { value: "farm-house", label: "Farm House", icon: FiSunrise },
    { value: "room", label: "Room", icon: FiColumns },
    { value: "penthouse", label: "Penthouse", icon: FiLayers },
  ],
  plot: [
    { value: "residential-plot", label: "Residential Plot", icon: FiHome },
    { value: "commercial-plot", label: "Commercial Plot", icon: FiBriefcase },
    { value: "agricultural-land", label: "Agricultural Land", icon: FiSunrise },
    { value: "industrial-land", label: "Industrial Land", icon: FiTruck },
    { value: "plot-form", label: "Plot Form", icon: FiFileText },
    { value: "plot-file", label: "Plot File", icon: FiFolder },
  ],
  commercial: [
    { value: "shop", label: "Shop", icon: FiShoppingBag },
    { value: "office", label: "Office", icon: FiMonitor },
    { value: "warehouse", label: "Warehouse", icon: FiBox },
    { value: "factory", label: "Factory", icon: FiTool },
    { value: "building", label: "Building", icon: FiHome },
    { value: "other", label: "Other", icon: FiGrid },
  ],
};

// Lookup the category that owns a given sub-type (for draft restore).
const CATEGORY_OF_SUBTYPE = Object.fromEntries(
  Object.entries(SUBTYPES_BY_CATEGORY).flatMap(([cat, list]) =>
    list.map((s) => [s.value, cat]),
  ),
);
// Legacy "Apartment" from the old requirement dropdown → Flat.
CATEGORY_OF_SUBTYPE.apartment = "home";

// Same unit picker as the Create Listing form.
const SIZE_UNITS = [
  { value: "Sq. Ft.", label: "Square Feet" },
  { value: "Sq. Yd.", label: "Square Yards" },
  { value: "Sq. M.", label: "Square Meters" },
  { value: "Marla", label: "Marla" },
  { value: "Kanal", label: "Kanal" },
];

// Map legacy units onto the new picker values.
const normalizeUnit = (unit) => (unit === "sq ft" ? "Sq. Ft." : unit || "Marla");

// Normalize a stored/draft propertyType onto the current subtype vocabulary so
// old "House"/"Apartment"/"Plot" drafts don't break the new card grid.
const normalizeRestoredType = (value) => {
  if (!value) return "";
  const v = String(value).toLowerCase();
  if (v === "apartment") return "flat";
  const known = Object.values(SUBTYPES_BY_CATEGORY)
    .flat()
    .map((s) => s.value);
  return known.includes(v) ? v : "";
};

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

const AREAS_BY_CITY = {
  Lahore: [
    "Gulberg", "DHA", "Bahria Town", "Cantt", "Model Town", "Johar Town",
    "Wapda Town", "Faisal Town", "Garden Town", "Iqbal Town", "Other",
  ],
  Islamabad: [
    "F-6", "F-7", "F-8", "F-10", "F-11", "G-9", "G-10", "G-11",
    "E-7", "Bahria Town", "DHA", "PWD", "Other",
  ],
  Karachi: [
    "DHA", "Clifton", "Gulshan-e-Iqbal", "Bahria Town", "North Nazimabad",
    "PECHS", "Korangi", "Malir", "Other",
  ],
  Rawalpindi: [
    "Bahria Town", "DHA", "Saddar", "Westridge", "Chaklala", "Satellite Town", "Other",
  ],
  Faisalabad: [
    "Madina Town", "Jaranwala Road", "D-Ground", "Susan Road", "Peoples Colony", "Other",
  ],
  Multan: ["Bahria Town", "Cantt", "Gulgasht Colony", "New Multan", "Other"],
  Peshawar: ["Hayatabad", "University Town", "Cantt", "Defence Colony", "Other"],
  Quetta: ["Satellite Town", "Cantt", "Jinnah Town", "Brewery Road", "Other"],
};

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
// Anything not in the table falls back to the city centre.
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

const EMPTY_FORM = {
  title: "",
  purpose: "sale",
  city: "",
  customCity: "",
  area: "",
  customArea: "",
  category: "home",
  propertyType: "",
  budgetMin: "",
  budgetMax: "",
  size: "",
  sizeUnit: "Marla",
  bedrooms: "",
  bathrooms: "",
  urgency: "",
  notes: "",
  coordinates: null,
};

/* ── Validation ── */
const validate = (data) => {
  const errors = {};

  if (!data.title.trim()) errors.title = "Title is required";
  else if (data.title.trim().length < 10)
    errors.title = "Title must be at least 10 characters";

  if (!data.propertyType) errors.propertyType = "Select a property type";
  else {
    // Subtype must belong to the chosen category (prevents bypass via stale state).
    const validForCategory = (SUBTYPES_BY_CATEGORY[data.category] || []).some(
      (s) => s.value === data.propertyType,
    );
    if (!validForCategory) errors.propertyType = "Pick a type for this category";
  }

  if (!data.city) errors.city = "Select a city";
  else if (data.city === "Other" && !data.customCity.trim())
    errors.customCity = "Enter your city";

  if (data.city === "Other") {
    if (!data.customArea.trim()) errors.customArea = "Enter your area";
  } else if (data.city) {
    if (!data.area) errors.area = "Select an area";
    else if (data.area === "Other" && !data.customArea.trim())
      errors.customArea = "Enter your area";
  }

  if (!data.budgetMin || Number(data.budgetMin) <= 0)
    errors.budgetMin = "Enter minimum budget";
  if (!data.budgetMax || Number(data.budgetMax) <= 0)
    errors.budgetMax = "Enter maximum budget";
  if (
    data.budgetMin &&
    data.budgetMax &&
    Number(data.budgetMin) >= Number(data.budgetMax)
  )
    errors.budgetMax = "Max budget must be greater than min";

  if (!data.size || !String(data.size).trim()) errors.size = "Enter preferred size";
  else if (Number(data.size) <= 0) errors.size = "Size must be greater than 0";
  if (!data.sizeUnit) errors.sizeUnit = "Select a size unit";
  if (!data.urgency) errors.urgency = "Select urgency";

  if (
    !data.coordinates ||
    typeof data.coordinates.lat !== "number" ||
    typeof data.coordinates.lng !== "number"
  ) {
    errors.coordinates = "Drop a pin on the map for your preferred location";
  }

  return errors;
};

const Required = () => (
  <span style={{ color: "#d32f2f", marginLeft: 2 }} aria-hidden="true">*</span>
);

const PostRequirement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* The hat the user is wearing in the dashboard — NOT their signup role.
     A buyer viewing as dealer posts a dealer requirement, and vice versa. */
  const { viewRole } = useViewRole();
  const isDealer = viewRole === "dealer";

  // Restore a previously-saved draft on mount (per user).
  const draftKey = currentUser?.id;
  const restoredDraft = useMemo(
    () => (draftKey ? loadRequirementDraft(draftKey) : null),
    [draftKey]
  );

  const [form, setForm] = useState(() => {
    if (!restoredDraft?.form) return EMPTY_FORM;
    const draft = restoredDraft.form;
    const propertyType = normalizeRestoredType(draft.propertyType);
    return {
      ...EMPTY_FORM,
      ...draft,
      category: draft.category || CATEGORY_OF_SUBTYPE[propertyType] || "home",
      propertyType,
      sizeUnit: normalizeUnit(draft.sizeUnit),
    };
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  // "Change Area" unit picker modal (Square Feet / Yards / Meters / Marla / Kanal).
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  // Mode-switching pin selector — same UX as the dealer's Create Listing form.
  const [locationMode, setLocationMode] = useState("map");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  // Nominatim-resolved centre for a free-text ("Other") city/area — lets the map
  // jump to a typed area instead of staying on the city centre.
  const [resolvedAreaCenter, setResolvedAreaCenter] = useState(null);

  // Skip the first auto-save fire (just-loaded state).
  const skipFirstSaveRef = useRef(true);
  // Skip the first auto-fill fire so a restored draft / known empty form
  // doesn't get its coordinates overwritten on mount.
  const skipFirstAutoFillRef = useRef(true);

  // When the user picks a city + area we know, auto-fill the map pin to that
  // area's centre. The picker marker is green so it reads as a system suggestion.
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
  useEffect(() => {
    if (!draftKey) return;
    if (skipFirstSaveRef.current) {
      skipFirstSaveRef.current = false;
      return;
    }
    saveRequirementDraft(draftKey, form);
  }, [form, draftKey]);

  const areaOptions = useMemo(() => {
    if (!form.city || form.city === "Other") return [];
    return AREAS_BY_CITY[form.city] || [];
  }, [form.city]);

  /* ── Effective city + area (resolves "Other" to its custom text) ── */
  const effectiveCity =
    form.city === "Other" ? form.customCity.trim() : form.city;
  const effectiveArea =
    form.city === "Other" || form.area === "Other"
      ? form.customArea.trim()
      : form.area;

  // When the user types a free-text area ("Other" in the dropdown), geocode
  // "<area>, <city>, Pakistan" and recentre the map there. Debounced so typing
  // doesn't hammer the geocoder on every keystroke. Prefers the already-loaded
  // Google Maps Geocoder (Nominatim can be blocked/rate-limited); falls back to
  // Nominatim only if Google isn't available.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!effectiveCity) {
        if (!cancelled) setResolvedAreaCenter(null);
        return;
      }
      const query = effectiveArea
        ? `${effectiveArea}, ${effectiveCity}, Pakistan`
        : `${effectiveCity}, Pakistan`;

      forwardGeocodeWithGoogle(query)
        .then((googleHit) => {
          if (cancelled) return;
          if (googleHit) {
            setResolvedAreaCenter({ lat: googleHit.lat, lng: googleHit.lng });
            return;
          }
          return forwardGeocode(query).then((hit) => {
            if (cancelled) return;
            setResolvedAreaCenter(hit ? { lat: hit.lat, lng: hit.lng } : null);
          });
        })
        .catch(() => {
          if (!cancelled) setResolvedAreaCenter(null);
        });
    }, effectiveArea ? 400 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveCity, effectiveArea]);

  /* ── Effective default centre + zoom for the LocationPicker ── */
  // Priority: hardcoded area centre (instant, no network) > Google/Nominatim-
  // resolved coords (for "Other" free-text areas/cities) > known-city centre.
  const hardcodedAreaCenter =
    effectiveCity && effectiveArea
      ? AREA_CENTERS[`${effectiveCity}|${effectiveArea}`] || null
      : null;

  const mapCenter = useMemo(() => {
    if (form.coordinates) return form.coordinates;
    if (!effectiveCity) return undefined;
    if (hardcodedAreaCenter) return hardcodedAreaCenter;
    if (effectiveArea && resolvedAreaCenter) return resolvedAreaCenter;
    if (CITY_CENTERS[effectiveCity]) return CITY_CENTERS[effectiveCity];
    return undefined;
  }, [form.coordinates, effectiveCity, effectiveArea, hardcodedAreaCenter, resolvedAreaCenter]);

  const mapZoom = useMemo(() => {
    const hasAreaCenter = Boolean(
      hardcodedAreaCenter || (effectiveArea && resolvedAreaCenter),
    );
    return hasAreaCenter ? 14 : 11;
  }, [effectiveArea, hardcodedAreaCenter, resolvedAreaCenter]);

  /* ── Handlers ── */
  const handleChange = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Switching category invalidates the previously-chosen subtype.
      if (field === "category" && value !== prev.category) {
        next.propertyType = "";
      }
      // Reset area when city changes — areas list depends on city.
      if (field === "city") {
        next.area = "";
        next.customArea = "";
        next.coordinates = null;
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleMapPick = useCallback((coords) => {
    setForm((prev) => ({ ...prev, coordinates: coords }));
    setErrors((prev) => {
      if (!prev.coordinates) return prev;
      const next = { ...prev };
      delete next.coordinates;
      return next;
    });
  }, []);

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

  const handleLocationModeChange = useCallback(
    (mode) => {
      setLocationMode(mode);
      if (mode === "manual" && form.coordinates) {
        setManualLat(String(form.coordinates.lat));
        setManualLng(String(form.coordinates.lng));
      }
    },
    [form.coordinates]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = validate(form);
      setErrors(validationErrors);

      const allTouched = {};
      Object.keys(EMPTY_FORM).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);

      if (Object.keys(validationErrors).length > 0) {
        toast.error("Please fix the errors above");
        return;
      }

      setIsSubmitting(true);

      try {
        const finalCity = form.city === "Other" ? form.customCity.trim() : form.city;
        const finalArea =
          form.city === "Other" || form.area === "Other"
            ? form.customArea.trim()
            : form.area;

        const requirementData = {
          title: form.title.trim(),
          purpose: form.purpose,
          location: {
            city: finalCity,
            area: finalArea,
            coordinates: form.coordinates,
          },
          budget: {
            min: Number(form.budgetMin),
            max: Number(form.budgetMax),
          },
          propertyType: form.propertyType,
          size: `${String(form.size).trim()} ${form.sizeUnit}`,
          bedrooms: Number(form.bedrooms) || undefined,
          bathrooms: Number(form.bathrooms) || undefined,
          notes: form.notes.trim() || undefined,
          urgency: form.urgency || undefined,
          // Role the user is acting as (from the dashboard selector). Backend
          // clamps to buyer|dealer; falls back to account role when absent.
          actingRole: viewRole,
        };

        await requirementService.create(requirementData);

        // Requirement committed to the server — drop the local draft.
        if (draftKey) clearRequirementDraft(draftKey);

        setIsSubmitting(false);
        toast.success("Requirement posted successfully!");
        navigate(`/dashboard/${viewRole}`);
      } catch (error) {
        setIsSubmitting(false);
        toast.error(error.message || "Failed to post requirement");
      }
    },
    [form, viewRole, navigate, draftKey]
  );

  /* ── Error helpers ── */
  const showError = (field) => touched[field] && errors[field];
  const fieldClass = (base, field) =>
    `${base}${showError(field) ? ` ${base}--error` : ""}`;

  return (
    <div className="req-page">
      {/* Breadcrumb */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link
          to={`/dashboard/${viewRole}`}
          className="dash-breadcrumb-link"
        >
          Dashboard
        </Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Post Requirement</span>
      </nav>

      <div className="req-header">
        <h1 className="req-title">Post a Requirement</h1>
        <p className="req-subtitle">
          {isDealer
            ? "Describe what your client is looking for — other dealers and sellers will see this."
            : "Tell us what you're looking for — dealers and sellers will reach out with matching properties."}
        </p>
      </div>

      <form className="req-form" onSubmit={handleSubmit} noValidate>
        {/* ── Purpose — buy vs rent (same two-option toggle as Create Listing) ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Purpose</h3>
          <p className="req-form-section-sub">
            Are you looking to buy or rent?
          </p>
          <div className="lst-purpose-row">
            {PURPOSES.map((p) => {
              const active = form.purpose === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleChange("purpose", p.value)}
                  className={`lst-purpose-card ${active ? "lst-purpose-card--active" : ""}`}
                >
                  <span className="lst-purpose-icon">
                    {p.value === "sale" ? "🏷️" : "🔑"}
                  </span>
                  <span className="lst-purpose-label">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── What are you looking for? ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">
            {isDealer ? "Client Requirement" : "What are you looking for?"}
          </h3>

          {/* Title */}
          <div className="req-field">
            <label className="req-label" htmlFor="req-title">
              Requirement Title<Required />
            </label>
            <input
              id="req-title"
              type="text"
              className={fieldClass("req-input", "title")}
              placeholder={
                isDealer
                  ? "e.g. Corporate client needs 4 Bed house"
                  : "e.g. 3 Bed family home near F-10"
              }
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
            />
            {showError("title") && <div className="req-error">{errors.title}</div>}
          </div>

          {/* Property Type — category cards + subtype grid (same as Create Listing) */}
          <div className="req-field">
            <label className="req-label">
              Property Type<Required />
            </label>
            <div className="lst-category-row">
              {CATEGORIES.map((c) => {
                const active = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleChange("category", c.value)}
                    className={`lst-category-card ${active ? "lst-category-card--active" : ""}`}
                  >
                    <span className="lst-category-icon">{c.icon}</span>
                    <span className="lst-category-label">{c.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="lst-subtype-grid">
              {(SUBTYPES_BY_CATEGORY[form.category] || []).map((s) => {
                const active = form.propertyType === s.value;
                const SIcon = s.icon;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleChange("propertyType", s.value)}
                    onBlur={() => handleBlur("propertyType")}
                    className={`lst-subtype-card ${active ? "lst-subtype-card--active" : ""}`}
                  >
                    {SIcon && (
                      <span className="lst-subtype-card-icon">
                        <SIcon size={16} />
                      </span>
                    )}
                    <span className="lst-subtype-card-label">{s.label}</span>
                  </button>
                );
              })}
            </div>
            {showError("propertyType") && (
              <div className="req-error">{errors.propertyType}</div>
            )}
          </div>

          {/* Preferred Size — value input + "Change Area" unit picker modal
              (same trigger/UX as the Create Listing page) */}
          <div className="req-field">
            <label className="req-label" htmlFor="req-size">
              Preferred Size<Required />
              <span className="req-label-hint">(value + unit)</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="req-size"
                type="number"
                step="any"
                min="0"
                className={fieldClass("req-input", "size")}
                placeholder="e.g. 10"
                value={form.size}
                onChange={(e) => handleChange("size", e.target.value)}
                onBlur={() => handleBlur("size")}
                style={{ flex: 2 }}
              />
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  className={`lst-unit-trigger${
                    showError("sizeUnit") ? " lst-unit-trigger--error" : ""
                  }`}
                  onClick={() => setUnitModalOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={unitModalOpen}
                >
                  <span className="lst-unit-trigger-value">
                    {form.sizeUnit || "Marla"}
                  </span>
                  <FiChevronDown className="abn-s2-chev" size={16} />
                </button>
              </div>
            </div>
            {showError("size") && <div className="req-error">{errors.size}</div>}
            {showError("sizeUnit") && <div className="req-error">{errors.sizeUnit}</div>}
          </div>
        </div>

        {/* ── Location ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Preferred Location</h3>

          <div className="req-row">
            <div className="req-field">
              <label className="req-label" htmlFor="req-city">
                City<Required />
              </label>
              <select
                id="req-city"
                className={fieldClass("req-select", "city")}
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                onBlur={() => handleBlur("city")}
              >
                <option value="">Select city</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {showError("city") && <div className="req-error">{errors.city}</div>}
            </div>

            {/* Custom city (only when city === "Other") */}
            {form.city === "Other" && (
              <div className="req-field">
                <label className="req-label" htmlFor="req-custom-city">
                  Enter City<Required />
                </label>
                <input
                  id="req-custom-city"
                  type="text"
                  className={fieldClass("req-input", "customCity")}
                  placeholder="Type your city"
                  value={form.customCity}
                  onChange={(e) => handleChange("customCity", e.target.value)}
                  onBlur={() => handleBlur("customCity")}
                />
                {showError("customCity") && (
                  <div className="req-error">{errors.customCity}</div>
                )}
              </div>
            )}
          </div>

          <div className="req-row">
            {/* Area dropdown only when a known city is selected */}
            {form.city && form.city !== "Other" && (
              <div className="req-field">
                <label className="req-label" htmlFor="req-area">
                  Preferred Area<Required />
                </label>
                <select
                  id="req-area"
                  className={fieldClass("req-select", "area")}
                  value={form.area}
                  onChange={(e) => handleChange("area", e.target.value)}
                  onBlur={() => handleBlur("area")}
                >
                  <option value="">Select area</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                {showError("area") && <div className="req-error">{errors.area}</div>}
              </div>
            )}

            {/* Custom area input — when city=Other OR area=Other */}
            {(form.city === "Other" || form.area === "Other") && (
              <div className="req-field">
                <label className="req-label" htmlFor="req-custom-area">
                  Enter Area<Required />
                </label>
                <input
                  id="req-custom-area"
                  type="text"
                  className={fieldClass("req-input", "customArea")}
                  placeholder="e.g. DHA Phase 5 / Gulberg"
                  value={form.customArea}
                  onChange={(e) => handleChange("customArea", e.target.value)}
                  onBlur={() => handleBlur("customArea")}
                />
                {showError("customArea") && (
                  <div className="req-error">{errors.customArea}</div>
                )}
              </div>
            )}
          </div>

          {/* Map pin — three input modes (same UX as Create Listing) */}
          <div className="req-field">
            <label className="req-label" htmlFor="req-location-mode">
              How do you want to set the location?<Required />
            </label>
            <select
              id="req-location-mode"
              className="req-select"
              value={locationMode}
              onChange={(e) => handleLocationModeChange(e.target.value)}
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
                onPick={handleMapPick}
                defaultCenter={mapCenter}
                defaultZoom={mapZoom}
                height={340}
              />
            )}

            {/* Mode 3: Manual lat / lng */}
            {locationMode === "manual" && (
              <div>
                <div className="req-row" style={{ marginBottom: 10 }}>
                  <div className="req-field" style={{ margin: 0 }}>
                    <label className="req-label" htmlFor="req-manual-lat">
                      Latitude
                      <span className="req-label-hint">(-90 to 90)</span>
                    </label>
                    <input
                      id="req-manual-lat"
                      type="number"
                      step="any"
                      className="req-input"
                      placeholder="e.g. 31.5204"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                    />
                  </div>
                  <div className="req-field" style={{ margin: 0 }}>
                    <label className="req-label" htmlFor="req-manual-lng">
                      Longitude
                      <span className="req-label-hint">(-180 to 180)</span>
                    </label>
                    <input
                      id="req-manual-lng"
                      type="number"
                      step="any"
                      className="req-input"
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

            {/* Map preview — shown in device/manual modes once coordinates are set */}
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
                  ✓ Pinned at {form.coordinates.lat.toFixed(5)},{" "}
                  {form.coordinates.lng.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, coordinates: null }));
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
              <div className="req-error">{errors.coordinates}</div>
            )}
          </div>
        </div>

        {/* ── Budget & Details ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Budget & Details</h3>

          <div className="req-field">
            <label className="req-label">
              Budget Range<Required />
              <span className="req-label-hint">(PKR)</span>
            </label>
            <div className="req-budget-row">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  className={fieldClass("req-input", "budgetMin")}
                  placeholder="Min (e.g. 18,000,000)"
                  value={
                    form.budgetMin
                      ? Number(form.budgetMin).toLocaleString("en-US")
                      : ""
                  }
                  onChange={(e) =>
                    handleChange("budgetMin", e.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={() => handleBlur("budgetMin")}
                />
                {showError("budgetMin") && (
                  <div className="req-error">{errors.budgetMin}</div>
                )}
              </div>
              <span className="req-budget-sep">to</span>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  className={fieldClass("req-input", "budgetMax")}
                  placeholder="Max (e.g. 26,000,000)"
                  value={
                    form.budgetMax
                      ? Number(form.budgetMax).toLocaleString("en-US")
                      : ""
                  }
                  onChange={(e) =>
                    handleChange("budgetMax", e.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={() => handleBlur("budgetMax")}
                />
                {showError("budgetMax") && (
                  <div className="req-error">{errors.budgetMax}</div>
                )}
              </div>
            </div>
          </div>

          <div className="req-row">
            <div className="req-field">
              <label className="req-label" htmlFor="req-bedrooms">
                Bedrooms
                <span className="req-label-hint">(optional)</span>
              </label>
              <input
                id="req-bedrooms"
                type="number"
                className="req-input"
                placeholder="e.g. 3"
                value={form.bedrooms}
                onChange={(e) => handleChange("bedrooms", e.target.value)}
                min="0"
                max="20"
              />
            </div>

            <div className="req-field">
              <label className="req-label" htmlFor="req-bathrooms">
                Bathrooms
                <span className="req-label-hint">(optional)</span>
              </label>
              <input
                id="req-bathrooms"
                type="number"
                className="req-input"
                placeholder="e.g. 3"
                value={form.bathrooms}
                onChange={(e) => handleChange("bathrooms", e.target.value)}
                min="0"
                max="20"
              />
            </div>
          </div>

          <div className="req-field">
            <label className="req-label">Timeline / Urgency<Required /></label>
            <div className="req-urgency-options">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`req-urgency-pill${form.urgency === opt ? " req-urgency-pill--selected" : ""}`}
                  onClick={() => handleChange("urgency", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {showError("urgency") && (
              <div className="req-error">{errors.urgency}</div>
            )}
          </div>
        </div>

        {/* ── Additional Notes ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Additional Notes</h3>

          <div className="req-field">
            <label className="req-label" htmlFor="req-notes">
              Notes
              <span className="req-label-hint">(optional — preferences, must-haves, etc.)</span>
            </label>
            <textarea
              id="req-notes"
              className="req-textarea"
              placeholder={
                isDealer
                  ? "e.g. Client is relocating. Need co-brokering partner. Standard commission split."
                  : "e.g. Close to schools and parks. Prefer corner plot. Must have verified documentation."
              }
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="req-actions">
          <button
            type="submit"
            className="req-btn req-btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post Requirement"}
          </button>
          <Link
            to={`/dashboard/${viewRole}`}
            className="req-btn req-btn--secondary"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* ── "Change Area" unit picker modal — identical to Create Listing ── */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title="Change Area"
        size="small"
      >
        <div className="dd-modal-list">
          {SIZE_UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              className={`dd-opt${form.sizeUnit === u.value ? " dd-opt--active" : ""}`}
              onClick={() => {
                handleChange("sizeUnit", u.value);
                handleBlur("sizeUnit");
                setUnitModalOpen(false);
              }}
            >
              <span className="dd-opt-label">{u.label}</span>
              {form.sizeUnit === u.value && (
                <FiCheck className="dd-opt-check" size={16} />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default PostRequirement;
