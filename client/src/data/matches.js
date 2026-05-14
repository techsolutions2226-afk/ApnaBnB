/* ─── Match data — connects listings to requirements ───
   Covers all 3 connection types: seller↔buyer, dealer↔buyer, dealer↔dealer.
   listingId references listings.js (list-*) IDs.
   requirementId references requirements.js (req-b-*, req-d-*) IDs.
   ─────────────────────────────────────────────── */

const matches = [
  /* ── Seller ↔ Buyer matches ── */
  {
    id: "match-1",
    type: "seller-buyer",
    listingId: "list-2",
    propertyId: "lhr-2",
    requirementId: "req-b-2",
    sellerId: "user-1",
    buyerId: "user-4",
    matchScore: 92,
    summary: "2 bed apartment in DHA matches Gulberg budget & spec.",
    status: "active",
    createdAt: "2026-02-20",
  },
  {
    id: "match-2",
    type: "seller-buyer",
    listingId: "list-8",
    propertyId: "isb-1",
    requirementId: "req-b-1",
    sellerId: "user-6",
    buyerId: "user-2",
    matchScore: 78,
    summary: "F-7 apartment close to F-10 requirement, slightly smaller.",
    status: "active",
    createdAt: "2026-02-22",
  },
  {
    id: "match-3",
    type: "seller-buyer",
    listingId: "list-15",
    propertyId: "khi-1",
    requirementId: "req-b-3",
    sellerId: "user-9",
    buyerId: "user-7",
    matchScore: 85,
    summary: "Sea-facing Clifton apartment matches Karachi home requirement.",
    status: "active",
    createdAt: "2026-02-25",
  },

  /* ── Dealer ↔ Buyer matches ── */
  {
    id: "match-4",
    type: "dealer-buyer",
    listingId: "list-18",
    propertyId: "khi-4",
    requirementId: "req-b-4",
    dealerId: "user-3",
    buyerId: "user-7",
    matchScore: 84,
    summary: "Budget-friendly flat in North Nazimabad, close to requirement.",
    status: "active",
    createdAt: "2026-02-21",
  },
  {
    id: "match-5",
    type: "dealer-buyer",
    listingId: "list-12",
    propertyId: "isb-5",
    requirementId: "req-b-5",
    dealerId: "user-5",
    buyerId: "user-10",
    matchScore: 90,
    summary: "Luxury penthouse matches premium investment requirement.",
    status: "active",
    createdAt: "2026-02-26",
  },
  {
    id: "match-6",
    type: "dealer-buyer",
    listingId: "list-6",
    propertyId: "lhr-6",
    requirementId: "req-b-6",
    dealerId: "user-8",
    buyerId: "user-10",
    matchScore: 82,
    summary: "Bahria Town house fits Lahore investment criteria.",
    status: "active",
    createdAt: "2026-03-01",
  },

  /* ── Dealer ↔ Dealer matches (co-brokering) ── */
  {
    id: "match-7",
    type: "dealer-dealer",
    listingId: "list-14",
    propertyId: "isb-7",
    requirementId: "req-d-2",
    dealerAId: "user-5",
    dealerBId: "user-3",
    matchScore: 88,
    summary: "Blue Area executive suite matches corporate client needs.",
    status: "active",
    createdAt: "2026-02-22",
  },
  {
    id: "match-8",
    type: "dealer-dealer",
    listingId: "list-18",
    propertyId: "khi-4",
    requirementId: "req-d-3",
    dealerAId: "user-3",
    dealerBId: "user-8",
    matchScore: 80,
    summary: "North Nazimabad flat matches Nadia's Lahore client need.",
    status: "pending",
    createdAt: "2026-03-05",
  },
  {
    id: "match-9",
    type: "dealer-dealer",
    listingId: "list-6",
    propertyId: "lhr-6",
    requirementId: "req-d-4",
    dealerAId: "user-8",
    dealerBId: "user-5",
    matchScore: 86,
    summary: "Bahria Town house fits Bilal's investor client profile.",
    status: "active",
    createdAt: "2026-03-08",
  },
];

export const getMatchesByRequirementId = (requirementId) =>
  matches.filter((m) => m.requirementId === requirementId);

export const getMatchesByListingId = (listingId) =>
  matches.filter((m) => m.listingId === listingId);

export const getMatchesByType = (type) =>
  matches.filter((m) => m.type === type);

export const getMatchesByUserId = (userId) =>
  matches.filter(
    (m) =>
      m.sellerId === userId ||
      m.buyerId === userId ||
      m.dealerId === userId ||
      m.dealerAId === userId ||
      m.dealerBId === userId
  );

export const getActiveMatches = () =>
  matches.filter((m) => m.status === "active");

export default matches;
