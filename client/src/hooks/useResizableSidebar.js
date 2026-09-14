import { useCallback, useEffect, useState } from "react";
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_KEY_STEP,
  clampSidebarWidth,
  resolveSidebarDrag,
  sidebarRenderWidth,
  readSidebarPref,
  writeSidebarPref,
} from "../utils/sidebarSize";

const matches = (query) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;

/* ═════════════════════════════════════════════════════════
   useResizableSidebar — desktop open/close + drag-to-resize for a dashboard
   sidebar. Each shell passes its own storage key, default width and the
   media query at which it stops being a mobile drawer.

   Returns what the shell needs to lay itself out:
     isDesktop   false → ignore everything else (mobile drawer as before)
     width       px to render the sidebar (and offset the content) with
     collapsed   true → render the icon rail
     resizing    true while dragging (turn width transitions off)
     toggle      open ↔ icon rail
     handleProps spread onto the drag handle (pointer + keyboard + a11y)
   ═════════════════════════════════════════════════════════ */
export default function useResizableSidebar({ storageKey, defaultWidth, desktopQuery }) {
  const [isDesktop, setIsDesktop] = useState(() => matches(desktopQuery));
  const [pref, setPref] = useState(() => readSidebarPref(storageKey, defaultWidth));
  const [dragX, setDragX] = useState(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(desktopQuery);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [desktopQuery]);

  useEffect(() => {
    writeSidebarPref(storageKey, pref);
  }, [storageKey, pref]);

  const toggle = useCallback(() => {
    setPref((p) => ({ ...p, collapsed: !p.collapsed }));
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture?.(e.pointerId);

    const body = document.body;
    const prevCursor = body.style.cursor;
    const prevSelect = body.style.userSelect;
    body.style.cursor = "col-resize";
    body.style.userSelect = "none";

    let lastX = null;
    const onMove = (ev) => {
      lastX = ev.clientX;
      setDragX(lastX);
    };
    const onUp = (ev) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      handle.releasePointerCapture?.(ev.pointerId);
      body.style.cursor = prevCursor;
      body.style.userSelect = prevSelect;
      // A click without movement keeps things as they are.
      if (lastX !== null) {
        const x = lastX;
        setPref((p) => resolveSidebarDrag(x, p));
      }
      setDragX(null);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }, []);

  /* Double-click the edge: back to the shell's default, open. */
  const onDoubleClick = useCallback(() => {
    setPref({ width: defaultWidth, collapsed: false });
  }, [defaultWidth]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setPref((p) => {
        const current = p.collapsed ? 0 : p.width;
        const next = current + (e.key === "ArrowRight" ? SIDEBAR_KEY_STEP : -SIDEBAR_KEY_STEP);
        return p.collapsed && e.key === "ArrowRight"
          ? { ...p, collapsed: false }
          : resolveSidebarDrag(next, p);
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPref((p) => ({ ...p, collapsed: !p.collapsed }));
    }
  }, []);

  const live = dragX === null ? pref : resolveSidebarDrag(dragX, pref);
  const width = sidebarRenderWidth(live);

  return {
    isDesktop,
    width,
    collapsed: live.collapsed,
    resizing: dragX !== null,
    toggle,
    handleProps: {
      role: "separator",
      "aria-orientation": "vertical",
      "aria-valuemin": SIDEBAR_MIN_WIDTH,
      "aria-valuemax": SIDEBAR_MAX_WIDTH,
      "aria-valuenow": live.collapsed ? SIDEBAR_MIN_WIDTH : clampSidebarWidth(width, defaultWidth),
      tabIndex: 0,
      onPointerDown,
      onDoubleClick,
      onKeyDown,
    },
  };
}
