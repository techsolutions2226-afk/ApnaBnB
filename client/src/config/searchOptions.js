/* ─── Shared option data for the home page search bar dropdowns ───
   Property type values intentionally follow the same kebab-case values the
   rest of the app already sends to the backend (house, flat, shop, ...),
   so nothing about the URL / API contract changes.
   ─────────────────────────────────────────────── */

import {
  FiGrid,
  FiHome,
  FiLayers,
  FiLayout,
  FiColumns,
  FiChevronsUp,
  FiChevronsDown,
  FiMap,
  FiBriefcase,
  FiTruck,
  FiSunrise,
  FiFileText,
  FiFolder,
  FiShoppingBag,
  FiMonitor,
  FiTool,
  FiBox,
} from "react-icons/fi";

/* ── Cities (major first, then the rest) ── */
export const CITIES = [
  "Islamabad",
  "Karachi",
  "Lahore",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Abbottabad",
  "Abdul Hakim",
  "Bahawalpur",
  "Sargodha",
  "Hyderabad",
  "Sukkur",
  "Larkana",
  "Mardan",
  "Sahiwal",
  "Nawabshah",
  "Dera Ghazi Khan",
  "Muzaffarabad",
  "Mirpur",
  "Gilgit",
  "Skardu",
  "Murree",
  "Jhelum",
  "Rahim Yar Khan",
  "Okara",
  "Sheikhupura",
];

/* ── Property type dropdown: Homes | Plots | Commercial ── */
export const PROPERTY_TABS = [
  {
    id: "home",
    label: "Homes",
    icon: FiHome,
    options: [
      { value: "", label: "All Homes", icon: FiGrid },
      { value: "penthouse", label: "Penthouse", icon: FiLayers },
      { value: "house", label: "House", icon: FiHome },
      { value: "flat", label: "Flat", icon: FiLayout },
      { value: "upper-portion", label: "Upper Portion", icon: FiChevronsUp },
      { value: "lower-portion", label: "Lower Portion", icon: FiChevronsDown },
      { value: "farm-house", label: "Farm House", icon: FiSunrise },
      { value: "room", label: "Room", icon: FiColumns },
    ],
  },
  {
    id: "plot",
    label: "Plots",
    icon: FiMap,
    options: [
      { value: "", label: "All Plots", icon: FiMap },
      { value: "commercial-plot", label: "Commercial Plot", icon: FiBriefcase },
      { value: "residential-plot", label: "Residential Plot", icon: FiHome },
      { value: "industrial-land", label: "Industrial Land", icon: FiTruck },
      { value: "agricultural-land", label: "Agricultural Land", icon: FiSunrise },
      { value: "plot-form", label: "Plot Form", icon: FiFileText },
      { value: "plot-file", label: "Plot File", icon: FiFolder },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    icon: FiBriefcase,
    options: [
      { value: "", label: "All Commercial", icon: FiBriefcase },
      { value: "shop", label: "Shop", icon: FiShoppingBag },
      { value: "office", label: "Office", icon: FiMonitor },
      { value: "factory", label: "Factory", icon: FiTool },
      { value: "warehouse", label: "Warehouse", icon: FiBox },
      { value: "other", label: "Other", icon: FiGrid },
      { value: "building", label: "Building", icon: FiHome },
    ],
  },
];

/* ── Area units (label-only — no value conversion) ── */
export const AREA_UNITS = [
  "Square Feet",
  "Square Yards",
  "Square Meters",
  "Marla",
  "Kanal",
];

/* ── Currencies (label-only — prices are still sent as PKR) ── */
export const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED", "SAR"];

/* ── Preset values shown while a Price field is focused ── */
export const PRICE_PRESETS = [
  500000,
  1000000,
  2000000,
  3500000,
  5000000,
  7500000,
  10000000,
  15000000,
  20000000,
  30000000,
  50000000,
];