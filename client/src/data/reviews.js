/* ─── Sample reviews data ───
   ~30 reviews distributed across real properties only (lhr-*, isb-*, khi-*).
   Each reviewed property has category ratings.
   All userId references map to real users in users.js.
   ─────────────────────────────────────────────── */

/* ── Category ratings per property (out of 5) ── */
export const propertyCategoryRatings = {
  "lhr-1": {
    cleanliness: 4.9,
    accuracy: 5.0,
    communication: 5.0,
    location: 4.8,
    value: 4.9,
    documentation: 4.9,
  },
  "lhr-2": {
    cleanliness: 5.0,
    accuracy: 5.0,
    communication: 5.0,
    location: 5.0,
    value: 5.0,
    documentation: 5.0,
  },
  "lhr-3": {
    cleanliness: 5.0,
    accuracy: 4.9,
    communication: 5.0,
    location: 4.9,
    value: 5.0,
    documentation: 4.8,
  },
  "lhr-7": {
    cleanliness: 4.9,
    accuracy: 4.8,
    communication: 4.9,
    location: 4.8,
    value: 4.7,
    documentation: 4.8,
  },
  "isb-1": {
    cleanliness: 5.0,
    accuracy: 5.0,
    communication: 5.0,
    location: 5.0,
    value: 5.0,
    documentation: 5.0,
  },
  "isb-3": {
    cleanliness: 5.0,
    accuracy: 5.0,
    communication: 5.0,
    location: 4.9,
    value: 5.0,
    documentation: 4.9,
  },
  "isb-5": {
    cleanliness: 5.0,
    accuracy: 5.0,
    communication: 5.0,
    location: 5.0,
    value: 5.0,
    documentation: 5.0,
  },
  "khi-1": {
    cleanliness: 5.0,
    accuracy: 5.0,
    communication: 5.0,
    location: 5.0,
    value: 4.9,
    documentation: 5.0,
  },
  "khi-2": {
    cleanliness: 4.9,
    accuracy: 4.9,
    communication: 5.0,
    location: 4.8,
    value: 5.0,
    documentation: 4.7,
  },
  "khi-4": {
    cleanliness: 4.8,
    accuracy: 4.9,
    communication: 4.8,
    location: 4.7,
    value: 4.9,
    documentation: 4.8,
  },
  "isb-7": {
    cleanliness: 5.0,
    accuracy: 5.0,
    communication: 5.0,
    location: 5.0,
    value: 4.8,
    documentation: 5.0,
  },
  "lhr-6": {
    cleanliness: 4.9,
    accuracy: 4.8,
    communication: 4.9,
    location: 4.9,
    value: 4.8,
    documentation: 4.7,
  },
};

