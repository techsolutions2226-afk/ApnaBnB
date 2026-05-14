/* ─── Sample property visits / site inspections data ───
   In a real estate marketplace, "trips" are property visits (not hotel stays).
   Used by BookingContext and Trips pages.
   Status: upcoming | completed | cancelled
   All prices in PKR. All propertyIds are real (lhr-*, isb-*, khi-*).
   ─────────────────────────────────────────────── */

const trips = [
  /* ── Upcoming visits ── */
  {
    id: "trip-1",
    userId: "user-2",
    propertyId: "lhr-1",
    status: "upcoming",
    visitDate: "2026-04-10",
    visitTime: "2:00 PM",
    guests: { adults: 2, children: 0 },
    notes: "Bring ID for gated community access.",
    confirmationCode: "HMX4R9TK",
    bookedAt: "2026-02-28",
  },
  {
    id: "trip-2",
    userId: "user-4",
    propertyId: "isb-5",
    status: "upcoming",
    visitDate: "2026-05-01",
    visitTime: "11:00 AM",
    guests: { adults: 2, children: 1 },
    notes: "Dealer Bilal will accompany the visit.",
    confirmationCode: "JKL8N2WP",
    bookedAt: "2026-03-05",
  },
  {
    id: "trip-3",
    userId: "user-7",
    propertyId: "khi-1",
    status: "upcoming",
    visitDate: "2026-04-15",
    visitTime: "10:00 AM",
    guests: { adults: 1, children: 0 },
    notes: "First property visit — bring documents for verification.",
    confirmationCode: "QWE5T6YU",
    bookedAt: "2026-03-12",
  },

  /* ── Completed visits ── */
  {
    id: "trip-4",
    userId: "user-2",
    propertyId: "isb-1",
    status: "completed",
    visitDate: "2025-12-20",
    visitTime: "3:00 PM",
    guests: { adults: 2, children: 0 },
    notes: "Visited with family. Liked the location, price slightly above budget.",
    confirmationCode: "ABC1D2EF",
    bookedAt: "2025-11-15",
    feedback: "Great property but asking price is a bit high for F-7.",
  },
  {
    id: "trip-5",
    userId: "user-4",
    propertyId: "lhr-2",
    status: "completed",
    visitDate: "2025-10-05",
    visitTime: "4:00 PM",
    guests: { adults: 1, children: 0 },
    notes: "DHA Phase 5 apartment inspection.",
    confirmationCode: "QRS7T8UV",
    bookedAt: "2025-09-20",
    feedback: "Beautiful apartment. Considering making an offer.",
  },
  {
    id: "trip-6",
    userId: "user-10",
    propertyId: "lhr-6",
    status: "completed",
    visitDate: "2025-11-12",
    visitTime: "1:00 PM",
    guests: { adults: 2, children: 0 },
    notes: "Checking rental yield potential for investment.",
    confirmationCode: "MNO3P4QR",
    bookedAt: "2025-10-28",
    feedback: "Good investment property. Will discuss pricing with dealer.",
  },

  /* ── Cancelled visits ── */
  {
    id: "trip-7",
    userId: "user-2",
    propertyId: "khi-5",
    status: "cancelled",
    visitDate: "2026-01-15",
    visitTime: "2:00 PM",
    guests: { adults: 2, children: 0 },
    notes: "Hotel suite viewing in Clifton.",
    confirmationCode: "WXY3Z4AB",
    bookedAt: "2025-12-01",
    cancelledAt: "2025-12-20",
    cancelReason: "Property went under contract before visit.",
  },
  {
    id: "trip-8",
    userId: "user-7",
    propertyId: "khi-3",
    status: "cancelled",
    visitDate: "2026-02-10",
    visitTime: "11:00 AM",
    guests: { adults: 1, children: 0 },
    notes: "Studio apartment viewing.",
    confirmationCode: "STU9V0WX",
    bookedAt: "2026-01-15",
    cancelledAt: "2026-02-05",
    cancelReason: "Found a better option in the same area.",
  },
];

export const getTripsByUserId = (userId) =>
  trips.filter((t) => t.userId === userId);

export const getTripById = (id) => trips.find((t) => t.id === id) || null;

export const getUpcomingTrips = (userId) =>
  trips.filter((t) => t.userId === userId && t.status === "upcoming");

export const getCompletedTrips = (userId) =>
  trips.filter((t) => t.userId === userId && t.status === "completed");

export const getCancelledTrips = (userId) =>
  trips.filter((t) => t.userId === userId && t.status === "cancelled");

export default trips;
