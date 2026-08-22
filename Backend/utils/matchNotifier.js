/* Match notification emails.
 *
 * When a new property or requirement is posted, the matchmaker can create
 * several matches in one go. Rather than emailing the person who just acted
 * once per match (which floods their inbox), they get a single digest covering
 * everything that matched, while each counterparty — who only has one match to
 * hear about — gets their own individual email.
 *
 * Every entry point here is fire-and-forget: failures are logged and swallowed
 * so a broken SMTP connection can never fail property/requirement creation.
 */

const prisma = require('../db/prisma');
const { sendMatchesEmail, formatPrice, formatBudget } = require('./mailer');

const appUrl = (path = '') => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');
  return `${base}${path}`;
};

const locationOf = (loc) => [loc?.area, loc?.city].filter(Boolean).join(', ') || '—';

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/* Fetch name + email for a set of user ids in one query. */
const loadRecipients = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true },
  });
  return new Map(users.map((u) => [u.id, u]));
};

/* ── Card builders — shape a property/requirement into mailer `items` ── */
const propertyItem = (property, score) => ({
  title: property.title,
  subtitle: [titleCase(property.propertyType), locationOf(property.location)]
    .filter(Boolean)
    .join(' · '),
  rows: [
    { label: 'Price', value: formatPrice(property.price) },
    ...(property.bedrooms ? [{ label: 'Bedrooms', value: String(property.bedrooms) }] : []),
    ...(property.size ? [{ label: 'Size', value: `${property.size} ${property.sizeUnit || ''}`.trim() }] : []),
  ],
  score,
});

const requirementItem = (requirement, score) => ({
  title: requirement.title,
  subtitle: [titleCase(requirement.propertyType), locationOf(requirement.location)]
    .filter(Boolean)
    .join(' · '),
  rows: [
    { label: 'Budget', value: formatBudget(requirement.budget) },
    ...(requirement.bedrooms ? [{ label: 'Bedrooms', value: String(requirement.bedrooms) }] : []),
    ...(requirement.size ? [{ label: 'Size', value: String(requirement.size) }] : []),
  ],
  score,
});

/* Naive "+s" is wrong for words like "match" and "property", so callers can
   pass the plural form explicitly. */
const plural = (n, singular, pluralForm) =>
  `${n} ${n === 1 ? singular : pluralForm || `${singular}s`}`;
const propertyCount = (n) => plural(n, 'property', 'properties');

/* ── Supply side: a new/updated property matched N requirements ── */
const notifyPropertyMatches = async (property, pairs) => {
  if (!pairs?.length) return;

  const ownerId = property.listedById;
  const recipients = await loadRecipients([
    ownerId,
    ...pairs.map(({ requirement }) => requirement.requiredById),
  ]);

  const owner = recipients.get(ownerId);
  const ctaUrl = appUrl('/matches');

  // 1. Digest to the person who listed the property.
  if (owner?.email) {
    const items = pairs.map(({ requirement, match }) => requirementItem(requirement, match.score));
    await sendMatchesEmail(owner.email, owner.name, {
      subject: `${plural(pairs.length, 'new match', 'new matches')} for "${property.title}"`,
      heading: 'New matches found 🎯',
      intro: `your property <strong>${property.title}</strong> matched ${plural(
        pairs.length,
        'requirement',
      )} on ApnaBnB.`,
      items,
      ctaUrl,
      ctaLabel: 'View your matches',
      text: `Your property "${property.title}" matched ${plural(pairs.length, 'requirement')} on ApnaBnB. View them: ${ctaUrl}`,
    });
  }

  // 2. One email per counterparty about their own requirement.
  await Promise.all(
    pairs.map(async ({ requirement, match }) => {
      const buyerId = requirement.requiredById;
      // Skip self-matches (same user on both sides) — they already got the digest.
      if (!buyerId || buyerId === ownerId) return;
      const buyer = recipients.get(buyerId);
      if (!buyer?.email) return;
      await sendMatchesEmail(buyer.email, buyer.name, {
        subject: `New property matches your requirement "${requirement.title}"`,
        heading: 'We found a match 🎯',
        intro: `a newly listed property matches your requirement <strong>${requirement.title}</strong>.`,
        items: [propertyItem(property, match.score)],
        ctaUrl,
        ctaLabel: 'View this match',
        text: `A new property "${property.title}" matches your requirement "${requirement.title}" on ApnaBnB. View it: ${ctaUrl}`,
      });
    }),
  );
};

/* ── Demand side: a new/updated requirement matched N properties ── */
const notifyRequirementMatches = async (requirement, pairs) => {
  if (!pairs?.length) return;

  const ownerId = requirement.requiredById;
  const recipients = await loadRecipients([
    ownerId,
    ...pairs.map(({ property }) => property.listedById),
  ]);

  const owner = recipients.get(ownerId);
  const ctaUrl = appUrl('/matches');

  // 1. Digest to the person who posted the requirement.
  if (owner?.email) {
    const items = pairs.map(({ property, match }) => propertyItem(property, match.score));
    await sendMatchesEmail(owner.email, owner.name, {
      subject: `${plural(pairs.length, 'new match', 'new matches')} for "${requirement.title}"`,
      heading: 'New matches found 🎯',
      intro: `your requirement <strong>${requirement.title}</strong> matched ${propertyCount(
        pairs.length,
      )} on ApnaBnB.`,
      items,
      ctaUrl,
      ctaLabel: 'View your matches',
      text: `Your requirement "${requirement.title}" matched ${propertyCount(pairs.length)} on ApnaBnB. View them: ${ctaUrl}`,
    });
  }

  // 2. One email per property owner about their own listing.
  await Promise.all(
    pairs.map(async ({ property, match }) => {
      const sellerId = property.listedById;
      if (!sellerId || sellerId === ownerId) return;
      const seller = recipients.get(sellerId);
      if (!seller?.email) return;
      await sendMatchesEmail(seller.email, seller.name, {
        subject: `New requirement matches your property "${property.title}"`,
        heading: 'We found a match 🎯',
        intro: `a newly posted requirement matches your property <strong>${property.title}</strong>.`,
        items: [requirementItem(requirement, match.score)],
        ctaUrl,
        ctaLabel: 'View this match',
        text: `A new requirement "${requirement.title}" matches your property "${property.title}" on ApnaBnB. View it: ${ctaUrl}`,
      });
    }),
  );
};

/* Fire-and-forget wrapper — never rejects, never blocks the caller. */
const notifyInBackground = (fn, ...args) => {
  (async () => {
    try {
      await fn(...args);
    } catch (err) {
      console.error('Match notification email failed:', err.message);
    }
  })();
};

module.exports = {
  notifyPropertyMatches,
  notifyRequirementMatches,
  notifyInBackground,
  appUrl,
};
