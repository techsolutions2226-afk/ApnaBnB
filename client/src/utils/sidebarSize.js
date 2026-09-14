/* ─── sidebarSize — rules for the collapsible, resizable dashboard sidebar ───
   One source for the limits and the drag/snap maths, shared by the member
   dashboard (DashboardShell) and the admin panel (AdminShell). Pure apart
   from the storage helpers, which never throw (private mode / blocked
   storage just means the sidebar starts at its default).

   Desktop only — on phones and tablets both shells keep their slide-in
   drawer, so none of this applies there.
   ─────────────────────────────────────────────── */

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 420;
// Collapsed "icon rail" width — just the nav icons.
export const SIDEBAR_RAIL_WIDTH = 72;
// Keyboard resize step on the drag handle.
export const SIDEBAR_KEY_STEP = 16;

export const clampSidebarWidth = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(n)));
};

/* Where a drag to `x` (the pointer's distance from the left edge) lands:
   below the minimum snaps to the icon rail, otherwise the clamped width. The
   remembered width is kept when snapping, so reopening restores it. */
export const resolveSidebarDrag = (x, pref) =>
  Number(x) < SIDEBAR_MIN_WIDTH
    ? { width: pref.width, collapsed: true }
    : { width: clampSidebarWidth(x, pref.width), collapsed: false };

/* The width to render right now. */
export const sidebarRenderWidth = ({ width, collapsed }) =>
  collapsed ? SIDEBAR_RAIL_WIDTH : width;

export const readSidebarPref = (storageKey, defaultWidth) => {
  const fallback = { width: defaultWidth, collapsed: false };
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      width: clampSidebarWidth(parsed?.width, defaultWidth),
      collapsed: parsed?.collapsed === true,
    };
  } catch {
    return fallback;
  }
};

export const writeSidebarPref = (storageKey, pref) => {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ width: pref.width, collapsed: pref.collapsed }),
    );
  } catch {
    /* storage blocked — the sidebar still works, it just won't be remembered */
  }
};
