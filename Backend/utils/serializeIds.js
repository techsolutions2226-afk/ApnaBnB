/* Recursively ensure every object carrying an `id` also exposes `_id` (= id).
 *
 * The Mongo→Postgres migration keeps the frontend untouched by returning `_id`
 * everywhere it used to appear. Prisma's result extension only adds `_id` at
 * the top level of a query result — NOT to nested `include`d relations — so
 * this walks the whole payload (top level + nested) at the serialization
 * boundary (Express responses + socket emits) and fills in any missing `_id`.
 *
 * Dates and other non-plain values are passed through untouched.
 */
const withIds = (value) => {
  if (Array.isArray(value)) return value.map(withIds);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;

  const out = {};
  for (const [key, v] of Object.entries(value)) out[key] = withIds(v);
  if ('id' in out && !('_id' in out)) out._id = out.id;
  return out;
};

module.exports = { withIds };
