// Mirror of client/src/data/matches.js. The Match schema has a single `initiator`
// field — the seed script picks the buyer for seller-buyer/dealer-buyer matches
// and dealerA for dealer-dealer matches. `notes` carries the mock summary.
// Mock status "active" is mapped to "accepted" by the seed script.

module.exports = [
  // Seller ↔ Buyer
  {
    id: "match-1",
    type: "seller-buyer",
    propertyId: "lhr-2",
    requirementId: "req-b-2",
    initiatorId: "user-4", // buyer
    matchScore: 92,
    summary: "2 bed apartment in DHA matches Gulberg budget & spec.",
    status: "active",
  },
  {
    id: "match-2",
    type: "seller-buyer",
    propertyId: "isb-1",
    requirementId: "req-b-1",
    initiatorId: "user-2", // buyer
    matchScore: 78,
    summary: "F-7 apartment close to F-10 requirement, slightly smaller.",
    status: "active",
  },
  {
    id: "match-3",
    type: "seller-buyer",
    propertyId: "khi-1",
    requirementId: "req-b-3",
    initiatorId: "user-7", // buyer
    matchScore: 85,
    summary: "Sea-facing Clifton apartment matches Karachi home requirement.",
    status: "active",
  },

  // Dealer ↔ Buyer
  {
    id: "match-4",
    type: "dealer-buyer",
    propertyId: "khi-4",
    requirementId: "req-b-4",
    initiatorId: "user-7", // buyer
    matchScore: 84,
    summary: "Budget-friendly flat in North Nazimabad, close to requirement.",
    status: "active",
  },
  {
    id: "match-5",
    type: "dealer-buyer",
    propertyId: "isb-5",
    requirementId: "req-b-5",
    initiatorId: "user-10", // buyer
    matchScore: 90,
    summary: "Luxury penthouse matches premium investment requirement.",
    status: "active",
  },
  {
    id: "match-6",
    type: "dealer-buyer",
    propertyId: "lhr-6",
    requirementId: "req-b-6",
    initiatorId: "user-10", // buyer
    matchScore: 82,
    summary: "Bahria Town house fits Lahore investment criteria.",
    status: "active",
  },

  // Dealer ↔ Dealer (co-brokering)
  {
    id: "match-7",
    type: "dealer-dealer",
    propertyId: "isb-7",
    requirementId: "req-d-2",
    initiatorId: "user-5", // dealer A
    matchScore: 88,
    summary: "Blue Area executive suite matches corporate client needs.",
    status: "active",
  },
  {
    id: "match-8",
    type: "dealer-dealer",
    propertyId: "khi-4",
    requirementId: "req-d-3",
    initiatorId: "user-3", // dealer A
    matchScore: 80,
    summary: "North Nazimabad flat matches Nadia's Lahore client need.",
    status: "pending",
  },
  {
    id: "match-9",
    type: "dealer-dealer",
    propertyId: "lhr-6",
    requirementId: "req-d-4",
    initiatorId: "user-8", // dealer A
    matchScore: 86,
    summary: "Bahria Town house fits Bilal's investor client profile.",
    status: "active",
  },
];
