/* Device-local "last login method" memory — the badge GitHub / Vercel /
   Cloudinary show on the sign-in page ("You last used X on this device").
   Stored in localStorage so it is per-browser/per-device and survives logout,
   but never synced to the server or another device. */
const KEY = "apnabnb_last_login";

export const getLastLogin = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && (parsed.provider === "google" || parsed.provider === "email")
      ? parsed
      : null;
  } catch {
    return null;
  }
};

export const setLastLogin = (provider, email, name) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ provider, email: email || "", name: name || "", at: Date.now() })
    );
  } catch {
    /* localStorage unavailable (private mode) — badge simply won't persist */
  }
};