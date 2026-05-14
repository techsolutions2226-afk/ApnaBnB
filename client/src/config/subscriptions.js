/* ─── Subscription / Plans data ───
   Defines dealer subscription tiers and their benefits.
   Used by Plans page and dealer dashboards.
   ─────────────────────────────────────────────── */

const subscriptionPlans = [
  {
    id: "plan-basic",
    name: "Basic",
    slug: "basic",
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    currency: "PKR",
    popular: false,
    features: [
      { text: "Up to 10 active listings", included: true },
      { text: "Basic matchmaking", included: true },
      { text: "5 messages per day", included: true },
      { text: "Standard support", included: true },
      { text: "Profile badge", included: true },
      { text: "Priority in search results", included: false },
      { text: "Advanced analytics", included: false },
      { text: "Co-brokering access", included: false },
      { text: "Unlimited messages", included: false },
      { text: "API access", included: false },
    ],
    limits: {
      maxListings: 10,
      maxMessagesPerDay: 5,
      maxRequirements: 3,
      matchesPerMonth: 10,
      coBrokering: false,
      analytics: false,
      featuredListings: 0,
    },
  },
  {
    id: "plan-pro",
    name: "Pro",
    slug: "pro",
    monthlyPrice: 7999,
    yearlyPrice: 79990,
    currency: "PKR",
    popular: true,
    features: [
      { text: "Up to 50 active listings", included: true },
      { text: "Advanced matchmaking", included: true },
      { text: "50 messages per day", included: true },
      { text: "Priority support", included: true },
      { text: "Profile badge", included: true },
      { text: "Priority in search results", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Co-brokering access", included: true },
      { text: "Unlimited messages", included: false },
      { text: "API access", included: false },
    ],
    limits: {
      maxListings: 50,
      maxMessagesPerDay: 50,
      maxRequirements: 15,
      matchesPerMonth: 50,
      coBrokering: true,
      analytics: true,
      featuredListings: 3,
    },
  },
  {
    id: "plan-premium",
    name: "Premium",
    slug: "premium",
    monthlyPrice: 14999,
    yearlyPrice: 149990,
    currency: "PKR",
    popular: false,
    features: [
      { text: "Unlimited active listings", included: true },
      { text: "AI-powered matchmaking", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Verified badge", included: true },
      { text: "Top priority in search results", included: true },
      { text: "Full analytics dashboard", included: true },
      { text: "Co-brokering access", included: true },
      { text: "Unlimited messages", included: true },
      { text: "API access", included: true },
    ],
    limits: {
      maxListings: Infinity,
      maxMessagesPerDay: Infinity,
      maxRequirements: Infinity,
      matchesPerMonth: Infinity,
      coBrokering: true,
      analytics: true,
      featuredListings: 10,
    },
  },
];

/* ── Active subscriptions for dealers ── */
const activeSubscriptions = [
  {
    id: "sub-1",
    userId: "user-3",
    planId: "plan-pro",
    status: "active",
    startDate: "2025-12-01",
    endDate: "2026-12-01",
    billing: "yearly",
    amountPaid: 79990,
  },
  {
    id: "sub-2",
    userId: "user-5",
    planId: "plan-premium",
    status: "active",
    startDate: "2026-01-15",
    endDate: "2027-01-15",
    billing: "yearly",
    amountPaid: 149990,
  },
  {
    id: "sub-3",
    userId: "user-8",
    planId: "plan-basic",
    status: "active",
    startDate: "2026-02-01",
    endDate: "2026-03-01",
    billing: "monthly",
    amountPaid: 2999,
  },
];

export const getPlanById = (id) =>
  subscriptionPlans.find((p) => p.id === id) || null;

export const getPlanBySlug = (slug) =>
  subscriptionPlans.find((p) => p.slug === slug) || null;

export const getSubscriptionByUserId = (userId) =>
  activeSubscriptions.find((s) => s.userId === userId) || null;

export const getPopularPlan = () =>
  subscriptionPlans.find((p) => p.popular) || null;

export { subscriptionPlans, activeSubscriptions };
export default subscriptionPlans;
