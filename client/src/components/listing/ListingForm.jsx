/* ─── ListingForm — Shared form for Create & Edit Listing ───
   Used by CreateListing and EditListing pages.
   Receives initial values (for edit) or blank defaults (for create).
   Calls onSubmit(formData) on save.
   ─────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import {
  FiCrosshair,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiHome,
  FiGrid,
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
} from "react-icons/fi";
import ImageUpload from "../common/ImageUpload";
import VideoUpload from "../common/VideoUpload";
import LocationPicker from "../common/LocationPicker";
import MapView from "../common/MapView";
import Modal from "../common/Modal";
import { forwardGeocode } from "../../utils/geocode";
import { loadListingDraft, saveListingDraft } from "../../utils/listingDraft";
import { useAuth } from "../../context/AuthContext";
import { photoUrlToFormImage } from "../../utils/cloudinaryUrl";
import "../../styles/Listing.css";
import { CITIES, AREAS_BY_CITY } from "../../config/locations";
import AiDescriptionBadge from "../common/AiDescriptionBadge";
import { useAiDescription } from "../../hooks/useAiDescription";
import { AMENITY_GROUPS } from "../../config/amenities";
import {
  sanitizePkPhoneDigits,
  formatPkPhoneForApi,
  validatePhone,
  validateOptionalPhone,
  PK_PHONE_DIGITS,
} from "../../utils/signupValidation";

import { useTranslation } from "react-i18next";

/* Visual order — scroll/focus the first invalid field on submit. */
const FIELD_FOCUS_ORDER = [
  "propertyType",
  "title",
  "price",
  "securityDeposit",
  "leaseTerm",
  "size",
  "sizeUnit",
  "city",
  "customCity",
  "area",
  "customArea",
  "coordinates",
  "bedrooms",
  "bathrooms",
  "amenities",
  "contactName",
  "contactEmail",
  "contactPhone",
  "contactWhatsapp",
  "contactAltPhone",
  "images",
  "videoUrl",
  "description",
  "notes",
];

const FIELD_FOCUS_IDS = {
  propertyType: "lst-property-type",
  title: "lst-title",
  price: "lst-price",
  securityDeposit: "lst-security-deposit",
  leaseTerm: "lst-lease-term",
  size: "lst-size",
  sizeUnit: "lst-size-unit",
  city: "lst-city",
  customCity: "lst-custom-city",
  area: "lst-area",
  customArea: "lst-custom-area",
  coordinates: "lst-coordinates",
  bedrooms: "lst-bedrooms",
  bathrooms: "lst-bathrooms",
  amenities: "lst-amenities",
  contactName: "lst-contact-name",
  contactEmail: "lst-contact-email",
  contactPhone: "lst-contact-phone",
  contactWhatsapp: "lst-contact-wa",
  contactAltPhone: "lst-contact-alt",
  images: "lst-images",
  videoUrl: "lst-video",
  description: "lst-description",
  notes: "lst-notes",
};

const focusFirstInvalid = (errorMap) => {
  const first = FIELD_FOCUS_ORDER.find((f) => errorMap[f]);
  if (!first) return;
  const el = document.getElementById(FIELD_FOCUS_IDS[first]);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof el.focus === "function") {
    requestAnimationFrame(() => {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    });
  }
};
/* ── Static Options ── */
// Top-level property category — drives which sub-types the user can pick.
const CATEGORIES = [
  { value: "home", labelKey: "options.category.home", icon: "🏠" },
  { value: "plot", labelKey: "options.category.plot", icon: "📐" },
  { value: "commercial", labelKey: "options.category.commercial", icon: "🏢" },
];

// Sub-types per category. Stored on the property as `propertyType` (kebab-case).
// Icons mirror the search bar's PROPERTY_TABS so the two pickers stay identical.
const SUBTYPES_BY_CATEGORY = {
  home: [
    { value: "house", labelKey: "options.propertyType.house", icon: FiHome },
    { value: "flat", labelKey: "options.propertyType.flat", icon: FiLayout },
    { value: "upper-portion", labelKey: "options.propertyType.upperPortion", icon: FiChevronsUp },
    { value: "lower-portion", labelKey: "options.propertyType.lowerPortion", icon: FiChevronsDown },
    { value: "farm-house", labelKey: "options.propertyType.farmHouse", icon: FiSunrise },
    { value: "room", labelKey: "options.propertyType.room", icon: FiColumns },
    { value: "penthouse", labelKey: "options.propertyType.penthouse", icon: FiLayers },
  ],
  plot: [
    { value: "residential-plot", labelKey: "options.propertyType.residentialPlot", icon: FiHome },
    { value: "commercial-plot", labelKey: "options.propertyType.commercialPlot", icon: FiBriefcase },
    { value: "agricultural-land", labelKey: "options.propertyType.agriculturalLand", icon: FiSunrise },
    { value: "industrial-land", labelKey: "options.propertyType.industrialLand", icon: FiTruck },
    { value: "plot-form", labelKey: "options.propertyType.plotForm", icon: FiFileText },
    { value: "plot-file", labelKey: "options.propertyType.plotFile", icon: FiFolder },
  ],
  commercial: [
    { value: "office", labelKey: "options.propertyType.office", icon: FiMonitor },
    { value: "shop", labelKey: "options.propertyType.shop", icon: FiShoppingBag },
    { value: "warehouse", labelKey: "options.propertyType.warehouse", icon: FiBox },
    { value: "building", labelKey: "options.propertyType.building", icon: FiHome },
    { value: "factory", labelKey: "options.propertyType.factory", icon: FiTool },
    { value: "plaza", labelKey: "options.propertyType.plaza", icon: FiLayers },
    { value: "commercial-building", labelKey: "options.propertyType.commercialBuilding", icon: FiBriefcase },
    { value: "other", labelKey: "options.propertyType.other", icon: FiGrid },
  ],
};

// Lookup the category that owns a given sub-type. Used when editing a listing
// where the saved propertyType is a leaf value but the form needs both.
const CATEGORY_OF_SUBTYPE = Object.fromEntries(
  Object.entries(SUBTYPES_BY_CATEGORY).flatMap(([cat, list]) =>
    list.map((s) => [s.value, cat]),
  ),
);
// Legacy values map to the closest current category.
CATEGORY_OF_SUBTYPE.apartment = "home";

const PURPOSES = [
  { value: "sale", labelKey: "options.purpose.sale" },
  { value: "rent", labelKey: "options.purpose.rent" },
];

const FURNISHED_OPTIONS = [
  { value: "unfurnished", labelKey: "options.furnishing.unfurnished" },
  { value: "semi-furnished", labelKey: "options.furnishing.semiFurnished" },
  { value: "furnished", labelKey: "options.furnishing.furnished" },
];

const CONDITION_OPTIONS = [
  { value: "brand-new", labelKey: "options.condition.brandNew" },
  { value: "like-new", labelKey: "options.condition.likeNew" },
  { value: "good", labelKey: "options.condition.good" },
  { value: "needs-renovation", labelKey: "options.condition.needsRenovation" },
  { value: "under-construction", labelKey: "options.condition.underConstruction" },
];

