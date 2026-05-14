/* ─── Deal tracking data ───
   Tracks completed, in-progress, and cancelled property deals.
   Links buyers, sellers, dealers, and properties together.
   Used by dashboards and admin panel.
   ─────────────────────────────────────────────── */

const deals = [
  {
    id: "deal-1",
    propertyId: "lhr-5",
    listingId: "list-5",
    type: "seller-buyer",
    sellerId: "user-1",
    buyerId: "user-4",
    dealerId: null,
    agreedPrice: 23500000,
    commission: 470000,
    status: "completed",
    startedAt: "2025-09-10",
    completedAt: "2025-11-15",
    notes: "Smooth transaction. Buyer financed through bank loan.",
  },
  {
    id: "deal-2",
    propertyId: "khi-5",
    listingId: "list-19",
    type: "dealer-buyer",
    sellerId: "user-9",
    buyerId: "user-2",
    dealerId: "user-3",
    agreedPrice: 32000000,
    commission: 640000,
    status: "completed",
    startedAt: "2025-08-01",
    completedAt: "2025-10-20",
    notes: "Dealer Omar facilitated. Full cash deal.",
  },
  {
    id: "deal-3",
    propertyId: "lhr-1",
    listingId: "list-1",
    type: "seller-buyer",
    sellerId: "user-1",
    buyerId: "user-2",
    dealerId: null,
    agreedPrice: 40000000,
    commission: 0,
    status: "in_progress",
    startedAt: "2026-03-10",
    completedAt: null,
    notes: "Price negotiation in progress. Buyer visited property twice.",
  },
  {
    id: "deal-4",
    propertyId: "isb-5",
    listingId: "list-12",
    type: "dealer-buyer",
    sellerId: "user-6",
    buyerId: "user-10",
    dealerId: "user-5",
    agreedPrice: 85000000,
    commission: 1700000,
    status: "in_progress",
    startedAt: "2026-02-28",
    completedAt: null,
    notes: "Premium deal. Bilal managing documentation and transfer process.",
  },
  {
    id: "deal-5",
    propertyId: "khi-4",
    listingId: "list-18",
    type: "dealer-dealer",
    sellerId: "user-9",
    buyerId: "user-7",
    dealerId: "user-3",
    coBrokerId: "user-8",
    agreedPrice: 17500000,
    commission: 350000,
    status: "in_progress",
    startedAt: "2026-03-11",
    completedAt: null,
    notes: "Co-brokering deal between Omar (Karachi) and Nadia (Lahore). Client visiting next week.",
  },
  {
    id: "deal-6",
    propertyId: "isb-3",
    listingId: "list-10",
    type: "seller-buyer",
    sellerId: "user-6",
    buyerId: "user-7",
    dealerId: null,
    agreedPrice: 8500000,
    commission: 0,
    status: "cancelled",
    startedAt: "2026-01-15",
    completedAt: null,
    cancelledAt: "2026-02-10",
    cancelReason: "Buyer found documentation issues with title deed.",
    notes: "Seller is resolving mutation paperwork.",
  },
];

export const getDealsByUserId = (userId) =>
  deals.filter(
    (d) =>
      d.sellerId === userId ||
      d.buyerId === userId ||
      d.dealerId === userId ||
      d.coBrokerId === userId
  );

export const getDealById = (id) => deals.find((d) => d.id === id) || null;

export const getDealsByStatus = (status) =>
  deals.filter((d) => d.status === status);

export const getDealsByPropertyId = (propertyId) =>
  deals.filter((d) => d.propertyId === propertyId);

export default deals;
