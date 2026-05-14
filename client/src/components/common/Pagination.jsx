/* ─── Pagination — Simple page navigation ───
   Renders Previous / page numbers / Next.
   Frontend-only pagination for lists that grow large.

   Props:
     currentPage  — 1-indexed page number
     totalPages   — total number of pages
     onPageChange — callback(pageNumber)
     className    — optional extra class
   ─────────────────────────────────────────────── */

import "../../styles/Common.css";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) {
  if (totalPages <= 1) return null;

  /* Build an array of page numbers with ellipsis */
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

  return (
    <nav className={`cm-pagination ${className}`.trim()}>
      <button
        className="cm-pagination-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>

      <div className="cm-pagination-pages">
        {pages.map((page, idx) =>
          page === "..." ? (
            <span key={`ell-${idx}`} className="cm-pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              className={`cm-pagination-page${page === currentPage ? " cm-pagination-page--active" : ""}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        className="cm-pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
