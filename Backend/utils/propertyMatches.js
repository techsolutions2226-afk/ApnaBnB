/* ─── propertyMatches — create Match rows for a property ───
   Moved verbatim from controllers/propertyController.js so the controller stays
   under the 500-line limit. Used by createProperty, the manual regenerate
   routes (routes/matchRoutes.js) and demo-seed.js.
   ─────────────────────────────────────────────── */

const prisma = require('../db/prisma');
const { enrichMatchesWithAI } = require('./aiMatch');
const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
} = require('./matchScore');
const { notifyUsersInBackground, TYPES } = require('./notifier');
const { notifyPropertyMatches, notifyInBackground } = require('./matchNotifier');

// Auto-generate matches for a newly-created property.
// Pre-filters requirements by city + propertyType (+ active), then refines with
// isMatchCandidate (area/price/purpose) and derives match type from roles.
// `notify` is opt-in so bulk callers (demo-seed) never blast emails; the real
// user-facing paths (createProperty, manual regenerate) pass it explicitly.
const generateMatchesForProperty = async (property, userId, { notify = false } = {}) => {
  try {
    const propertyOwner = await prisma.user.findUnique({
      where: { id: property.listedById },
      select: { role: true },
    });
    if (!propertyOwner) return [];

    const pt = property.propertyType;
    const requirements = await prisma.requirement.findMany({
      where: {
        location: { path: ['city'], equals: property.location.city },
        propertyType: { in: [pt, pt.toLowerCase()] },
        status: 'active',
      },
      include: { requiredBy: { select: { id: true, role: true } } },
    });

    const candidates = [];
    for (const requirement of requirements) {
      if (!isMatchCandidate(property, requirement)) continue;

      // Prefer the role each party was ACTING AS when they created the record;
      // fall back to their account role for pre-migration rows.
      const matchType = determineMatchType(
        property.actingRole || propertyOwner.role,
        requirement.actingRole || requirement.requiredBy?.role,
      );
      if (!matchType) continue;

      candidates.push({ requirement, matchType });
    }

    // Dedupe + create each candidate in parallel. Same matchmaking decision
    // (same set, scoring, and order) — the I/O just isn't serialized anymore.
    const matches = [];
    const aiEntries = [];
    const produced = await Promise.all(
      candidates.map(async ({ requirement, matchType }) => {
        const existingMatch = await prisma.match.findFirst({
          where: { propertyId: property.id, requirementId: requirement.id },
        });
        if (existingMatch) return null;

        const score = calculateMatchScore(property, requirement);
        const match = await prisma.match.create({
          data: {
            propertyId: property.id,
            requirementId: requirement.id,
            initiatorId: userId,
            score,
            type: matchType,
            status: 'pending',
          },
        });
        return { match, score, requirement };
      }),
    );
    const pairs = [];
    for (const entry of produced) {
      if (!entry) continue;
      matches.push(entry.match);
      aiEntries.push({ matchId: entry.match.id, ruleScore: entry.score });
      pairs.push({ match: entry.match, requirement: entry.requirement });
    }
    // Kick off AI semantic scoring in the background (non-blocking).
    enrichMatchesWithAI(aiEntries);
    // Email both sides about the newly created matches (never blocks).
    if (notify) notifyInBackground(notifyPropertyMatches, property, pairs);
    /* Bell notifications for the same event. Gated on the same `notify` flag so
       seeders never write thousands of rows. The owner gets one line per match;
       each requirement poster gets their own. Self-matches are suppressed by
       notifyUsers. */
    if (notify && pairs.length) {
      notifyUsersInBackground([
        {
          recipientId: userId,
          type: TYPES.MATCH_CREATED,
          title: `${pairs.length} new match${pairs.length === 1 ? '' : 'es'}`,
          body: `${property.title} matched ${pairs.length} buyer requirement${pairs.length === 1 ? '' : 's'}.`,
          link: '/matches',
          entityType: 'match',
          entityId: property.id,
        },
        ...pairs.map(({ match, requirement }) => ({
          recipientId: requirement.requiredById,
          actorId: userId,
          type: TYPES.MATCH_CREATED,
          title: 'New match found',
          body: `${property.title} matches what you're looking for.`,
          link: '/matches',
          entityType: 'match',
          entityId: match.id,
        })),
      ]);
    }
    return matches;
  } catch (error) {
    console.error('Error generating matches:', error);
    return [];
  }
};

module.exports = { generateMatchesForProperty };
