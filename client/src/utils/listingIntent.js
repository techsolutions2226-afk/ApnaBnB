/* Marketplace listing intent — the Seller (sale) / Landlord (rent) choice a
   guest makes on the home hero, carried through Login / Signup / 2FA / Google.

   It is an INTENT, not a role: nothing here touches the user's account role
   or dashboard hat. Stored in sessionStorage so it survives the auth page
   hops within the tab but dies with the tab.

   Flow: Home → setListingIntent → auth pages → getPostAuthRedirect →
   Create Listing (purpose in router state) → clearListingIntent. */

const INTENT_KEY = "listing_intent";

/* Mirrors the Prisma `Purpose` enum (Backend/prisma/schema.prisma). */
export const LISTING_PURPOSES = ["sale", "rent"];

export const CREATE_LISTING_PATH = "/listing/new";

export const isListingPurpose = (value) => LISTING_PURPOSES.includes(value);

export const setListingIntent = (purpose) => {
  if (!isListingPurpose(purpose)) return;
  try {
    sessionStorage.setItem(INTENT_KEY, purpose);
  } catch {
    /* Storage blocked (private mode) — the user simply lands on the dashboard. */
  }
};

export const getListingIntent = () => {
  try {
    const purpose = sessionStorage.getItem(INTENT_KEY);
    return isListingPurpose(purpose) ? purpose : null;
  } catch {
    return null;
  }
};

export const clearListingIntent = () => {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* same storage caveat as above */
  }
};

/* Where a freshly authenticated user goes: Create Listing with the purpose
   preselected when an intent is pending, otherwise `fallbackPath`.
   It only PEEKS — Create Listing clears the intent on arrival — so when two
   code paths redirect for the same login (e.g. Login's isAuthenticated effect
   and its submit handler) both resolve to the same destination.
   Usage: const { to, options } = getPostAuthRedirect(path); navigate(to, options); */
export const getPostAuthRedirect = (fallbackPath) => {
  const purpose = getListingIntent();
  return purpose
    ? { to: CREATE_LISTING_PATH, options: { replace: true, state: { purpose } } }
    : { to: fallbackPath, options: { replace: true } };
};
