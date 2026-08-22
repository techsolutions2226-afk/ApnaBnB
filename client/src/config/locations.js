/* ─── locations.js — shared Pakistani city / area options ───
   Extracted verbatim from ListingForm.jsx so the Google signup flow can offer
   the same city + area pickers the Create Listing page uses. Single source of
   truth: edit here, both places follow.
   ─────────────────────────────────────────────── */

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