/* The stored value stays English (it is written to the property record);
   only the label is translated. */
const FACING_OPTIONS = [
  { value: "North", labelKey: "options.facing.north" },
  { value: "South", labelKey: "options.facing.south" },
  { value: "East", labelKey: "options.facing.east" },
  { value: "West", labelKey: "options.facing.west" },
  { value: "North-East", labelKey: "options.facing.northEast" },
  { value: "North-West", labelKey: "options.facing.northWest" },
  { value: "South-East", labelKey: "options.facing.southEast" },
  { value: "South-West", labelKey: "options.facing.southWest" },
];

const LEASE_TERMS = [1, 3, 6, 12, 24, 36];

const DESC_MAX = 2000;
const NOTES_MAX = 1000;
const MAX_IMAGES = 6;

const SIZE_UNITS = [
  { value: "Sq. Ft.", labelKey: "options.sizeUnit.squareFeet" },
  { value: "Sq. Yd.", labelKey: "options.sizeUnit.squareYards" },
  { value: "Sq. M.", labelKey: "options.sizeUnit.squareMeters" },
  { value: "Marla", labelKey: "options.sizeUnit.marla" },
  { value: "Kanal", labelKey: "options.sizeUnit.kanal" },
];

// Legacy size units stored in older records map onto the new option values.
const normalizeUnit = (unit) => (unit === "sq ft" ? "Sq. Ft." : unit || "Marla");
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

// Grouped amenity catalogue comes from ../../config/amenities.js (see import).

// Flat list derived from the groups — used by validation + edit-mode hydration.
const ALL_AMENITIES = AMENITY_GROUPS.flatMap((g) => g.items);

/* ── Default blank form state ── */
const EMPTY_FORM = {
  title: "",
  purpose: "sale",
  category: "home",
  propertyType: "",
  price: "",
  priceNegotiable: false,
  size: "",
  sizeUnit: "Marla",
  condition: "",
  city: "",
  customCity: "",
  area: "",
  customArea: "",
  locality: "",
  block: "",
  street: "",
  landmark: "",
  bedrooms: "",
  bathrooms: "",
  kitchens: "",
  drawingRooms: "",
  diningRooms: "",
  livingRooms: "",
  studyRooms: "",
  storeRooms: "",
  powderRooms: "",
  servantQuarters: "",
  floorNumber: "",
  totalFloors: "",
  constructionYear: "",
  facing: "",
  buildingName: "",
  apartmentNumber: "",
  parkingSpaces: "",
  description: "",
  notes: "",
  videoUrl: "",
  amenities: [],
  images: [],
  featured: false,
  coordinates: null,
  securityDeposit: "",
  advanceRent: "",
  leaseTerm: 12,
  furnished: "unfurnished",
  availableFrom: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  contactAltPhone: "",
  showWhatsapp: true,
  showContact: true,
  // Plot-specific
  plotNumber: "",
  plotCorner: false,
  plotParkFacing: false,
  plotMainBoulevard: false,
  plotPossession: "",
  plotDevelopment: "",
  plotBoundaryWall: false,
  plotElectricity: false,
  plotGas: false,
  plotWater: false,
  plotSewerage: false,
  // Commercial-specific
  commWashrooms: "",
  commReception: false,
  commConference: false,
  commOfficeRooms: "",
  commGenerator: false,
  commElevator: false,
  commFrontage: "",
  commMainRoad: false,
  commCorner: false,
};

/* ── Validation ──
   Required (must ship a usable marketplace listing):
   purpose/category (defaults always set), propertyType, title, price, size,
   sizeUnit, city/area, map pin, description, ≥1 amenity, ≥1 photo,
   contact name + email + PK mobile; bedrooms/bathrooms for homes;
   security deposit + lease term for rent.
   Optional: WhatsApp / alt phone (format-checked if filled), video, notes,
   condition, furnishing, locality extras, plot/commercial bags. */
