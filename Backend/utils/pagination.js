// Opt-in pagination for list endpoints.
//
// Backward-compatible by design: when a request does NOT send `page`/`limit`,
// endpoints keep returning the flat array every client already consumes
// (SearchResults fetches everything and filters client-side). Passing
// `?page=2&limit=20` switches that endpoint to a paginated object:
//   { items, total, page, pages }
// so future consumers can page server-side without breaking today's UI.

const parsePagination = (req) => {
  const enabled =
    req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  return { enabled, page, limit, skip: (page - 1) * limit, take: limit };
};

const paginated = (rows, total, page, limit) => ({
  items: rows,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { parsePagination, paginated };