/* ── Individual reviews ── */
const reviews = [
  /* ── lhr-1 (10 Marla House in Gulberg III) ── */
  {
    id: "rev-1",
    propertyId: "lhr-1",
    userId: "user-2",
    userName: "Fatima",
    userAvatar: "https://i.pravatar.cc/150?u=fatima-ali",
    rating: 5,
    date: "2025-11-15",
    text: "Visited this beautiful Gulberg III property with my family. Ahmad was an incredibly transparent seller — he shared all ownership documents upfront. The house is well-maintained with great ventilation.",
  },
  {
    id: "rev-2",
    propertyId: "lhr-1",
    userId: "user-3",
    userName: "Omar",
    userAvatar: "https://i.pravatar.cc/150?u=omar-siddiqui",
    rating: 5,
    date: "2025-10-28",
    text: "As a dealer I've seen many properties in Gulberg. This one stands out — genuine 10 Marla, all documents verified, and Ahmad is very cooperative. Highly recommend for serious buyers.",
  },
  {
    id: "rev-3",
    propertyId: "lhr-1",
    userId: "user-4",
    userName: "Sara",
    userAvatar: "https://i.pravatar.cc/150?u=sara-malik",
    rating: 5,
    date: "2025-09-14",
    text: "Perfect for families! The house has generous room sizes, a lovely garden, and secure parking. Ahmad was very responsive and even arranged a second visit when we brought our parents.",
  },
  {
    id: "rev-4",
    propertyId: "lhr-1",
    userId: "user-5",
    userName: "Bilal",
    userAvatar: "https://i.pravatar.cc/150?u=bilal-ahmed",
    rating: 5,
    date: "2025-08-02",
    text: "One of the best-maintained properties I've dealt with in Lahore. Clear title, proper boundary walls, backup power — everything a buyer needs. Ahmad is a reliable seller.",
  },
  {
    id: "rev-5",
    propertyId: "lhr-1",
    userName: "Hira",
    userAvatar: "https://i.pravatar.cc/150?u=hira",
    rating: 4,
    date: "2025-07-18",
    text: "Good property overall. The Gulberg location is unbeatable. Only concern was the street noise, but internal walls are thick enough to dampen it. Fair pricing for the area.",
  },

  /* ── lhr-2 (2 Bed Apartment in DHA Phase 5) ── */
  {
    id: "rev-6",
    propertyId: "lhr-2",
    userId: "user-10",
    userName: "Ayesha",
    userAvatar: "https://i.pravatar.cc/150?u=ayesha-nawaz",
    rating: 5,
    date: "2025-12-01",
    text: "Stunning DHA apartment with modern finishes. The floor-to-ceiling windows bring in natural light. All documentation was in order — ready for transfer. Great investment potential.",
  },
  {
    id: "rev-7",
    propertyId: "lhr-2",
    userName: "Noor",
    userAvatar: "https://i.pravatar.cc/150?u=noor",
    rating: 5,
    date: "2025-11-10",
    text: "Flawless visit. The apartment is exactly as described in the listing — no surprises. DHA Phase 5 is well-maintained and secure. Documentation process was smooth.",
  },
  {
    id: "rev-8",
    propertyId: "lhr-2",
    userName: "Zain",
    userAvatar: "https://i.pravatar.cc/150?u=zain",
    rating: 5,
    date: "2025-10-05",
    text: "Modern 2 bed apartment perfect for young professionals or small families. Lift, generator backup, and secure parking included. The DHA community is a big plus.",
  },

  /* ── lhr-7 (1 Kanal Villa in Cantt) ── */
  {
    id: "rev-9",
    propertyId: "lhr-7",
    userId: "user-3",
    userName: "Omar",
    userAvatar: "https://i.pravatar.cc/150?u=omar-siddiqui",
    rating: 5,
    date: "2025-11-22",
    text: "This 1 Kanal villa is incredible! Full basement, beautiful garden, and premium construction quality. My clients were very impressed. The Cantt area adds excellent resale value.",
  },
  {
    id: "rev-10",
    propertyId: "lhr-7",
    userName: "Amina",
    userAvatar: "https://i.pravatar.cc/150?u=amina",
    rating: 5,
    date: "2025-10-15",
    text: "Luxurious villa with every amenity you could ask for. The pool was clean and well-maintained. Garden is spacious enough for events. This is a premium property through and through.",
  },
  {
    id: "rev-11",
    propertyId: "lhr-7",
    userName: "Raza",
    userAvatar: "https://i.pravatar.cc/150?u=raza",
    rating: 4,
    date: "2025-09-03",
    text: "Beautiful property with lots of character. Some rooms could use a refresh, but the structure and location are excellent. Would be a solid deal if priced slightly lower.",
  },

  /* ── isb-1 (Apartment in F-7) ── */
  {
    id: "rev-12",
    propertyId: "isb-1",
    userId: "user-4",
    userName: "Sara",
    userAvatar: "https://i.pravatar.cc/150?u=sara-malik",
    rating: 5,
    date: "2025-12-10",
    text: "Charming apartment in the heart of F-7. The seller was very transparent about the building's age and maintenance costs. Walking distance to Jinnah Super market — location doesn't get better.",
  },
  {
    id: "rev-13",
    propertyId: "isb-1",
    userName: "Danish",
    userAvatar: "https://i.pravatar.cc/150?u=danish",
    rating: 5,
    date: "2025-11-05",
    text: "Perfect location, reliable seller, smooth process. The apartment was well-maintained and the F-7 area is secure and peaceful. Highly recommend for Islamabad buyers.",
  },
  {
    id: "rev-14",
    propertyId: "isb-1",
    userName: "Mehak",
    userAvatar: "https://i.pravatar.cc/150?u=mehak",
    rating: 5,
    date: "2025-09-28",
    text: "Delightful property with tasteful interiors. F-7 is one of the best sectors in Islamabad for families. Clear documentation and cooperative seller made the process easy.",
  },

  /* ── isb-5 (Luxury Penthouse in F-6) ── */
  {
    id: "rev-15",
    propertyId: "isb-5",
    userId: "user-2",
    userName: "Fatima",
    userAvatar: "https://i.pravatar.cc/150?u=fatima-ali",
    rating: 5,
    date: "2025-12-05",
    text: "This is by far the most luxurious property I've seen in Islamabad. The marble flooring, rooftop terrace, and Margalla Hills views are breathtaking. Bilal handled everything professionally.",
  },
  {
    id: "rev-16",
    propertyId: "isb-5",
    userName: "Usman K.",
    userAvatar: "https://i.pravatar.cc/150?u=usmank",
    rating: 5,
    date: "2025-11-18",
    text: "Premium property in a premium location. F-6 is unbeatable and this penthouse is the crown jewel. The dealer was professional and all documents were in order. Worth the price.",
  },

  /* ── khi-1 (Sea-facing Apartment in Clifton) ── */
  {
    id: "rev-17",
    propertyId: "khi-1",
    userId: "user-7",
    userName: "Hamza",
    userAvatar: "https://i.pravatar.cc/150?u=hamza-tariq",
    rating: 5,
    date: "2025-11-30",
    text: "The sea-facing views from this apartment are breathtaking! As a first-time buyer, I appreciated how the seller walked me through all the documentation. Clifton is a dream location.",
  },
  {
    id: "rev-18",
    propertyId: "khi-1",
    userName: "Sadia",
    userAvatar: "https://i.pravatar.cc/150?u=sadia",
    rating: 5,
    date: "2025-10-22",
    text: "Fantastic apartment with incredible ocean views. The interiors are modern and well-maintained. Easy access to Seaview and Do Darya. Secure building with proper elevator.",
  },
  {
    id: "rev-19",
    propertyId: "khi-1",
    userName: "Waqar",
    userAvatar: "https://i.pravatar.cc/150?u=waqar",
    rating: 5,
    date: "2025-09-10",
    text: "Premium apartment in a prime Clifton location. Secure parking, modern lifts, and genuine documentation. The seller was very professional and accommodating during visits.",
  },

  /* ── khi-2 (Room in Saddar) ── */
  {
    id: "rev-20",
    propertyId: "khi-2",
    userId: "user-3",
    userName: "Omar",
    userAvatar: "https://i.pravatar.cc/150?u=omar-siddiqui",
    rating: 5,
    date: "2025-12-08",
    text: "Best budget option in Karachi for first-time buyers. The Saddar area is bustling with activity and well-connected. Clean property with proper ventilation. Good value for the price.",
  },
  {
    id: "rev-21",
    propertyId: "khi-2",
    userName: "Taimur",
    userAvatar: "https://i.pravatar.cc/150?u=taimur",
    rating: 5,
    date: "2025-11-14",
    text: "Great value for money! The room was much nicer than expected at this price point. Saddar has excellent public transport connectivity. Documentation was straightforward.",
  },
  {
    id: "rev-22",
    propertyId: "khi-2",
    userName: "Aliya",
    userAvatar: "https://i.pravatar.cc/150?u=aliya",
    rating: 4,
    date: "2025-10-02",
    text: "Good property for the price. Saddar can be noisy but that's the trade-off for this location. The seller was transparent about the building condition.",
  },

  /* ── khi-4 (2 Bed Flat in North Nazimabad) ── */
  {
    id: "rev-23",
    propertyId: "khi-4",
    userId: "user-8",
    userName: "Nadia",
    userAvatar: "https://i.pravatar.cc/150?u=nadia-hussain",
    rating: 5,
    date: "2025-12-15",
    text: "Solid 2 bed flat in a well-established area. Omar (dealer) was very professional and had all the documentation ready. My client from Lahore was very satisfied with the visit.",
  },
  {
    id: "rev-24",
    propertyId: "khi-4",
    userName: "Rania",
    userAvatar: "https://i.pravatar.cc/150?u=rania",
    rating: 5,
    date: "2025-11-08",
    text: "Well-maintained flat in North Nazimabad. The neighborhood is family-friendly and well-connected. Fair pricing for the area and size. Would recommend to budget-conscious buyers.",
  },
  {
    id: "rev-25",
    propertyId: "khi-4",
    userName: "Adeel",
    userAvatar: "https://i.pravatar.cc/150?u=adeel",
    rating: 4,
    date: "2025-10-18",
    text: "Good apartment in a decent location. North Nazimabad has good amenities nearby. The kitchen could use updating but the bedrooms are spacious. Overall a fair deal.",
  },

  /* ── isb-7 (Executive Suite in Blue Area) ── */
  {
    id: "rev-26",
    propertyId: "isb-7",
    userId: "user-5",
    userName: "Bilal",
    userAvatar: "https://i.pravatar.cc/150?u=bilal-ahmed",
    rating: 5,
    date: "2025-12-20",
    text: "Premium commercial-grade property in Blue Area. Perfect for corporate clients. The suite is modern, well-designed, and has excellent road frontage. All permits in order.",
  },
  {
    id: "rev-27",
    propertyId: "isb-7",
    userName: "Laiba",
    userAvatar: "https://i.pravatar.cc/150?u=laiba",
    rating: 5,
    date: "2025-11-25",
    text: "Impressive property in Islamabad's prime business district. Modern interiors and secure building. The Blue Area address alone adds significant value.",
  },

  /* ── lhr-6 (House in Bahria Town) ── */
  {
    id: "rev-28",
    propertyId: "lhr-6",
    userId: "user-10",
    userName: "Ayesha",
    userAvatar: "https://i.pravatar.cc/150?u=ayesha-nawaz",
    rating: 5,
    date: "2025-12-12",
    text: "Bahria Town is always a good investment and this house is no exception. Gated community, excellent infrastructure, and the house is well-constructed. Great for families and investors alike.",
  },
  {
    id: "rev-29",
    propertyId: "lhr-6",
    userName: "Naveed",
    userAvatar: "https://i.pravatar.cc/150?u=naveed",
    rating: 5,
    date: "2025-11-03",
    text: "Visited this Bahria Town property for my client. The community is well-maintained, security is top-notch, and the house itself is spacious with quality construction materials used throughout.",
  },

  /* ── isb-3 (Studio in G-11) ── */
  {
    id: "rev-30",
    propertyId: "isb-3",
    userId: "user-7",
    userName: "Hamza",
    userAvatar: "https://i.pravatar.cc/150?u=hamza-tariq",
    rating: 5,
    date: "2025-12-18",
    text: "Compact but well-designed studio in G-11. Perfect for a single professional or student. The price point is very reasonable for Islamabad. Seller was responsive and helpful.",
  },
  {
    id: "rev-31",
    propertyId: "lhr-3",
    userId: "user-8",
    userName: "Nadia",
    userAvatar: "https://i.pravatar.cc/150?u=nadia-hussain",
    rating: 5,
    date: "2025-10-20",
    text: "Good family home in Johar Town. My client was pleased with the construction quality and ample parking space. The area has excellent schools and hospitals nearby.",
  },
];

export const getReviewsByPropertyId = (propertyId) =>
  reviews.filter((r) => r.propertyId === propertyId);

export const getReviewsByUserId = (userId) =>
  reviews.filter((r) => r.userId === userId);

export const getCategoryRatings = (propertyId) =>
  propertyCategoryRatings[propertyId] || null;

/* Compute overall average from category ratings for a property */
export const getOverallAverage = (propertyId) => {
  const cats = propertyCategoryRatings[propertyId];
  if (!cats) return null;
  const values = Object.values(cats);
  if (values.length === 0) return null;
  return +(values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
};

export default reviews;
