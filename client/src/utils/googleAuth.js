/* Google Identity Services (GIS) helper for "Continue with Google".
 *
 * Loads the GIS client script once, initializes the client with our OAuth
 * Client ID, and exposes `openGooglePopup()` — the custom-button pattern:
 * we render Google's real button into a hidden off-screen div and program-
 * matically click it when OUR styled button is pressed. That opens Google's
 * consent popup while showing zero Google chrome, so the existing custom
 * "Continue with Google" buttons keep their look.
 *
 * On success the GIS callback fires with { credential } — the one-time ID
 * token that the backend verifies.
 */

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

let scriptPromise = null;
let initialized = false;
let callbackRef = null;

/* Load + execute the GIS client script (idempotent). */
const loadGisScript = () => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

/* Initialize the GIS client with our Client ID. Safe to call repeatedly. */
export const initGoogleAuth = (clientId) => {
  if (typeof window === "undefined" || !window.google?.accounts?.id) return false;
  if (initialized) return true;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (callbackRef) callbackRef(response?.credential);
    },
  });
  initialized = true;
  return true;
};

/* Programmatically open Google's consent popup from our custom button.
 * `onCredential(idToken)` fires once Google returns a token. */
export const openGooglePopup = async ({ clientId, onCredential }) => {
  callbackRef = onCredential;
  const loaded = await loadGisScript();
  if (!loaded || !initGoogleAuth(clientId)) {
    callbackRef = null;
    return { ok: false, error: "Google sign-in failed to load. Please try again." };
  }

  try {
    // Render Google's real button into a hidden container, then click it to
    // trigger the popup while keeping the UI free of Google's branding.
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(host);

    window.google.accounts.id.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
    });

    const btn = host.querySelector("iframe[role='button'], div[role='button']") || host.querySelector("div");
    if (!btn) {
      host.remove();
      return { ok: false, error: "Google sign-in is unavailable right now." };
    }
    btn.click();
    // The iframe is discarded after being clicked; GIS manages the popup.
    setTimeout(() => host.remove(), 5000);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not start Google sign-in. Please try again." };
  }
};

export default openGooglePopup;