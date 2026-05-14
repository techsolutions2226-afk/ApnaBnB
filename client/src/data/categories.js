/* ─── Category definitions for home page filter bar ───
   Each category has an icon name (from react-icons), label, and a filter function.
   The filter function receives a property object and returns true/false.
   Property schema: { propertyType, price, rating, reviews, isGuestFav, amenities[], listedBy, bedrooms, size, sizeUnit }
   ─────────────────────────────────────────────── */

const categories = [
  {
    id: "all",
    label: "All",
    icon: "FiGrid",
    filter: () => true,
  },
  {
    id: "trending",
    label: "Trending",
    icon: "FiTrendingUp",
    filter: (p) => p.reviews >= 40,
  },
  {
    id: "guest-favorites",
    label: "Guest favorites",
    icon: "FiAward",
    filter: (p) => p.isGuestFav,
  },
  {
    id: "top-rated",
    label: "Top rated",
    icon: "FiStar",
    filter: (p) => p.rating >= 4.9,
  },
  {
    id: "houses",
    label: "Houses",
    icon: "FiHome",
    filter: (p) => p.propertyType === "House",
  },
  {
    id: "apartments",
    label: "Apartments",
    icon: "FiLayers",
    filter: (p) => p.propertyType === "Apartment",
  },
  {
    id: "luxury",
    label: "Luxury",
    icon: "FiStar",
    filter: (p) => p.price >= 50000000,
  },
  {
    id: "budget",
    label: "Budget-friendly",
    icon: "FiDollarSign",
    filter: (p) => p.price < 20000000,
  },
  {
    id: "verified-seller",
    label: "Verified seller",
    icon: "FiShield",
    filter: (p) => p.listedBy?.verified === true,
  },
  {
    id: "with-parking",
    label: "Parking",
    icon: "FiTruck",
    filter: (p) =>
      p.amenities?.some((a) =>
        a.toLowerCase().includes("parking")
      ),
  },
  {
    id: "with-garden",
    label: "Garden",
    icon: "FiSunrise",
    filter: (p) =>
      p.amenities?.some((a) =>
        a.toLowerCase().includes("garden")
      ),
  },
  {
    id: "big-homes",
    label: "Big homes",
    icon: "FiMaximize",
    filter: (p) => p.bedrooms >= 4,
  },
  {
    id: "new",
    label: "New",
    icon: "FiZap",
    filter: (p) => p.reviews < 15,
  },
  {
    id: "karachi",
    label: "Karachi",
    icon: "FiMapPin",
    filter: (p) => p.city === "Karachi",
  },
  {
    id: "lahore",
    label: "Lahore",
    icon: "FiMapPin",
    filter: (p) => p.city === "Lahore",
  },
  {
    id: "islamabad",
    label: "Islamabad",
    icon: "FiMapPin",
    filter: (p) => p.city === "Islamabad",
  },
];

export default categories;
