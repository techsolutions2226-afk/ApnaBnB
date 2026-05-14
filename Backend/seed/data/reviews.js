// Mirror of client/src/data/reviews.js — only reviews with a `userId` are kept,
// since the Review schema requires `reviewer` to be a real User ObjectId. Mock
// reviews from external/anonymous reviewers (no `userId`) are dropped.
// All seeded reviews target a property (targetType: 'property').

module.exports = [
  // lhr-1 (Gulberg III)
  { id: "rev-1",  propertyId: "lhr-1", userId: "user-2",  rating: 5, text: "Visited this beautiful Gulberg III property with my family. Ahmad was an incredibly transparent seller — he shared all ownership documents upfront. The house is well-maintained with great ventilation." },
  { id: "rev-2",  propertyId: "lhr-1", userId: "user-3",  rating: 5, text: "As a dealer I've seen many properties in Gulberg. This one stands out — genuine 10 Marla, all documents verified, and Ahmad is very cooperative. Highly recommend for serious buyers." },
  { id: "rev-3",  propertyId: "lhr-1", userId: "user-4",  rating: 5, text: "Perfect for families! The house has generous room sizes, a lovely garden, and secure parking. Ahmad was very responsive and even arranged a second visit when we brought our parents." },
  { id: "rev-4",  propertyId: "lhr-1", userId: "user-5",  rating: 5, text: "One of the best-maintained properties I've dealt with in Lahore. Clear title, proper boundary walls, backup power — everything a buyer needs. Ahmad is a reliable seller." },

  // lhr-2 (DHA Phase 5)
  { id: "rev-6",  propertyId: "lhr-2", userId: "user-10", rating: 5, text: "Stunning DHA apartment with modern finishes. The floor-to-ceiling windows bring in natural light. All documentation was in order — ready for transfer. Great investment potential." },

  // lhr-3 (Johar Town)
  { id: "rev-31", propertyId: "lhr-3", userId: "user-8",  rating: 5, text: "Good family home in Johar Town. My client was pleased with the construction quality and ample parking space. The area has excellent schools and hospitals nearby." },

  // lhr-6 (Garden Town)
  { id: "rev-28", propertyId: "lhr-6", userId: "user-10", rating: 5, text: "Bahria Town is always a good investment and this house is no exception. Gated community, excellent infrastructure, and the house is well-constructed. Great for families and investors alike." },

  // lhr-7 (Cantt villa)
  { id: "rev-9",  propertyId: "lhr-7", userId: "user-3",  rating: 5, text: "This 1 Kanal villa is incredible! Full basement, beautiful garden, and premium construction quality. My clients were very impressed. The Cantt area adds excellent resale value." },

  // isb-1 (F-7)
  { id: "rev-12", propertyId: "isb-1", userId: "user-4",  rating: 5, text: "Charming apartment in the heart of F-7. The seller was very transparent about the building's age and maintenance costs. Walking distance to Jinnah Super market — location doesn't get better." },

  // isb-3 (E-11)
  { id: "rev-30", propertyId: "isb-3", userId: "user-7",  rating: 5, text: "Compact but well-designed studio in G-11. Perfect for a single professional or student. The price point is very reasonable for Islamabad. Seller was responsive and helpful." },

  // isb-5 (F-6 penthouse)
  { id: "rev-15", propertyId: "isb-5", userId: "user-2",  rating: 5, text: "This is by far the most luxurious property I've seen in Islamabad. The marble flooring, rooftop terrace, and Margalla Hills views are breathtaking. Bilal handled everything professionally." },

  // isb-7 (Blue Area)
  { id: "rev-26", propertyId: "isb-7", userId: "user-5",  rating: 5, text: "Premium commercial-grade property in Blue Area. Perfect for corporate clients. The suite is modern, well-designed, and has excellent road frontage. All permits in order." },

  // khi-1 (Clifton)
  { id: "rev-17", propertyId: "khi-1", userId: "user-7",  rating: 5, text: "The sea-facing views from this apartment are breathtaking! As a first-time buyer, I appreciated how the seller walked me through all the documentation. Clifton is a dream location." },

  // khi-2 (Saddar)
  { id: "rev-20", propertyId: "khi-2", userId: "user-3",  rating: 5, text: "Best budget option in Karachi for first-time buyers. The Saddar area is bustling with activity and well-connected. Clean property with proper ventilation. Good value for the price." },

  // khi-4 (DHA Phase 6)
  { id: "rev-23", propertyId: "khi-4", userId: "user-8",  rating: 5, text: "Solid 2 bed flat in a well-established area. Omar (dealer) was very professional and had all the documentation ready. My client from Lahore was very satisfied with the visit." },
];
