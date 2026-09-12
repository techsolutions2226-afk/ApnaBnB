/* e2e: what an anonymous visitor, a stranger, the owner and an admin can read.
 *
 * Runs over REAL HTTP against a running server, because the bug this guards
 * against lived in the routing layer: listing endpoints were public and
 * returned the owner's login email plus contact fields the owner had hidden.
 * A controller-level test would not have caught a missing middleware.
 *
 *   BASE_URL=http://localhost:5055 node tests/e2e-privacy.js
 */
require('dotenv').config({ quiet: true });

const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');
const { createSession } = require('../utils/sessions');

const BASE = (process.env.BASE_URL || 'http://localhost:5055').replace(/\/$/, '');

let passed = 0;
const ok = (label) => { passed += 1; console.log(`PASS: ${label}`); };
const fail = (label, got) => { throw new Error(`${label}\n      got: ${JSON.stringify(got)}`); };

const get = async (path, token) => {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { status: res.status, body };
};

const STAMP = Date.now();
const made = { users: [], properties: [], listings: [] };
const CONTACT = ['contactName', 'contactEmail', 'contactPhone', 'contactWhatsapp'];

const makeUser = async (tag, role = 'seller') => {
  const u = await prisma.user.create({
    data: {
      name: `E2E ${tag}`, email: `e2e-privacy-${tag}-${STAMP}@example.com`,
      authProvider: 'email', password: null, role, verified: true,
      phone: '+92 300 1112222', location: 'Private Street 1',
    },
  });
  made.users.push(u.id);
  const session = await createSession(prisma, u, { headers: {}, ip: '127.0.0.1' });
  const token = jwt.sign(
    { id: u.id, role: u.role, tokenVersion: u.tokenVersion ?? 0, sid: session.id },
    process.env.JWT_SECRET, { expiresIn: '1h' },
  );
  return { user: u, token };
};

const makeListing = async (ownerId, showContact) => {
  const p = await prisma.property.create({
    data: {
      title: `E2E privacy ${showContact ? 'public' : 'hidden'} ${STAMP}`,
      price: 1000000, purpose: 'sale', category: 'home', propertyType: 'house',
      status: 'active', location: { city: 'Lahore', area: 'DHA' },
      listedById: ownerId, actingRole: 'seller', photos: [],
      showContact,
      contactName: 'Secret Name', contactEmail: 'secret@example.com',
      contactPhone: '03001234567', contactWhatsapp: '03001234567',
    },
  });
  made.properties.push(p.id);
  const l = await prisma.listing.create({ data: { propertyId: p.id, ownerId } });
  made.listings.push(l.id);
  return l;
};

const leakedContact = (listing) =>
  CONTACT.filter((f) => listing?.property?.[f]);

