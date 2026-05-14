/* ─── Central data hub — aggregates all data modules ───
   Import this file when you need cross-module lookups.
   Individual modules can also be imported directly.
   ─────────────────────────────────────────────── */

import users from "./users";
import sections from "./properties";
import listings from "./listings";
import requirements from "./requirements";
import matches from "./matches";
import conversations from "./conversations";
import wishlists from "./wishlists";
import trips from "./trips";
import reviews from "./reviews";
import deals from "./deals";
import subscriptionPlans, { activeSubscriptions } from "./subscriptions";
import notifications from "./notifications";
import propertyExtras from "./propertyExtras";
import categories from "./categories";

/* ── Flatten all properties from sections ── */
const allProperties = sections.flatMap((section) => section.properties);

const appData = {
  users,
  sections,
  listings,
  requirements,
  matches,
  conversations,
  wishlists,
  trips,
  reviews,
  deals,
  subscriptionPlans,
  activeSubscriptions,
  notifications,
  propertyExtras,
  categories,
  allProperties,
};

/* ── User helpers ── */
export const getUserById = (id) =>
  appData.users.find((user) => user.id === id) || null;

export const getUsersByRole = (role) =>
  appData.users.filter((user) => user.role === role);

/* ── Property helpers ── */
export const getPropertyById = (id) =>
  allProperties.find((property) => property.id === id) || null;

export const getAllProperties = () => allProperties;

export const getPropertiesByCity = (city) =>
  allProperties.filter((p) => p.city === city);

/* ── Listing helpers ── */
export const getListingsByOwnerId = (ownerId) =>
  appData.listings.filter((listing) => listing.ownerId === ownerId);

export const getListingByPropertyId = (propertyId) =>
  appData.listings.find((l) => l.propertyId === propertyId) || null;

/* ── Requirement helpers ── */
export const getRequirementsByUserId = (userId) =>
  appData.requirements.filter((req) => req.userId === userId);

/* ── Match helpers ── */
export const getMatchesByType = (type) =>
  appData.matches.filter((match) => match.type === type);

export const getMatchesByListingId = (listingId) =>
  appData.matches.filter((match) => match.listingId === listingId);

export const getMatchesByRequirementId = (requirementId) =>
  appData.matches.filter((match) => match.requirementId === requirementId);

export const getMatchesByUserId = (userId) =>
  appData.matches.filter(
    (m) =>
      m.sellerId === userId ||
      m.buyerId === userId ||
      m.dealerId === userId ||
      m.dealerAId === userId ||
      m.dealerBId === userId
  );

/* ── Deal helpers ── */
export const getDealsByUserId = (userId) =>
  appData.deals.filter(
    (d) =>
      d.sellerId === userId ||
      d.buyerId === userId ||
      d.dealerId === userId ||
      d.coBrokerId === userId
  );

/* ── Conversation helpers ── */
export const getConversationsByUserId = (userId) =>
  appData.conversations.filter((c) => c.participants.includes(userId));

/* ── Notification helpers ── */
export const getNotificationsByUserId = (userId) =>
  appData.notifications.filter((n) => n.userId === userId);

export const getUnreadNotificationCount = (userId) =>
  appData.notifications.filter((n) => n.userId === userId && !n.read).length;

/* ── Dashboard stats helper ── */
export const getDashboardStats = (userId) => {
  const user = getUserById(userId);
  if (!user) return null;

  const role = user.role;

  const base = {
    notifications: getUnreadNotificationCount(userId),
    messages: appData.conversations
      .filter((c) => c.participants.includes(userId))
      .reduce((sum, c) => sum + (c.unread?.[userId] || 0), 0),
    matches: getMatchesByUserId(userId).length,
  };

  if (role === "seller") {
    const myListings = getListingsByOwnerId(userId);
    return {
      ...base,
      activeListings: myListings.filter((l) => l.status === "active").length,
      totalViews: myListings.reduce((sum, l) => sum + l.views, 0),
      totalInquiries: myListings.reduce((sum, l) => sum + l.inquiries, 0),
      deals: getDealsByUserId(userId),
    };
  }

  if (role === "buyer") {
    return {
      ...base,
      activeRequirements: appData.requirements.filter(
        (r) => r.userId === userId && r.status === "active"
      ).length,
      savedProperties: appData.wishlists
        .filter((w) => w.userId === userId)
        .reduce((sum, w) => sum + w.propertyIds.length, 0),
      upcomingVisits: appData.trips.filter(
        (t) => t.userId === userId && t.status === "upcoming"
      ).length,
      deals: getDealsByUserId(userId),
    };
  }

  if (role === "dealer") {
    const myListings = getListingsByOwnerId(userId);
    return {
      ...base,
      activeListings: myListings.filter((l) => l.status === "active").length,
      totalViews: myListings.reduce((sum, l) => sum + l.views, 0),
      totalInquiries: myListings.reduce((sum, l) => sum + l.inquiries, 0),
      activeRequirements: appData.requirements.filter(
        (r) => r.userId === userId && r.status === "active"
      ).length,
      dealsCompleted: user.dealsCompleted || 0,
      activeClients: user.activeClients || 0,
      subscription: user.subscription || "none",
      deals: getDealsByUserId(userId),
    };
  }

  return base;
};

export default appData;
