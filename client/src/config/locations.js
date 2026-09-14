/* ─── locations.js — shared Pakistani city / area data ───
   Single source of truth for every city and area list in the app: the
   Create Listing form, Post / Edit Requirement, Google signup details and the
   home search bar all read from here. Edit here, every place follows.
   ─────────────────────────────────────────────── */

/* Cities offered by the listing / requirement forms — the ones with an area
   list below, plus the "Other" free-text fallback. */
export const CITIES = [
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
export const AREAS_BY_CITY = {
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

/* Home search "City" / "Where" destinations — major cities first, then the
   rest. A superset of CITIES (minus "Other"). */
export const SEARCH_CITIES = [
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

// Map centre per city — the LocationPicker default when there is no pin yet.
export const CITY_CENTERS = {
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
export const AREA_CENTERS = {
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
