/* e2e: GET /api/properties/:id/related against the real database.
 *
 * The unit tests cover the ranking maths. This covers the parts only a real
 * database can answer: that the JSON `location` column can actually be
 * filtered by city/area, that the tier fallback fires when a market is thin,
 * and that invisible listings never leak into a public response.
 *
 * Run with: node tests/e2e-related-properties.js
 */
require('dotenv').config({ quiet: true });

const prisma = require('../db/prisma');
const { getRelatedProperties } = require('../controllers/propertyController');

const call = (id) =>
  new Promise((resolve) => {
    const res = {
      _status: 200,
      status(s) { this._status = s; return this; },
      json(b) { resolve({ status: this._status, body: b }); return this; },
    };
    getRelatedProperties({ params: { id }, query: {} }, res,
      (err) => resolve({ status: err?.status || 500, body: { message: err?.message }, threw: true }));
  });

let passed = 0;
const ok = (label) => { passed += 1; console.log(`PASS: ${label}`); };
const fail = (label, got) => { throw new Error(`${label}\n      got: ${JSON.stringify(got)}`); };

const STAMP = Date.now();
const CITY = `E2E City ${STAMP}`;           // unique, so no real data interferes
const made = { users: [], properties: [] };

const mkProperty = async (over) => {
  const p = await prisma.property.create({
    data: {
      title: over.title || `E2E ${over.tag}`,
      price: over.price ?? 20000000,
      purpose: over.purpose || 'sale',
      category: over.category || 'home',
      propertyType: over.propertyType || 'house',
      size: over.size ?? 10,
      sizeUnit: over.sizeUnit || 'Marla',
      bedrooms: over.bedrooms ?? 4,
      status: over.status || 'active',
      location: over.location || { city: CITY, area: 'DHA' },
      listedById: over.listedById,
      actingRole: 'seller',
      photos: [],
    },
  });
  made.properties.push(p.id);
  return p;
};

const ids = (r) => (r.body.properties || []).map((p) => p.title.replace('E2E ', ''));

(async () => {
  try {
    const user = await prisma.user.create({
      data: {
        name: 'E2E Related', email: `e2e-related-${STAMP}@example.com`,
        authProvider: 'email', password: null, role: 'seller', verified: true,
        phone: '+92 300 1112222', location: 'Test',
      },
    });
    made.users.push(user.id);
    const owned = (over) => mkProperty({ ...over, listedById: user.id });

    const base = await owned({ tag: 'base' });

    /* ── 1. Ordering: same area + same type + close price wins ─────────── */
    await owned({ tag: 'sameArea' });
    await owned({ tag: 'sameCity', location: { city: CITY, area: 'Gulberg' } });
    await owned({ tag: 'pricey', price: 31000000 });

    let r = await call(base.id);
    if (r.status !== 200) fail('related should return 200', r);
    const order = ids(r);
    if (!order.length) fail('expected some related properties', r.body);
    if (order[0] !== 'sameArea')
      fail('the same-area listing should rank first', order);
    if (order.includes('base')) fail('the property itself must not be listed', order);
    ok(`ranks by similarity against a live database (${order.join(' > ')})`);

    /* ── 2. JSON location filtering actually works in Postgres ─────────── */
    const elsewhere = await owned({
      tag: 'otherCity', location: { city: `Other ${STAMP}`, area: 'Clifton' },
    });
    r = await call(base.id);
    // It may still appear via the last-resort tier, but never ahead of a
    // same-city listing — which is what proves the JSON path filter ran.
    const withOther = ids(r);
    if (withOther.indexOf('otherCity') === 0)
      fail('a listing in another city must not outrank same-city ones', withOther);
    ok('location JSON column filters by city/area correctly');

    /* ── 3. A rental never appears under a sale ────────────────────────── */
    await owned({ tag: 'rental', purpose: 'rent' });
    r = await call(base.id);
    if (ids(r).includes('rental'))
      fail('a rental must never appear under a property for sale', ids(r));
    ok('purpose is never relaxed — no rentals under a sale');

    /* ── 4. Invisible listings stay invisible ──────────────────────────── */
    await owned({ tag: 'pendingOne', status: 'pending' });
    await owned({ tag: 'soldOne', status: 'sold' });
    await owned({ tag: 'rejectedOne', status: 'rejected' });
    r = await call(base.id);
    for (const hidden of ['pendingOne', 'soldOne', 'rejectedOne']) {
      if (ids(r).includes(hidden)) fail(`a ${hidden} listing must not be public`, ids(r));
    }
    ok('pending, sold and rejected listings never leak into the response');

    /* ── 5. Thin market: the tier fallback fires ───────────────────────── */
    const lonely = await owned({
      tag: 'lonely',
      price: 90000000,
      location: { city: `Lonely ${STAMP}`, area: 'Nowhere' },
    });
    r = await call(lonely.id);
    if (r.status !== 200) fail('a lonely listing should still return 200', r);
    if (!(r.body.properties || []).length)
      fail('the fallback tier should still find something rather than render an empty row', r.body);
    ok(`thin market falls back and still returns ${r.body.properties.length} result(s)`);

    /* ── 6. Card payload is complete enough to render ──────────────────── */
    const card = r.body.properties[0];
    for (const field of ['id', 'title', 'price', 'photos', 'location', 'purpose', 'status']) {
      if (!(field in card)) fail(`the card payload is missing ${field}`, Object.keys(card));
    }
    if (!card.listedBy) fail('listedBy should be included for the card', card);
    ok('response carries every field PropertyCard renders');

    /* ── 7. Unknown id is a clean 404, not a crash ─────────────────────── */
    const missing = await call('00000000-0000-0000-0000-000000000000');
    if (missing.status !== 404) fail('an unknown property should 404', missing);
    ok('unknown property id returns 404');

    console.log(`\nALL ${passed} RELATED-PROPERTY CHECKS PASSED OK`);
  } finally {
    for (const id of made.properties) await prisma.property.delete({ where: { id } }).catch(() => {});
    for (const id of made.users) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('\nE2E FAILED:', e.message || e); process.exit(1); });
