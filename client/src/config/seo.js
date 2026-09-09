/* ─── Site SEO defaults ───
   Set VITE_SITE_URL in .env (e.g. https://apnabnb.com) for absolute
   canonical / Open Graph URLs in production. Falls back to the current
   origin at runtime when unset. */

export const SITE_NAME = "ApnaBnB";
export const SITE_TAGLINE = "Pakistan's trusted property marketplace";
export const DEFAULT_DESCRIPTION =
  "Buy, sell, and rent verified properties across Pakistan. Search homes, plots, and commercial spaces — or post what you need and get matched.";
export const DEFAULT_OG_IMAGE = "/logo.png";
export const TWITTER_HANDLE = "@apnabnb";

/** Absolute site origin without trailing slash. */
export function getSiteUrl() {
  const fromEnv = (import.meta.env.VITE_SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://apnabnb.com";
}

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return `${base}/`;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageTitle(title) {
  if (!title) return `${SITE_NAME} — ${SITE_TAGLINE}`;
  if (title.includes(SITE_NAME)) return title;
  return `${title} | ${SITE_NAME}`;
}

/** Static page SEO presets (path → meta). */
export const PAGE_SEO = {
  home: {
    title: `Buy, Sell & Rent Property in Pakistan`,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  },
  about: {
    title: "About Us",
    description:
      "Learn how ApnaBnB matches buyers and sellers across Pakistan — list once, get matched, and close real conversations faster.",
    path: "/about",
  },
  contact: {
    title: "Contact Us",
    description:
      "Get in touch with the ApnaBnB team for support, partnerships, or listing help across Pakistan.",
    path: "/contact",
  },
  search: {
    title: "Search Properties",
    description:
      "Browse homes, plots, and commercial properties for sale and rent across Pakistan.",
    path: "/search",
  },
  sale: {
    title: "Properties for Sale in Pakistan",
    description:
      "Explore verified homes, plots, and commercial properties for sale on ApnaBnB.",
    path: "/sale",
  },
  rent: {
    title: "Properties for Rent in Pakistan",
    description:
      "Find apartments, houses, and commercial rentals across Pakistan on ApnaBnB.",
    path: "/rent",
  },
  login: {
    title: "Sign In",
    description: "Sign in to your ApnaBnB account to manage listings, requirements, and matches.",
    path: "/login",
    noindex: true,
  },
  signup: {
    title: "Create Account",
    description:
      "Join ApnaBnB to list properties, post requirements, and connect with verified members.",
    path: "/signup",
    noindex: true,
  },
};

/** Resolve a human title for private app shells (dashboard / admin). Always noindex. */
export function privateAreaTitle(pathname = "") {
  const p = pathname.replace(/\/$/, "") || "/";

  if (p.startsWith("/admin")) {
    const adminMap = [
      ["/admin/users", "Users"],
      ["/admin/listings", "Listings"],
      ["/admin/requirements", "Requirements"],
      ["/admin/matches", "Matches"],
      ["/admin/visits", "Visits"],
      ["/admin/payments", "Payments"],
      ["/admin/plans", "Plans"],
      ["/admin/contact", "Contact Page"],
      ["/admin/logs", "System Logs"],
      ["/admin/health", "System Health"],
      ["/admin/account", "Account"],
      ["/admin", "Admin Overview"],
    ];
    for (const [prefix, label] of adminMap) {
      if (p === prefix || p.startsWith(`${prefix}/`)) {
        return `${label} — Admin`;
      }
    }
    return "Admin";
  }

  const dashMap = [
    ["/listing/new", "Create Listing"],
    ["/my-listings", "My Listings"],
    ["/my-requirements", "My Requirements"],
    ["/requirements/new", "Post Requirement"],
    ["/requirements", "Requirements Board"],
    ["/matches", "Matches"],
    ["/wishlists", "Wishlists"],
    ["/trips", "Visits"],
    ["/visits", "Visit Status"],
    ["/visit", "Plan Visit"],
    ["/plans", "Plans"],
    ["/account/personal-info", "Personal Info"],
    ["/account/notifications", "Notifications"],
    ["/account/login-security", "Login & Security"],
    ["/account/payments", "Payments"],
    ["/account/privacy", "Privacy"],
    ["/account/preferences", "Preferences"],
    ["/account", "Account"],
    ["/dashboard", "Dashboard"],
  ];

  if (p.startsWith("/listing/") && p.endsWith("/edit")) return "Edit Listing";
  if (p.startsWith("/listing/")) return "View Listing";
  if (p.startsWith("/requirements/") && p.endsWith("/edit")) return "Edit Requirement";
  if (p.startsWith("/requirements/") && p !== "/requirements") return "Requirement";

  for (const [prefix, label] of dashMap) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return label;
  }

  return "Dashboard";
}
