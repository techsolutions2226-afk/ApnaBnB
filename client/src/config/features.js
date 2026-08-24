/* ─── Feature flags ───
   Product-level switches for features that are shelved but not removed.

   MESSAGING_ENABLED — the in-app chat / Deal Room system (~7,000 lines across
   ~35 files). Switched OFF for now, kept in the tree so it can return without
   archaeology. When false: the /messages and /admin/messages routes, every nav
   entry point, the unread-message stat tiles and the socket connection are all
   skipped. No message data is deleted — the Postgres tables are untouched.

   To bring messaging back: set this to true and set MESSAGING_ENABLED=true in
   the backend env. Nothing else needs changing.

   Optionally overridable per-deploy with VITE_MESSAGING_ENABLED, following the
   VITE_IDLE_LOGOUT_MINUTES precedent in AuthContext.
   ─────────────────────────────────────────────── */

const envFlag = import.meta.env.VITE_MESSAGING_ENABLED;

export const MESSAGING_ENABLED =
  envFlag === undefined || envFlag === "" ? false : envFlag === "true";
