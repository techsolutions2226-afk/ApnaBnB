/* ─── Sample wishlist data ───
   Used by WishlistContext and wishlist pages.
   Each wishlist is a named collection of saved property IDs.
   All propertyIds reference real properties (lhr-*, isb-*, khi-*).
   ─────────────────────────────────────────────── */

const wishlists = [
  {
    id: "wl-1",
    userId: "user-2",
    name: "Dream Homes",
    coverImage:
      "https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=400&q=80",
    propertyIds: ["lhr-1", "isb-5", "khi-1"],
    createdAt: "2025-06-10",
  },
  {
    id: "wl-2",
    userId: "user-2",
    name: "Islamabad Shortlist",
    coverImage:
      "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=400&q=80",
    propertyIds: ["isb-1", "isb-3", "isb-5", "isb-7"],
    createdAt: "2025-04-18",
  },
  {
    id: "wl-3",
    userId: "user-4",
    name: "Lahore Apartments",
    coverImage:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80",
    propertyIds: ["lhr-2", "lhr-3", "lhr-5"],
    createdAt: "2025-05-03",
  },
  {
    id: "wl-4",
    userId: "user-4",
    name: "Family Homes",
    coverImage:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80",
    propertyIds: ["lhr-1", "lhr-6", "lhr-7", "isb-2"],
    createdAt: "2025-03-22",
  },
  {
    id: "wl-5",
    userId: "user-7",
    name: "Budget Picks",
    coverImage:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    propertyIds: ["khi-2", "khi-3", "isb-4", "lhr-4"],
    createdAt: "2025-07-01",
  },
  {
    id: "wl-6",
    userId: "user-7",
    name: "Karachi Options",
    coverImage:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80",
    propertyIds: ["khi-1", "khi-4", "khi-5", "khi-6"],
    createdAt: "2025-08-05",
  },
  {
    id: "wl-7",
    userId: "user-10",
    name: "Investment Properties",
    coverImage:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=80",
    propertyIds: ["lhr-2", "isb-7", "khi-1", "khi-5"],
    createdAt: "2025-01-30",
  },
  {
    id: "wl-8",
    userId: "user-10",
    name: "Lahore & Islamabad",
    coverImage:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80",
    propertyIds: ["lhr-1", "lhr-6", "isb-1", "isb-5"],
    createdAt: "2025-09-12",
  },
  {
    id: "wl-9",
    userId: "user-1",
    name: "Competitor Watch",
    coverImage:
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&q=80",
    propertyIds: ["lhr-7", "isb-3", "khi-4"],
    createdAt: "2025-07-28",
  },
  {
    id: "wl-10",
    userId: "user-3",
    name: "Deals Pipeline",
    coverImage:
      "https://images.unsplash.com/photo-1615800098779-1be32e60cca3?w=400&q=80",
    propertyIds: ["khi-2", "khi-4", "khi-6", "isb-4"],
    createdAt: "2025-10-15",
  },
];

export const getWishlistsByUserId = (userId) =>
  wishlists.filter((w) => w.userId === userId);

export const getWishlistById = (id) =>
  wishlists.find((w) => w.id === id) || null;

export default wishlists;