const validate = (data, t) => {
  const errors = {};
  const tr = typeof t === "function" ? t : (key) => key;

  if (!data.title.trim()) errors.title = tr("validation.titleRequired");
  else if (data.title.trim().length < 10)
    errors.title = tr("validation.titleMin");
  else if (data.title.trim().length > 120)
    errors.title = tr("validation.titleMax");

  if (!data.purpose) errors.purpose = "Choose Sale or Rent";
  if (!data.category) errors.category = "Pick a property category";
  if (!data.propertyType) errors.propertyType = "Select a property type";
  else {
    const validForCategory = (SUBTYPES_BY_CATEGORY[data.category] || []).some(
      (s) => s.value === data.propertyType,
    );
    if (!validForCategory) errors.propertyType = "Pick a type for this category";
  }

  if (!data.price || Number(data.price) <= 0)
    errors.price = data.purpose === "rent"
      ? "Enter a monthly rent"
      : "Enter a valid price";

  if (!data.size || Number(data.size) <= 0) errors.size = "Enter a valid size";
  if (!data.sizeUnit) errors.sizeUnit = "Select a size unit";

  if (!data.city) {
    errors.city = "Select a city";
  } else if (data.city === "Other" && !data.customCity.trim()) {
    errors.customCity = tr("placeholders.city");
  }

  if (data.city === "Other") {
    if (!data.customArea.trim()) errors.customArea = "Enter your area";
  } else if (data.city) {
    if (!data.area) errors.area = "Select an area";
    else if (data.area === "Other" && !data.customArea.trim())
      errors.customArea = "Enter your area";
  }

  if (data.category === "home") {
    if (data.bedrooms === "" || Number(data.bedrooms) < 0)
      errors.bedrooms = "Enter bedrooms count";
    if (data.bathrooms === "" || Number(data.bathrooms) < 0)
      errors.bathrooms = "Enter bathrooms count";
  }

  if (!data.description.trim()) errors.description = tr("validation.descRequired");
  else if (data.description.trim().length < 20)
    errors.description = tr("validation.descMin");
  else if (data.description.trim().length > DESC_MAX)
    errors.description = tr("validation.descMax", { max: DESC_MAX });

  if (data.notes && data.notes.length > NOTES_MAX)
    errors.notes = `Notes must be at most ${NOTES_MAX} characters`;

  if (data.videoUrl?.trim() && !/^https?:\/\//i.test(data.videoUrl.trim()))
    errors.videoUrl = "Video upload incomplete — please re-upload the video";
  if (data.videoUploading)
    errors.videoUrl = "Wait for the video to finish uploading";

  if (!Array.isArray(data.amenities) || data.amenities.length === 0) {
    errors.amenities = "Select at least one amenity";
  }
  if (!Array.isArray(data.images) || data.images.length === 0) {
    errors.images = "Upload at least one property image";
  } else if (data.images.length > MAX_IMAGES) {
    errors.images = `Maximum ${MAX_IMAGES} images allowed`;
  } else if (data.images.some((img) => img?.isUploading)) {
    errors.images = "Wait for all images to finish uploading";
  } else if (
    data.images.some((img) => {
      const url = typeof img === "string" ? img : img?.url;
      return !url || String(url).startsWith("blob:");
    })
  ) {
    errors.images = "One or more images failed to upload — please re-add them";
  }
  if (
    !data.coordinates ||
    typeof data.coordinates.lat !== "number" ||
    typeof data.coordinates.lng !== "number"
  ) {
    errors.coordinates = "Drop a pin on the map for this property";
  }

  if (data.purpose === "rent") {
    if (data.securityDeposit === "" || Number(data.securityDeposit) < 0)
      errors.securityDeposit = "Enter a security deposit (0 if none)";
    if (!data.leaseTerm || Number(data.leaseTerm) < 1)
      errors.leaseTerm = "Pick a minimum rental period";
  }

  if (!data.contactName?.trim()) errors.contactName = "Contact name is required";
  if (!data.contactEmail?.trim()) errors.contactEmail = tr("validation.emailRequired");
  else if (!/\S+@\S+\.\S+/.test(data.contactEmail))
    errors.contactEmail = tr("validation.emailInvalid");

  const phoneErr = validatePhone(data.contactPhone);
  if (phoneErr) errors.contactPhone = phoneErr;
  const waErr = validateOptionalPhone(data.contactWhatsapp, "WhatsApp number");
  if (waErr) errors.contactWhatsapp = waErr;
  const altErr = validateOptionalPhone(data.contactAltPhone, "alternate phone");
  if (altErr) errors.contactAltPhone = altErr;

  return errors;
};

/* Red asterisk indicator used on every required label. */
const Required = () => (
  <span className="lst-required" aria-hidden="true">
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
  // Optional — notified when Sale/Rent purpose changes (admin status options).
  onPurposeChange = null,
}) => {
  const { t } = useTranslation("listing");
  const { currentUser } = useAuth();

  /* ── Merge initial data with defaults ── */
  const defaults = useMemo(() => {
    if (!initialData) return { ...EMPTY_FORM };

    // Convert old image/gallery format to new images array (with Cloudinary publicId)
    const images = [];
    if (initialData.image) {
      const img = photoUrlToFormImage(initialData.image, { isCover: true });
      if (img) images.push(img);
    }
    if (initialData.gallery && Array.isArray(initialData.gallery)) {
      initialData.gallery.forEach((url) => {
        const img = photoUrlToFormImage(url);
        if (img) images.push(img);
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

    // Derive the category from an existing leaf propertyType when editing.
    const incomingPropertyType = initialData.propertyType || "";
    const derivedCategory =
      CATEGORY_OF_SUBTYPE[incomingPropertyType] || "home";

    return {
      ...EMPTY_FORM,
      title: initialData.title || "",
      purpose: initialData.purpose || "sale",
      category: initialData.category || derivedCategory,
      propertyType: incomingPropertyType,
      price: initialData.price ? String(initialData.price) : "",
      priceNegotiable: Boolean(initialData.priceNegotiable),
      size: initialData.size ? String(initialData.size) : "",
      sizeUnit: normalizeUnit(initialData.sizeUnit),
      condition: initialData.condition || "",
      city,
      customCity,
      area,
      customArea,
      locality: initialData.locality || initialData.location?.locality || "",
      block: initialData.block || initialData.location?.block || "",
      street: initialData.street || initialData.location?.street || "",
      landmark: initialData.landmark || initialData.location?.landmark || "",
      bedrooms:
        initialData.bedrooms != null ? String(initialData.bedrooms) : "",
      bathrooms:
        initialData.bathrooms != null ? String(initialData.bathrooms) : "",
      kitchens: initialData.kitchens != null ? String(initialData.kitchens) : "",
      drawingRooms: initialData.drawingRooms != null ? String(initialData.drawingRooms) : "",
      diningRooms: initialData.diningRooms != null ? String(initialData.diningRooms) : "",
      livingRooms: initialData.livingRooms != null ? String(initialData.livingRooms) : "",
      studyRooms: initialData.studyRooms != null ? String(initialData.studyRooms) : "",
      storeRooms: initialData.storeRooms != null ? String(initialData.storeRooms) : "",
      powderRooms: initialData.powderRooms != null ? String(initialData.powderRooms) : "",
      servantQuarters: initialData.servantQuarters != null ? String(initialData.servantQuarters) : "",
      floorNumber: initialData.floorNumber != null ? String(initialData.floorNumber) : "",
      totalFloors: initialData.totalFloors != null ? String(initialData.totalFloors) : "",
      constructionYear: initialData.constructionYear != null ? String(initialData.constructionYear) : "",
      facing: initialData.facing || "",
      buildingName: initialData.buildingName || "",
      apartmentNumber: initialData.apartmentNumber || "",
      parkingSpaces: initialData.parkingSpaces != null ? String(initialData.parkingSpaces) : "",
      description: initialData.description || "",
      notes: initialData.notes || "",
      videoUrl: initialData.videoUrl || "",
      amenities: initialData.amenities || [],
      images: images.length > 0 ? images : [],
      featured: initialData.featured != null ? initialData.featured : false,
      coordinates:
        initialData.coordinates ||
        initialData.location?.coordinates ||
        null,
      securityDeposit:
        initialData.securityDeposit != null
          ? String(initialData.securityDeposit)
          : "",
      advanceRent:
        initialData.advanceRent != null ? String(initialData.advanceRent) : "",
      leaseTerm: initialData.leaseTerm || 12,
      furnished: initialData.furnished || "unfurnished",
      availableFrom: initialData.availableFrom
        ? new Date(initialData.availableFrom).toISOString().slice(0, 10)
        : "",
      contactName: initialData.contactName || "",
      contactEmail: initialData.contactEmail || "",
      contactPhone: sanitizePkPhoneDigits(initialData.contactPhone || ""),
      contactWhatsapp: sanitizePkPhoneDigits(initialData.contactWhatsapp || ""),
      contactAltPhone: sanitizePkPhoneDigits(initialData.contactAltPhone || ""),
      showWhatsapp: initialData.showWhatsapp !== false,
      showContact: initialData.showContact !== false,
      plotNumber: initialData.plotNumber || "",
      plotCorner: Boolean(initialData.plotCorner),
      plotParkFacing: Boolean(initialData.plotParkFacing),
      plotMainBoulevard: Boolean(initialData.plotMainBoulevard),
      plotPossession: initialData.plotPossession || "",
      plotDevelopment: initialData.plotDevelopment || "",
      plotBoundaryWall: Boolean(initialData.plotBoundaryWall),
      plotElectricity: Boolean(initialData.plotElectricity),
      plotGas: Boolean(initialData.plotGas),
      plotWater: Boolean(initialData.plotWater),
      plotSewerage: Boolean(initialData.plotSewerage),
      commWashrooms: initialData.commWashrooms != null ? String(initialData.commWashrooms) : "",
      commReception: Boolean(initialData.commReception),
      commConference: Boolean(initialData.commConference),
      commOfficeRooms: initialData.commOfficeRooms != null ? String(initialData.commOfficeRooms) : "",
      commGenerator: Boolean(initialData.commGenerator),
      commElevator: Boolean(initialData.commElevator),
      commFrontage: initialData.commFrontage || "",
      commMainRoad: Boolean(initialData.commMainRoad),
      commCorner: Boolean(initialData.commCorner),
    };
  }, [initialData]);

  // Only restore a draft for new listings (no initialData) and when a draftKey
  // was provided. Editing an existing listing always trumps any saved draft.
  const restoredDraft = useMemo(() => {
    if (initialData || !draftKey) return null;
    return loadListingDraft(draftKey);
  }, [initialData, draftKey]);

  const [form, setForm] = useState(() => {
    const base = restoredDraft?.form ? { ...defaults, ...restoredDraft.form } : defaults;
    return {
      ...base,
      contactPhone: sanitizePkPhoneDigits(base.contactPhone || ""),
      contactWhatsapp: sanitizePkPhoneDigits(base.contactWhatsapp || ""),
      contactAltPhone: sanitizePkPhoneDigits(base.contactAltPhone || ""),
    };
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  // Index of the currently visible amenity group (Main Features / Business…
  // etc.). The user pages through groups with ← → arrows. Selections persist
  // across groups via the unchanged form.amenities array.
  const [amenityGroupIdx, setAmenityGroupIdx] = useState(0);
  // "Change Area" unit picker modal (Square Feet / Yards / Meters / Marla / Kanal).
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  // Coords resolved from (city, area) via Nominatim. Used to centre the map
  // when the user picks an area, before they drop a pin.
  const [resolvedAreaCenter, setResolvedAreaCenter] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  // How the user sets the map pin: "map" (click), "device" (geolocation), or "manual" (typed lat/lng).
  const [locationMode, setLocationMode] = useState("map");
  // Local string state for the manual lat/lng inputs so partial typing doesn't blow up form.coordinates.
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);

  // Prefill contact details from the logged-in user's profile. Runs once on
  // mount + whenever `currentUser` becomes available. Never overwrites a value
  // the user has already typed in (or that came from initialData / draft).
  useEffect(() => {
    if (!currentUser) return;
    setForm((prev) => {
      const patch = {};
      if (!prev.contactName && currentUser.name) patch.contactName = currentUser.name;
      if (!prev.contactEmail && currentUser.email) patch.contactEmail = currentUser.email;
      if (!prev.contactPhone && currentUser.phone) {
        patch.contactPhone = sanitizePkPhoneDigits(currentUser.phone);
      }
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, ...patch };
    });
  }, [currentUser]);

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
        // Switching category invalidates the previously-chosen subtype.
        if (field === "category" && value !== prev.category) {
          next.propertyType = "";
        }
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
      if (field === "purpose" && typeof onPurposeChange === "function") {
        onPurposeChange(value);
      }
      /* Clear error on change */
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors, onPurposeChange],
  );

  const handlePhoneChange = useCallback(
    (field, raw) => {
      handleChange(field, sanitizePkPhoneDigits(raw));
    },
    [handleChange],
  );

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /* ── AI description writer ──
     Reads whatever the form holds right now; the server prunes empties and
     declines politely if there isn't enough to work from. Auto-generation is
     suppressed in edit mode so an existing description is never replaced. */
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const getAiFields = useCallback(() => {
    const f = formRef.current;
    const resolvedCity = f.city === "Other" ? f.customCity : f.city;
    const resolvedArea = f.area === "Other" ? f.customArea : f.area;
    return {
      title: f.title,
      purpose: f.purpose,
      category: f.category,
      propertyType: f.propertyType,
      city: resolvedCity,
      area: resolvedArea,
      price: f.price ? Number(f.price) : undefined,
      size: f.size ? Number(f.size) : undefined,
      sizeUnit: f.sizeUnit,
      bedrooms: f.bedrooms ? Number(f.bedrooms) : undefined,
      bathrooms: f.bathrooms ? Number(f.bathrooms) : undefined,
      amenities: f.amenities,
      furnished: f.furnished,
      securityDeposit: f.securityDeposit ? Number(f.securityDeposit) : undefined,
      leaseTerm: f.leaseTerm ? Number(f.leaseTerm) : undefined,
    };
  }, []);

  const ai = useAiDescription({
    kind: "listing",
    getFields: getAiFields,
    onText: (text) => setForm((prev) => ({ ...prev, description: text })),
    enabled: !initialData,
  });

  const handleAmenityToggle = useCallback((amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
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

  // Security deposit — same thousands-separator UX as the Price input.
  const handleDepositChange = useCallback(
    (raw) => {
      const digits = raw.replace(/[^\d]/g, "");
      handleChange("securityDeposit", digits);
    },
    [handleChange]
  );

  const handleApplyManualCoords = useCallback(() => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!manualLat.trim() || !manualLng.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error(t("validation.coordsInvalid"));
      return;
    }
    if (lat < -90 || lat > 90) {
      toast.error(t("validation.latRange"));
      return;
    }
    if (lng < -180 || lng > 180) {
      toast.error(t("validation.lngRange"));
      return;
    }
    setForm((prev) => ({ ...prev, coordinates: { lat, lng } }));
    setErrors((prev) => {
      if (!prev.coordinates) return prev;
      const next = { ...prev };
      delete next.coordinates;
      return next;
    });
    toast.success(t("toast.pinSet"));
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
      toast.error(t("validation.noGeolocation"));
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
        toast.success(t("toast.locationSet"));
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
      const validationErrors = validate({ ...form, videoUploading }, t);
      setErrors(validationErrors);

      /* Mark all as touched so errors show */
      const allTouched = {};
      Object.keys(EMPTY_FORM).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);

      if (Object.keys(validationErrors).length > 0) {
        focusFirstInvalid(validationErrors);
        return;
      }

      /* Build clean output — resolve "Other" placeholders to their custom text. */
      const finalCity =
        form.city === "Other" ? form.customCity.trim() : form.city;
      const finalArea =
        form.city === "Other" || form.area === "Other"
          ? form.customArea.trim()
          : form.area;

      const output = {
        ...form,
        title: form.title.trim(),
        purpose: form.purpose,
        category: form.category,
        propertyType: form.propertyType,
        price: Number(form.price),
        priceNegotiable: Boolean(form.priceNegotiable),
        size: Number(form.size),
        sizeUnit: form.sizeUnit,
        condition: form.condition || "",
        city: finalCity,
        area: finalArea,
        locality: form.locality?.trim() || "",
        block: form.block?.trim() || "",
        street: form.street?.trim() || "",
        landmark: form.landmark?.trim() || "",
        bedrooms: form.category === "home" ? Number(form.bedrooms) || 0 : 0,
        bathrooms: form.category === "home" ? Number(form.bathrooms) || 0 : 0,
        floorNumber: form.floorNumber !== "" ? Number(form.floorNumber) : "",
        totalFloors: form.totalFloors !== "" ? Number(form.totalFloors) : "",
        constructionYear: form.constructionYear !== "" ? Number(form.constructionYear) : "",
        facing: form.facing || "",
        buildingName: form.buildingName?.trim() || "",
        apartmentNumber: form.apartmentNumber?.trim() || "",
        parkingSpaces: form.parkingSpaces !== "" ? Number(form.parkingSpaces) : "",
        description: form.description.trim(),
        notes: form.notes?.trim() || "",
        videoUrl: form.videoUrl?.trim() || "",
        amenities: form.amenities,
        images: form.images,
        featured: form.featured,
        coordinates: form.coordinates,
        securityDeposit:
          form.purpose === "rent" ? Number(form.securityDeposit) || 0 : 0,
        advanceRent:
          form.purpose === "rent" && form.advanceRent !== ""
            ? Number(form.advanceRent) || 0
            : "",
        leaseTerm: form.purpose === "rent" ? Number(form.leaseTerm) || 12 : 12,
        furnished: form.furnished || "unfurnished",
        availableFrom: form.availableFrom || undefined,
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: formatPkPhoneForApi(form.contactPhone),
        contactWhatsapp: formatPkPhoneForApi(form.contactWhatsapp),
        contactAltPhone: formatPkPhoneForApi(form.contactAltPhone),
        showWhatsapp: form.showWhatsapp !== false,
        showContact: form.showContact !== false,
      };

      onSubmit(output);
    },
    [form, onSubmit, videoUploading, t],
  );

  /* ── Error display helper ── */
  const showError = (field) => touched[field] && errors[field];
  const fieldClass = (base, field) =>
    `${base}${showError(field) ? ` ${base}--error` : ""}`;

  const renderPhoneInput = (id, field) => (
    <div
      className={`lst-phone-group${showError(field) ? " lst-phone-group--error" : ""}`}
    >
      <span className="lst-phone-prefix" aria-hidden="true">
        +92
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        className="lst-input lst-phone-input"
        placeholder="3XX XXXXXXX"
        value={form[field]}
        onChange={(e) => handlePhoneChange(field, e.target.value)}
        onBlur={() => handleBlur(field)}
        maxLength={PK_PHONE_DIGITS}
        aria-invalid={!!showError(field)}
      />
    </div>
  );

  return (
    <form className="lst-form" onSubmit={handleSubmit} noValidate>
      {/* ── 1. Select Purpose ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">
          1. Purpose
          <Required />
        </h3>
        <p className="lst-form-section-sub">{t("steps.purposePrompt")}</p>
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
                <span className="lst-purpose-label">{t(p.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Select Property Type ── */}
      <div className="lst-form-section" id="lst-property-type">
        <h3 className="lst-form-section-title">
          2. Property Type
          <Required />
        </h3>
        <p className="lst-form-section-sub">{t("steps.categoryPrompt")}</p>

        {/* Category cards */}
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
                <span className="lst-category-label">{t(c.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-type 2-column card grid — filtered by chosen category, styled to
            match the search bar's dropdown popover. */}
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
                <span className="lst-subtype-card-label">{t(s.labelKey)}</span>
              </button>
            );
          })}
        </div>
        {showError("propertyType") && (
          <div className="lst-error">{errors.propertyType}</div>
        )}
      </div>

      {/* ── {t("sections.basicDetails")} ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">{t("sections.basicDetails")}</h3>

        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-title">
            {t("fields.title")}
            <Required />
          </label>
          <input
            id="lst-title"
            type="text"
            className={fieldClass("lst-input", "title")}
            placeholder={t("placeholders.title")}
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            onBlur={() => handleBlur("title")}
          />
          {showError("title") && (
            <div className="lst-error">{errors.title}</div>
          )}
        </div>

        {/* Price — label flips to "Monthly Rent" when purpose === rent */}
        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-price">
            {form.purpose === "rent" ? "Monthly Rent" : "Price"}
            <Required />
            <span className="lst-label-hint">
              {form.purpose === "rent" ? "(PKR / month)" : "(PKR)"}
            </span>
          </label>
          <input
            id="lst-price"
            type="text"
            inputMode="numeric"
            className={fieldClass("lst-input", "price")}
            placeholder={
              form.purpose === "rent" ? t("placeholders.deposit") : "e.g. 42,000,000"
            }
            value={form.price ? Number(form.price).toLocaleString("en-US") : ""}
            onChange={(e) => handlePriceChange(e.target.value)}
            onBlur={() => handleBlur("price")}
          />
          {showError("price") && (
            <div className="lst-error">{errors.price}</div>
          )}
        </div>

        <label className="lst-check-row">
          <input
            type="checkbox"
            checked={Boolean(form.priceNegotiable)}
            onChange={(e) => handleChange("priceNegotiable", e.target.checked)}
          />
          <span>{t("fields.priceNegotiable")}</span>
        </label>

        {/* Rental-only fields */}
        {form.purpose === "rent" && (
          <>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label" htmlFor="lst-security-deposit">
                  {t("fields.securityDeposit")}
                  <Required />
                  <span className="lst-label-hint">(PKR)</span>
                </label>
                <input
                  id="lst-security-deposit"
                  type="text"
                  inputMode="numeric"
                  className={fieldClass("lst-input", "securityDeposit")}
                  placeholder={t("placeholders.price")}
                  value={
                    form.securityDeposit
                      ? Number(form.securityDeposit).toLocaleString("en-US")
                      : ""
                  }
                  onChange={(e) => handleDepositChange(e.target.value)}
                  onBlur={() => handleBlur("securityDeposit")}
                />
                {showError("securityDeposit") && (
                  <div className="lst-error">{errors.securityDeposit}</div>
                )}
              </div>
              <div className="lst-field">
                <label className="lst-label">
                  {t("fields.advanceRent")}
                  <span className="lst-label-hint">(PKR)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="lst-input"
                  placeholder={t("placeholders.deposit")}
                  value={
                    form.advanceRent
                      ? Number(form.advanceRent).toLocaleString("en-US")
                      : ""
                  }
                  onChange={(e) =>
                    handleChange("advanceRent", e.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </div>
            </div>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label" htmlFor="lst-lease-term">
                  {t("fields.minRentalPeriod")}
                  <Required />
                </label>
                <select
                  id="lst-lease-term"
                  className={fieldClass("lst-select", "leaseTerm")}
                  value={form.leaseTerm}
                  onChange={(e) => handleChange("leaseTerm", Number(e.target.value))}
                  onBlur={() => handleBlur("leaseTerm")}
                >
                  {LEASE_TERMS.map((m) => (
                    <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
                  ))}
                </select>
                {showError("leaseTerm") && (
                  <div className="lst-error">{errors.leaseTerm}</div>
                )}
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.availableFrom")}</label>
                <input
                  type="date"
                  className="lst-input"
                  value={form.availableFrom}
                  onChange={(e) => handleChange("availableFrom", e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Size + Size Unit */}
        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-size">
              Size {form.sizeUnit ? `(${form.sizeUnit})` : ""}
              <Required />
            </label>
            <input
              id="lst-size"
              type="number"
              className={fieldClass("lst-input", "size")}
              placeholder={t("placeholders.months")}
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
              <Required />
            </label>
            <button
              type="button"
              id="lst-size-unit"
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
            {showError("sizeUnit") && (
              <div className="lst-error">{errors.sizeUnit}</div>
            )}
          </div>
        </div>

        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label">{t("fields.condition")}</label>
            <select
              className="lst-select"
              value={form.condition}
              onChange={(e) => handleChange("condition", e.target.value)}
            >
              <option value="">{t("fields.selectCondition")}</option>
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
          {(form.category === "home" || form.category === "commercial") && (
            <div className="lst-field">
              <label className="lst-label">{t("fields.furnishing")}</label>
              <select
                className="lst-select"
                value={form.furnished}
                onChange={(e) => handleChange("furnished", e.target.value)}
              >
                {FURNISHED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Location ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">{t("sections.location")}</h3>

        <div className="lst-row lst-row--location">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-city">
              City
              <Required />
            </label>
            <select
              id="lst-city"
              className={fieldClass("lst-select", "city")}
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              onBlur={() => handleBlur("city")}
            >
              <option value="">{t("fields.selectCity")}</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {form.city === "Other" && (
              <input
                id="lst-custom-city"
                type="text"
                className={fieldClass("lst-input", "customCity")}
                placeholder={t("placeholders.city")}
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
              <Required />
            </label>
            {form.city === "Other" ? (
              // Custom city → free-text area only (no dropdown).
              <input
                id="lst-custom-area"
                type="text"
                className={fieldClass("lst-input", "customArea")}
                placeholder={t("placeholders.locality")}
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
                  {form.city ? t("fields.selectArea") : t("fields.selectCityFirst")}
                </option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            )}
            {showError("area") && (
              <div className="lst-error">{errors.area}</div>
            )}
            {form.city === "Other" && showError("customArea") && (
              <div className="lst-error">{errors.customArea}</div>
            )}
          </div>

          {/* Picking "Other" as the area reveals a free-text input. It is a
              direct child of the row so it can span the full width below
              City + Area on mobile instead of being boxed into half a column. */}
          {form.city !== "Other" && form.area === "Other" && (
            <div className="lst-field lst-custom-area">
              <input
                id="lst-custom-area"
                type="text"
                className={fieldClass("lst-input", "customArea")}
                placeholder={t("placeholders.locality")}
                value={form.customArea}
                onChange={(e) => handleChange("customArea", e.target.value)}
                onBlur={() => handleBlur("customArea")}
              />
              {showError("customArea") && (
                <div className="lst-error">{errors.customArea}</div>
              )}
            </div>
          )}
        </div>

        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label">{t("fields.locality")}</label>
            <input
              type="text"
              className="lst-input"
              placeholder={t("placeholders.block")}
              value={form.locality}
              onChange={(e) => handleChange("locality", e.target.value)}
              disabled={!form.city}
            />
          </div>
          <div className="lst-field">
            <label className="lst-label">{t("fields.block")}</label>
            <input
              type="text"
              className="lst-input"
              placeholder={t("placeholders.blockShort")}
              value={form.block}
              onChange={(e) => handleChange("block", e.target.value)}
            />
          </div>
        </div>
        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label">{t("fields.street")}</label>
            <input
              type="text"
              className="lst-input"
              placeholder={t("placeholders.street")}
              value={form.street}
              onChange={(e) => handleChange("street", e.target.value)}
            />
          </div>
          <div className="lst-field">
            <label className="lst-label">{t("fields.landmark")}</label>
            <input
              type="text"
              className="lst-input"
              placeholder={t("placeholders.landmark")}
              value={form.landmark}
              onChange={(e) => handleChange("landmark", e.target.value)}
            />
          </div>
        </div>

        {/* Map pin — three input modes */}
        <div className="lst-field" id="lst-coordinates" tabIndex={-1}>
          <label className="lst-label" htmlFor="lst-location-mode">
            {t("location.prompt")}
            <Required />
          </label>
          <select
            id="lst-location-mode"
            className="lst-select"
            value={locationMode}
            onChange={(e) => handleModeChange(e.target.value)}
            style={{ marginBottom: 12 }}
          >
            <option value="map">{t("location.pickOnMap")}</option>
            <option value="device">{t("location.useCurrent")}</option>
            <option value="manual">{t("location.enterCoords")}</option>
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
                  border: "1px solid #134e2c",
                  borderRadius: 8,
                  background: "#134e2c",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isFetchingLocation ? "wait" : "pointer",
                }}
              >
                <FiCrosshair size={16} />
                {isFetchingLocation ? "Fetching…" : "Fetch current location"}
              </button>
              <p style={{ fontSize: 12, color: "#717171", margin: "8px 0 0" }}>
                {t("location.gpsHint")}
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
              watchCenter={mapDefaultCenter}
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
                    {t("location.latitude")}
                    <span className="lst-label-hint">(-90 to 90)</span>
                  </label>
                  <input
                    id="lst-manual-lat"
                    type="number"
                    step="any"
                    className="lst-input"
                    placeholder={t("placeholders.latitude")}
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                  />
                </div>
                <div className="lst-field" style={{ margin: 0 }}>
                  <label className="lst-label" htmlFor="lst-manual-lng">
                    {t("location.longitude")}
                    <span className="lst-label-hint">(-180 to 180)</span>
                  </label>
                  <input
                    id="lst-manual-lng"
                    type="number"
                    step="any"
                    className="lst-input"
                    placeholder={t("placeholders.longitude")}
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
                  border: "1px solid #134e2c",
                  borderRadius: 8,
                  background: "#134e2c",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {t("location.applyCoords")}
              </button>
              <p style={{ fontSize: 12, color: "#717171", margin: "8px 0 0" }}>
                {t("location.coordsTip")}
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
                background: "#e9f2ec",
                borderRadius: 8,
                fontSize: 13,
                color: "#134e2c",
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
                  color: "#134e2c",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: 13,
                }}
              >
                {t("location.clearPin")}
              </button>
            </div>
          )}
          {showError("coordinates") && (
            <div className="lst-error">{errors.coordinates}</div>
          )}
        </div>
      </div>

      {/* ── {t("sections.propertyDetails")} ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">{t("sections.propertyDetails")}</h3>

        {form.category === "home" && (
          <>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label" htmlFor="lst-bedrooms">
                  {t("fields.bedrooms")}
                  <Required />
                </label>
                <input
                  id="lst-bedrooms"
                  type="number"
                  className={fieldClass("lst-input", "bedrooms")}
                  placeholder={t("placeholders.floor")}
                  value={form.bedrooms}
                  onChange={(e) => handleChange("bedrooms", e.target.value)}
                  onBlur={() => handleBlur("bedrooms")}
                  min="0"
                  max="20"
                />
                {showError("bedrooms") && <div className="lst-error">{errors.bedrooms}</div>}
              </div>
              <div className="lst-field">
                <label className="lst-label" htmlFor="lst-bathrooms">
                  {t("fields.bathrooms")}
                  <Required />
                </label>
                <input
                  id="lst-bathrooms"
                  type="number"
                  className={fieldClass("lst-input", "bathrooms")}
                  placeholder={t("placeholders.floor")}
                  value={form.bathrooms}
                  onChange={(e) => handleChange("bathrooms", e.target.value)}
                  onBlur={() => handleBlur("bathrooms")}
                  min="0"
                  max="20"
                />
                {showError("bathrooms") && <div className="lst-error">{errors.bathrooms}</div>}
              </div>
            </div>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label">{t("fields.floorNumber")}</label>
                <input type="number" className="lst-input" min="0" max="100" value={form.floorNumber} onChange={(e) => handleChange("floorNumber", e.target.value)} placeholder={t("placeholders.groundFloor")} />
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.totalFloors")}</label>
                <input type="number" className="lst-input" min="0" max="100" value={form.totalFloors} onChange={(e) => handleChange("totalFloors", e.target.value)} />
              </div>
            </div>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label">{t("fields.constructionYear")}</label>
                <input type="number" className="lst-input" min="1950" max="2100" value={form.constructionYear} onChange={(e) => handleChange("constructionYear", e.target.value)} placeholder={t("placeholders.year")} />
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.facing")}</label>
                <select className="lst-select" value={form.facing} onChange={(e) => handleChange("facing", e.target.value)}>
                  <option value="">{t("fields.selectFacing")}</option>
                  {FACING_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>
            {(form.propertyType === "flat" || form.propertyType === "penthouse") && (
              <>
                <div className="lst-row">
                  <div className="lst-field">
                    <label className="lst-label">{t("fields.buildingName")}</label>
                    <input type="text" className="lst-input" value={form.buildingName} onChange={(e) => handleChange("buildingName", e.target.value)} />
                  </div>
                  <div className="lst-field">
                    <label className="lst-label">{t("fields.apartmentNumber")}</label>
                    <input type="text" className="lst-input" value={form.apartmentNumber} onChange={(e) => handleChange("apartmentNumber", e.target.value)} />
                  </div>
                </div>
                <div className="lst-field">
                  <label className="lst-label">{t("fields.parkingSpaces")}</label>
                  <input type="number" className="lst-input" min="0" max="20" value={form.parkingSpaces} onChange={(e) => handleChange("parkingSpaces", e.target.value)} />
                </div>
              </>
            )}
          </>
        )}

        {form.category === "plot" && (
          <>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label">{t("fields.plotNumber")}</label>
                <input type="text" className="lst-input" value={form.plotNumber} onChange={(e) => handleChange("plotNumber", e.target.value)} />
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.possession")}</label>
                <select className="lst-select" value={form.plotPossession} onChange={(e) => handleChange("plotPossession", e.target.value)}>
                  <option value="">{t("fields.select")}</option>
                  <option value="immediate">{t("options.possession.immediate")}</option>
                  <option value="soon">{t("options.possession.comingSoon")}</option>
                  <option value="under-development">{t("options.possession.underDevelopment")}</option>
                </select>
              </div>
            </div>
            <div className="lst-field">
              <label className="lst-label">{t("fields.developmentStatus")}</label>
              <select className="lst-select" value={form.plotDevelopment} onChange={(e) => handleChange("plotDevelopment", e.target.value)}>
                <option value="">{t("fields.select")}</option>
                <option value="developed">{t("options.development.developed")}</option>
                <option value="semi-developed">{t("options.development.semiDeveloped")}</option>
                <option value="raw">Raw</option>
              </select>
            </div>
            <div className="lst-check-grid">
              {[
                ["plotCorner", "Corner plot"],
                ["plotParkFacing", "Park facing"],
                ["plotMainBoulevard", "Main boulevard"],
                ["plotBoundaryWall", "Boundary wall"],
                ["plotElectricity", "Electricity"],
                ["plotGas", "Gas"],
                ["plotWater", "Water"],
                ["plotSewerage", "Sewerage"],
              ].map(([key, label]) => (
                <label key={key} className="lst-check-row">
                  <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => handleChange(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {form.category === "commercial" && (
          <>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label">{t("fields.floorNumber")}</label>
                <input type="number" className="lst-input" min="0" value={form.floorNumber} onChange={(e) => handleChange("floorNumber", e.target.value)} />
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.totalFloors")}</label>
                <input type="number" className="lst-input" min="0" value={form.totalFloors} onChange={(e) => handleChange("totalFloors", e.target.value)} />
              </div>
            </div>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label">{t("fields.buildingName")}</label>
                <input type="text" className="lst-input" value={form.buildingName} onChange={(e) => handleChange("buildingName", e.target.value)} />
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.parkingSpaces")}</label>
                <input type="number" className="lst-input" min="0" value={form.parkingSpaces} onChange={(e) => handleChange("parkingSpaces", e.target.value)} />
              </div>
            </div>
            <div className="lst-row">
              <div className="lst-field">
                <label className="lst-label">{t("fields.washrooms")}</label>
                <input type="number" className="lst-input" min="0" value={form.commWashrooms} onChange={(e) => handleChange("commWashrooms", e.target.value)} />
              </div>
              <div className="lst-field">
                <label className="lst-label">{t("fields.officeRooms")}</label>
                <input type="number" className="lst-input" min="0" value={form.commOfficeRooms} onChange={(e) => handleChange("commOfficeRooms", e.target.value)} />
              </div>
            </div>
            <div className="lst-field">
              <label className="lst-label">{t("fields.frontage")}</label>
              <input type="text" className="lst-input" placeholder={t("placeholders.frontage")} value={form.commFrontage} onChange={(e) => handleChange("commFrontage", e.target.value)} />
            </div>
            <div className="lst-check-grid">
              {[
                ["commReception", "Reception"],
                ["commConference", "Conference room"],
                ["commGenerator", "Generator"],
                ["commElevator", "Elevator"],
                ["commMainRoad", "Main road"],
                ["commCorner", "Corner property"],
              ].map(([key, label]) => (
                <label key={key} className="lst-check-row">
                  <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => handleChange(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── {t("sections.features")} (grouped, zameen-style) ── */}
      <div className="lst-form-section" id="lst-amenities" tabIndex={-1}>
        <h3 className="lst-form-section-title">
          {t("sections.features")}
          <Required />
        </h3>
        <p className="lst-form-section-sub">
          {t("sections.featuresHint")}
        </p>

        {/* Carousel-style slider: arrows pinned to the left + right edges of
            the panel (like an image gallery), one amenity group visible at a
            time in the middle. */}
        {(() => {
          const total = AMENITY_GROUPS.length;
          const group = AMENITY_GROUPS[amenityGroupIdx];
          const selectedInGroup = group.items.filter((a) =>
            form.amenities.includes(a),
          ).length;
          return (
            <div className="lst-amenity-slider">
              {/* Left arrow — absolute, vertically centred on the panel */}
              <button
                type="button"
                className="lst-amenity-arrow lst-amenity-arrow--left"
                onClick={() =>
                  setAmenityGroupIdx((i) => (i - 1 + total) % total)
                }
                aria-label={t("steps.previousGroup")}
              >
                <FiChevronLeft size={24} />
              </button>

              {/* Right arrow — absolute, opposite side */}
              <button
                type="button"
                className="lst-amenity-arrow lst-amenity-arrow--right"
                onClick={() =>
                  setAmenityGroupIdx((i) => (i + 1) % total)
                }
                aria-label={t("steps.nextGroup")}
              >
                <FiChevronRight size={24} />
              </button>

              {/* Current group content (title + chips + dot pager) */}
              <div className="lst-amenity-slide">
                <div className="lst-amenity-slide-title-row">
                  <h4 className="lst-amenity-group-title">{group.label}</h4>
                  <span className="lst-amenity-slider-count">
                    {amenityGroupIdx + 1} / {total}
                    {selectedInGroup > 0 && (
                      <span className="lst-amenity-slider-selected">
                        · {selectedInGroup} selected
                      </span>
                    )}
                  </span>
                </div>

                <div className="lst-amenity-grid">
                  {group.items.map((amenity) => {
                    const selected = form.amenities.includes(amenity);
                    return (
                      <label
                        key={amenity}
                        className={`lst-amenity-chip${
                          selected ? " lst-amenity-chip--selected" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleAmenityToggle(amenity)}
                        />
                        <span className="lst-amenity-checkmark">
                          {selected ? "✓" : "+"}
                        </span>
                        <span className="lst-amenity-chip-text">{amenity}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Dots — click any dot to jump to that group. */}
                <div className="lst-amenity-dots">
                  {AMENITY_GROUPS.map((g, i) => (
                    <button
                      key={g.label}
                      type="button"
                      aria-label={`Go to ${g.label}`}
                      onClick={() => setAmenityGroupIdx(i)}
                      className={`lst-amenity-dot${
                        i === amenityGroupIdx ? " lst-amenity-dot--active" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        {showError("amenities") && (
          <div className="lst-error">{errors.amenities}</div>
        )}
      </div>

      {/* ── {t("sections.contact")} ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">{t("sections.contact")}</h3>
        <p className="lst-form-section-sub">
          Buyers see these details on your listing. Prefilled from your account
          — edit if you want a different contact for this listing.
        </p>

        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-contact-name">
            {t("fields.fullName")}
            <Required />
          </label>
          <input
            id="lst-contact-name"
            type="text"
            className={fieldClass("lst-input", "contactName")}
            placeholder={t("placeholders.name")}
            value={form.contactName}
            onChange={(e) => handleChange("contactName", e.target.value)}
            onBlur={() => handleBlur("contactName")}
          />
          {showError("contactName") && (
            <div className="lst-error">{errors.contactName}</div>
          )}
        </div>

        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-contact-email">
              {t("fields.email")}
              <Required />
            </label>
            <input
              id="lst-contact-email"
              type="email"
              className={fieldClass("lst-input", "contactEmail")}
              placeholder={t("placeholders.email")}
              value={form.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              onBlur={() => handleBlur("contactEmail")}
            />
            {showError("contactEmail") && (
              <div className="lst-error">{errors.contactEmail}</div>
            )}
          </div>
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-contact-phone">
              {t("fields.mobile")}
              <Required />
            </label>
            {renderPhoneInput("lst-contact-phone", "contactPhone")}
            {showError("contactPhone") && (
              <div className="lst-error">{errors.contactPhone}</div>
            )}
          </div>
        </div>

        <div className="lst-row">
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-contact-wa">
              {t("fields.whatsapp")}
            </label>
            {renderPhoneInput("lst-contact-wa", "contactWhatsapp")}
            {showError("contactWhatsapp") && (
              <div className="lst-error">{errors.contactWhatsapp}</div>
            )}
          </div>
          <div className="lst-field">
            <label className="lst-label" htmlFor="lst-contact-alt">
              {t("fields.alternatePhone")}
            </label>
            {renderPhoneInput("lst-contact-alt", "contactAltPhone")}
            {showError("contactAltPhone") && (
              <div className="lst-error">{errors.contactAltPhone}</div>
            )}
          </div>
        </div>

        <label className="lst-check-row">
          <input
            type="checkbox"
            checked={form.showWhatsapp !== false}
            onChange={(e) => handleChange("showWhatsapp", e.target.checked)}
          />
          <span>{t("fields.showWhatsapp")}</span>
        </label>
      </div>

      {/* ── Images ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">
          {t("sections.media")}
        </h3>
        <p className="lst-form-section-sub">
          Upload 1–{MAX_IMAGES} photos (JPG, PNG, WEBP). New photos become the cover — drag to reorder.
        </p>

        <div className="lst-field" id="lst-images" tabIndex={-1}>
          <ImageUpload
            images={form.images || []}
            onChange={(newImages) => handleChange("images", newImages)}
            maxImages={MAX_IMAGES}
            label={
              <>
                {t("media.images")}
                <Required />
              </>
            }
            helperText={t("media.imagesHelper", { max: MAX_IMAGES })}
          />
          {showError("images") && (
            <div className="lst-error">{errors.images}</div>
          )}
        </div>

        <div className="lst-field" id="lst-video" tabIndex={-1}>
          <VideoUpload
            value={form.videoUrl || ""}
            onChange={(url) => {
              handleChange("videoUrl", url || "");
              setTouched((prev) => ({ ...prev, videoUrl: true }));
            }}
            onUploadingChange={setVideoUploading}
            label={t("media.video")}
            helperText={t("media.videoHelper")}
          />
          {showError("videoUrl") && (
            <div className="lst-error">{errors.videoUrl}</div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">{t("sections.description")}</h3>

        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-description">
            {t("fields.propertyDescription")}
            <Required />
          </label>
          <AiDescriptionBadge
            loading={ai.loading}
            isAi={ai.isAi}
            error={ai.error}
            onRegenerate={ai.regenerate}
          />
          <textarea
            id="lst-description"
            className={fieldClass("lst-textarea", "description")}
            placeholder={t("media.aiHint")}
            value={form.description}
            maxLength={DESC_MAX}
            onFocus={() => ai.handleFocus(form.description)}
            onChange={(e) => {
              ai.markEdited();
              handleChange("description", e.target.value);
            }}
            onBlur={() => handleBlur("description")}
          />
          <div className="lst-char-count">
            {form.description.length}/{DESC_MAX}
          </div>
          {showError("description") && (
            <div className="lst-error">{errors.description}</div>
          )}
        </div>

        <div className="lst-field">
          <label className="lst-label" htmlFor="lst-notes">
            {t("fields.additionalNotes")} <span className="lst-label-hint">(optional)</span>
          </label>
          <textarea
            id="lst-notes"
            className={fieldClass("lst-textarea", "notes")}
            placeholder={t("media.notesPlaceholder")}
            value={form.notes}
            maxLength={NOTES_MAX}
            onChange={(e) => handleChange("notes", e.target.value)}
            onBlur={() => handleBlur("notes")}
            rows={4}
          />
          <div className="lst-char-count">
            {form.notes.length}/{NOTES_MAX}
          </div>
          {showError("notes") && (
            <div className="lst-error">{errors.notes}</div>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="lst-actions">
        <button
          type="submit"
          className="lst-btn lst-btn--primary"
          disabled={isSubmitting || videoUploading}
          aria-busy={isSubmitting || videoUploading}
        >
          {isSubmitting
            ? "Saving..."
            : videoUploading
              ? "Uploading video…"
              : submitLabel}
        </button>
      </div>

      {/* ── "Change Area" unit picker modal ── */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title={t("fields.changeArea")}
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
              <span className="dd-opt-label">{t(u.labelKey)}</span>
              {form.sizeUnit === u.value && (
                <FiCheck className="dd-opt-check" size={16} />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </form>
  );
};

export default ListingForm;
