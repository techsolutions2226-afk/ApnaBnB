/* ─── popularByCity — the home page's "Popular homes in <city>" rows ───
   Groups visible listings by city and picks each city's most popular ones.
   Pure (no database), so the ranking is unit-tested.

   Which city row comes first is NOT decided here: that depends on where the
   visitor is, and the client orders the rows (utils/searchLocation
   orderByProximity) with the same city coordinates it uses for the search
   bar. This returns the cities by listing count — the order a visitor with no
   detected location sees.

   "Popular" within a city, in order:
     1. featured listings (status set by admin/plan)
     2. more listing views (Listing.views, summed across a property's listings)
     3. newer
   ─────────────────────────────────────────────── */

const cityKey = (value) => String(value || '').trim().toLowerCase();

const viewsOf = (property) =>
  Array.isArray(property.listings)
    ? property.listings.reduce((sum, l) => sum + (Number(l?.views) || 0), 0)
    : 0;

const comparePopularity = (a, b) => {
  const featured = (b.status === 'featured') - (a.status === 'featured');
  if (featured) return featured;
  const views = viewsOf(b) - viewsOf(a);
  if (views) return views;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
};

/* The spelling most listings use ("Lahore" over a stray "lahore"); ties go to
   the first seen, which is stable for a stable input order. */
const labelOf = (spellings) => {
  let best = null;
  for (const [label, count] of spellings) {
    if (!best || count > best[1]) best = [label, count];
  }
  return best[0];
};

const groupPopularByCity = (properties, { perCity = 10 } = {}) => {
  const groups = new Map();

  for (const property of Array.isArray(properties) ? properties : []) {
    const raw = String(property?.location?.city || '').trim();
    const key = cityKey(raw);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { spellings: new Map(), items: [] });
    const group = groups.get(key);
    group.spellings.set(raw, (group.spellings.get(raw) || 0) + 1);
    group.items.push(property);
  }

  return [...groups.values()]
    .map(({ spellings, items }) => ({
      city: labelOf(spellings),
      total: items.length,
      properties: [...items]
        .sort(comparePopularity)
        .slice(0, perCity)
        // `listings` is only here for the views count — not card data.
        .map(({ listings: _listings, ...card }) => card),
    }))
    .sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));
};

module.exports = { groupPopularByCity, comparePopularity };