(async () => {
  try {
    const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
    if (health?.status !== 'ok') throw new Error(`no server at ${BASE} — start one first`);

    const owner = await makeUser('owner');
    const stranger = await makeUser('stranger');
    const admin = await makeUser('admin', 'admin');
    const hidden = await makeListing(owner.user.id, false);
    const shown = await makeListing(owner.user.id, true);

    /* ── 1. The profile is not public ──────────────────────────────────── */
    let r = await get(`/users/${owner.user.id}`);
    if (r.status !== 401) fail('an anonymous visitor must not read a profile', r);
    ok('GET /users/:id without login -> 401');

    r = await get(`/users/${owner.user.id}`, stranger.token);
    if (r.status !== 200 || r.body.email || r.body.phone || r.body.location)
      fail('a signed-in viewer gets the public card only, never private fields', r);
    ok('GET /users/:id signed in -> 200, and still no email/phone/location');

    /* ── 2. The per-user listing index is not public ───────────────────── */
    r = await get(`/listings/user/${owner.user.id}`);
    if (r.status !== 401) fail('an anonymous visitor must not list a user\'s listings', r);
    ok('GET /listings/user/:id without login -> 401');

    /* ── 3. THE LEAK: owner login email on public listing endpoints ────── */
    const anonList = await get('/listings');
    const mine = (anonList.body || []).filter((l) => l.ownerId === owner.user.id);
    if (!mine.length) fail('expected the seeded listings in the public index', anonList.status);
    if (mine.some((l) => l.owner?.email))
      fail('THE LEAK: owner login email must never appear on a public listing', mine[0].owner);
    ok('GET /listings anonymous -> no owner login email');

    r = await get(`/listings/${shown.id}`);
    if (r.body?.owner?.email) fail('owner email leaked on GET /listings/:id', r.body.owner);
    ok('GET /listings/:id anonymous -> no owner login email');

    /* ── 4. THE BYPASS: hidden contact fields, anonymous ───────────────── */
    r = await get(`/listings/${hidden.id}`);
    if (leakedContact(r.body).length)
      fail('THE BYPASS: contact the owner hid must not reach an anonymous visitor', leakedContact(r.body));
    if (r.body?.property?.listedBy?.email || r.body?.property?.listedBy?.phone)
      fail('the lister\'s email/phone must be hidden with the toggle off', r.body.property.listedBy);
    ok('hidden contact is stripped for an anonymous visitor');

    const hiddenInIndex = mine.find((l) => l.id === hidden.id);
    if (leakedContact(hiddenInIndex).length)
      fail('hidden contact leaked through the public index', leakedContact(hiddenInIndex));
    ok('hidden contact is stripped in the public index too');

    /* ── 5. …and for a different signed-in user ────────────────────────── */
    r = await get(`/listings/${hidden.id}`, stranger.token);
    if (leakedContact(r.body).length)
      fail('a signed-in stranger must not see hidden contact', leakedContact(r.body));
    ok('hidden contact is stripped for a signed-in stranger');

    /* ── 6. The owner still sees it — the edit form depends on this ───── */
    r = await get(`/listings/${hidden.id}`, owner.token);
    if (leakedContact(r.body).length !== CONTACT.length)
      fail('the OWNER must still see their own hidden contact, or editing wipes it', r.body?.property);
    ok('the owner still sees their own hidden contact (edit form is safe)');

    r = await get(`/listings/user/${owner.user.id}`, owner.token);
    const ownHidden = (r.body || []).find((l) => l.id === hidden.id);
    if (leakedContact(ownHidden).length !== CONTACT.length)
      fail('the owner\'s dashboard must keep their contact fields', ownHidden?.property);
    ok('the owner\'s own dashboard index keeps their contact fields');

    /* ── 7. Admins see it ──────────────────────────────────────────────── */
    r = await get(`/listings/${hidden.id}`, admin.token);
    if (leakedContact(r.body).length !== CONTACT.length)
      fail('an admin must see hidden contact for moderation', r.body?.property);
    ok('an admin sees hidden contact');

    /* ── 8. A public listing still shows its contact — no over-scrubbing ─ */
    r = await get(`/listings/${shown.id}`);
    if (leakedContact(r.body).length !== CONTACT.length)
      fail('a listing with contact ON must still show it publicly', r.body?.property);
    ok('a listing with contact ON still shows it (nothing over-scrubbed)');

    /* ── 9. A bad token degrades to anonymous rather than erroring ─────── */
    r = await get(`/listings/${hidden.id}`, 'not.a.real.token');
    if (r.status !== 200) fail('a junk token on a public read should fall back to anonymous', r.status);
    if (leakedContact(r.body).length) fail('a junk token must not unlock hidden contact', leakedContact(r.body));
    ok('an invalid token falls back to anonymous — 200, still scrubbed');

    console.log(`\nALL ${passed} PRIVACY CHECKS PASSED OK`);
  } finally {
    for (const id of made.listings) await prisma.listing.delete({ where: { id } }).catch(() => {});
    for (const id of made.properties) await prisma.property.delete({ where: { id } }).catch(() => {});
    for (const id of made.users) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('\nE2E FAILED:', e.message || e); process.exit(1); });
