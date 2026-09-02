// Grouped amenity catalogue — mirrors zameen.com's amenities section.
// Each amenity is a plain string; the group label is UI-only.
// Shared between the Create Listing form and the search/filter modal so the
// amenity vocabulary stays identical across the app.
export const AMENITY_GROUPS = [
  {
    label: "Main Features",
    items: [
      "Drawing room",
      "Dining room",
      "Kitchen",
      "Study room",
      "Prayer room",
      "Powder room",
      "TV lounge",
      "Servant quarter",
      "Store room",
      "Lobby in building",
    ],
  },
  {
    label: "Business & Communication",
    items: ["Broadband internet", "Satellite cable TV", "Intercom", "Wi-Fi"],
  },
  {
    label: "Community Features",
    items: [
      "Community lawn",
      "Community swimming pool",
      "Community gym",
      "Mosque",
      "Daycare",
      "Kids play area",
    ],
  },
  {
    label: "Healthcare",
    items: ["Nearby hospital", "Nearby pharmacy", "First aid kit"],
  },
  {
    label: "Nearby Locations",
    items: [
      "Nearby schools",
      "Nearby restaurants",
      "Nearby shopping mall",
      "Nearby public transport",
      "Nearby park",
    ],
  },
  {
    label: "Other Facilities",
    items: [
      "Lift / Elevator",
      "Backup power",
      "Generator",
      "Solar panels",
      "Parking",
      "Underground parking",
      "Security",
      "CCTV",
      "Garden",
      "Maintenance staff",
      "Corner plot",
      "Boundary wall",
    ],
  },
];
