/* ─── Pagination — Page navigation with optional summary footer ───
   Renders Previous / page numbers / Next.
   When `total` is provided, also shows "Showing X to Y of Z entries"
   and an optional page-size selector.

   Props:
     currentPage       — 1-indexed page number
     totalPages        — total number of pages
     onPageChange      — callback(pageNumber)
     className         — optional extra class
     total             — total entry count (enables summary bar)
     pageSize          — rows per page
     onPageSizeChange  — callback(newSize)
     pageSizeOptions   — array of sizes for the selector
     alwaysShow        — show even when totalPages <= 1 (useful with summary)
   ─────────────────────────────────────────────── */

import "../../styles/Common.css";

const DEFAULT_SIZES = [10, 15, 25, 50];

function buildPages(currentPage, totalPages) {
  const pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  total,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
  alwaysShow = false,
}) {
  const showSummary = typeof total === "number";
  if (!alwaysShow && !showSummary && totalPages <= 1) return null;

  const safeTotalPages = Math.max(1, totalPages || 1);
  const pages = buildPages(currentPage, safeTotalPages);
  const size = pageSize || 10;
  const from = total > 0 ? (currentPage - 1) * size + 1 : 0;
  const to = total > 0 ? Math.min(currentPage * size, total) : 0;
  const totalLabel = Number(total || 0).toLocaleString();

  const controls = (
    <nav
      className={`cm-pagination ${showSummary ? "cm-pagination--controls" : ""}`.trim()}
      aria-label="Pagination"
    >
      <button
        type="button"
        className="cm-pagination-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        &lt; Previous
      </button>

      <div className="cm-pagination-pages">
        {pages.map((page, idx) =>
          page === "..." ? (
            <span key={`ell-${idx}`} className="cm-pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              type="button"
              key={page}
              className={`cm-pagination-page${page === currentPage ? " cm-pagination-page--active" : ""}`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className="cm-pagination-btn"
        disabled={currentPage >= safeTotalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next &gt;
      </button>
    </nav>
  );

  if (!showSummary) {
    return <div className={className}>{controls}</div>;
  }

  return (
    <div className={`cm-pagination-footer ${className}`.trim()}>
      <div className="cm-pagination-meta">
        <span className="cm-pagination-summary">
          Showing {from.toLocaleString()} to {to.toLocaleString()} of {totalLabel} entries
        </span>
        {typeof onPageSizeChange === "function" && (
          <label className="cm-pagination-size">
            Show
            <select
              value={size}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {controls}
    </div>
  );
}
