import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/* ═════════════════════════════════════════════════════════
   SidebarEdge — the desktop controls on a dashboard sidebar's right border:
   a drag handle along the whole edge (drag to resize, double-click to reset)
   and a round ‹ / › button that collapses it to an icon rail and back.

   Rendered as its own fixed layer next to the sidebar rather than inside it,
   so the sidebar can keep `overflow: hidden` without clipping the button.
   Shared by DashboardShell and AdminShell; state comes from
   useResizableSidebar.
   ═════════════════════════════════════════════════════════ */
export default function SidebarEdge({
  sidebar,
  collapseLabel = "Collapse sidebar",
  expandLabel = "Expand sidebar",
  resizeLabel = "Resize sidebar",
}) {
  if (!sidebar.isDesktop) return null;
  const { width, collapsed, resizing, toggle, handleProps } = sidebar;

  return (
    <div
      className="fixed inset-y-0 z-[61] w-0"
      style={{ left: width, transition: resizing ? "none" : "left 200ms ease" }}
    >
      <div
        {...handleProps}
        aria-label={resizeLabel}
        title={resizeLabel}
        className="group absolute inset-y-0 -left-1.5 w-3 cursor-col-resize outline-none"
      >
        <span
          className={`absolute inset-y-0 left-[5px] w-0.5 bg-primary-500 transition-opacity ${
            resizing ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          }`}
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? expandLabel : collapseLabel}
        aria-expanded={!collapsed}
        title={collapsed ? expandLabel : collapseLabel}
        className="absolute top-7 -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-colors hover:bg-primary-600 hover:text-white hover:border-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
      </button>
    </div>
  );
}
