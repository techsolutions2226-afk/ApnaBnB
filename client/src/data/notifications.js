/* ─── Notification data ───
   Mock notifications for all user roles.
   Types: match | message | deal | system | listing | review
   Used by Notifications page and header badge.
   ─────────────────────────────────────────────── */

const notifications = [
  /* ── Seller notifications (Ahmad - user-1) ── */
  {
    id: "notif-1",
    userId: "user-1",
    type: "listing",
    title: "New inquiry on your property",
    message: "Fatima Ali sent an inquiry about 10 Marla House in Gulberg III.",
    referenceId: "lhr-1",
    read: false,
    createdAt: "2026-03-13T10:00:00",
  },
  {
    id: "notif-2",
    userId: "user-1",
    type: "deal",
    title: "Deal update",
    message: "Your deal for lhr-1 has moved to negotiation phase.",
    referenceId: "deal-3",
    read: false,
    createdAt: "2026-03-12T14:30:00",
  },
  {
    id: "notif-3",
    userId: "user-1",
    type: "review",
    title: "New review received",
    message: "Bilal Ahmed left a 5-star review on your Gulberg III property.",
    referenceId: "rev-4",
    read: true,
    createdAt: "2026-03-10T09:15:00",
  },

  /* ── Buyer notifications (Fatima - user-2) ── */
  {
    id: "notif-4",
    userId: "user-2",
    type: "match",
    title: "New property match!",
    message: "A property in F-7, Islamabad matches your requirement for a 3 bed family home.",
    referenceId: "match-2",
    read: false,
    createdAt: "2026-03-13T08:00:00",
  },
  {
    id: "notif-5",
    userId: "user-2",
    type: "message",
    title: "New message from Ahmad Khan",
    message: "Ahmad responded to your inquiry about the Gulberg III property.",
    referenceId: "conv-1",
    read: true,
    createdAt: "2026-03-10T14:35:00",
  },
  {
    id: "notif-6",
    userId: "user-2",
    type: "system",
    title: "Visit reminder",
    message: "Your property visit to lhr-1 is scheduled for April 10 at 2:00 PM.",
    referenceId: "trip-1",
    read: false,
    createdAt: "2026-03-14T07:00:00",
  },

  /* ── Dealer notifications (Omar - user-3) ── */
  {
    id: "notif-7",
    userId: "user-3",
    type: "match",
    title: "Co-brokering opportunity",
    message: "Nadia Hussain's client requirement matches your listing in North Nazimabad.",
    referenceId: "match-8",
    read: false,
    createdAt: "2026-03-13T11:00:00",
  },
  {
    id: "notif-8",
    userId: "user-3",
    type: "deal",
    title: "Deal in progress",
    message: "The co-brokering deal for khi-4 is awaiting client visit confirmation.",
    referenceId: "deal-5",
    read: false,
    createdAt: "2026-03-12T16:00:00",
  },
  {
    id: "notif-9",
    userId: "user-3",
    type: "listing",
    title: "Listing views milestone",
    message: "Your listing for khi-4 has crossed 400 views!",
    referenceId: "list-18",
    read: true,
    createdAt: "2026-03-11T10:30:00",
  },

  /* ── Buyer notifications (Sara - user-4) ── */
  {
    id: "notif-10",
    userId: "user-4",
    type: "match",
    title: "New property match!",
    message: "A 2 bed apartment in DHA Phase 5 matches your Gulberg requirement.",
    referenceId: "match-1",
    read: false,
    createdAt: "2026-03-13T09:30:00",
  },
  {
    id: "notif-11",
    userId: "user-4",
    type: "message",
    title: "New message from Bilal Ahmed",
    message: "Bilal responded about the F-6 penthouse viewing.",
    referenceId: "conv-2",
    read: true,
    createdAt: "2026-03-08T16:05:00",
  },

  /* ── Dealer notifications (Bilal - user-5) ── */
  {
    id: "notif-12",
    userId: "user-5",
    type: "deal",
    title: "Premium deal update",
    message: "Documentation is being processed for the isb-5 penthouse deal.",
    referenceId: "deal-4",
    read: false,
    createdAt: "2026-03-13T15:00:00",
  },
  {
    id: "notif-13",
    userId: "user-5",
    type: "match",
    title: "New match for your requirement",
    message: "A Bahria Town house in Lahore matches your investor client's criteria.",
    referenceId: "match-9",
    read: false,
    createdAt: "2026-03-12T09:00:00",
  },
  {
    id: "notif-14",
    userId: "user-5",
    type: "system",
    title: "Subscription reminder",
    message: "Your Premium plan will renew on Jan 15, 2027.",
    referenceId: "sub-2",
    read: true,
    createdAt: "2026-03-10T08:00:00",
  },

  /* ── Seller notifications (Kashif - user-6) ── */
  {
    id: "notif-15",
    userId: "user-6",
    type: "listing",
    title: "New inquiry",
    message: "A buyer is interested in your F-7 apartment (isb-1).",
    referenceId: "isb-1",
    read: false,
    createdAt: "2026-03-13T12:00:00",
  },

  /* ── Buyer notifications (Hamza - user-7) ── */
  {
    id: "notif-16",
    userId: "user-7",
    type: "match",
    title: "New property match!",
    message: "A sea-facing apartment in Clifton matches your Karachi home requirement.",
    referenceId: "match-3",
    read: false,
    createdAt: "2026-03-13T07:30:00",
  },
  {
    id: "notif-17",
    userId: "user-7",
    type: "system",
    title: "Visit reminder",
    message: "Your property visit to khi-1 is scheduled for April 15 at 10:00 AM.",
    referenceId: "trip-3",
    read: false,
    createdAt: "2026-03-14T07:00:00",
  },

  /* ── Dealer notifications (Nadia - user-8) ── */
  {
    id: "notif-18",
    userId: "user-8",
    type: "match",
    title: "Co-brokering match",
    message: "Omar's listing in North Nazimabad matches your Lahore client's requirement.",
    referenceId: "match-8",
    read: false,
    createdAt: "2026-03-13T11:05:00",
  },
  {
    id: "notif-19",
    userId: "user-8",
    type: "system",
    title: "Subscription expiring",
    message: "Your Basic plan expires on March 1. Upgrade to Pro for more features.",
    referenceId: "sub-3",
    read: true,
    createdAt: "2026-02-25T08:00:00",
  },

  /* ── Seller notifications (Zara - user-9) ── */
  {
    id: "notif-20",
    userId: "user-9",
    type: "message",
    title: "New message from Hamza Tariq",
    message: "Hamza is asking about documentation for your Clifton apartment.",
    referenceId: "conv-4",
    read: false,
    createdAt: "2026-03-12T10:00:00",
  },

  /* ── Buyer notifications (Ayesha - user-10) ── */
  {
    id: "notif-21",
    userId: "user-10",
    type: "match",
    title: "Investment match found!",
    message: "A luxury penthouse in F-6 matches your premium investment requirement.",
    referenceId: "match-5",
    read: false,
    createdAt: "2026-03-13T10:30:00",
  },
  {
    id: "notif-22",
    userId: "user-10",
    type: "message",
    title: "New message from Nadia Hussain",
    message: "Nadia shared 3 new options in Johar Town for your review.",
    referenceId: "conv-5",
    read: false,
    createdAt: "2026-03-13T14:05:00",
  },
];

export const getNotificationsByUserId = (userId) =>
  notifications.filter((n) => n.userId === userId);

export const getUnreadNotifications = (userId) =>
  notifications.filter((n) => n.userId === userId && !n.read);

export const getUnreadNotificationCount = (userId) =>
  notifications.filter((n) => n.userId === userId && !n.read).length;

export const getNotificationById = (id) =>
  notifications.find((n) => n.id === id) || null;

export default notifications;
