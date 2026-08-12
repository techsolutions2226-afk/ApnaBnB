const prisma = require('../db/prisma');
const { calculateMatchScore } = require('../utils/matchScore');
const { enrichMatchesWithAI } = require('../utils/aiMatch');

// Shared populate shape for match records.
const matchInclude = {
  property: {
    include: {
      listedBy: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    },
  },
  requirement: {
    include: {
      requiredBy: { select: { id: true, name: true, email: true, role: true } },
    },
  },
  initiator: { select: { id: true, name: true, email: true, role: true } },
};

// "Matches that involve me" — a property I listed OR a requirement I posted.
const involvedWhere = (userId) => ({
  OR: [
    { property: { listedById: userId } },
    { requirement: { requiredById: userId } },
  ],
});

// Calculate matches for a property against requirements (preview, no persist)
const matchPropertyToRequirements = async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID is required.' });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const requirements = await prisma.requirement.findMany({
      where: {
        location: { path: ['city'], equals: property.location.city },
        propertyType: property.propertyType,
      },
      include: { requiredBy: { select: { id: true, name: true, email: true, role: true } } },
    });

    const matches = requirements
      .map((requirement) => ({ requirement, score: calculateMatchScore(property, requirement) }))
      .sort((a, b) => b.score - a.score);

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate matches for a requirement against properties (preview, no persist)
const matchRequirementsToProperties = async (req, res) => {
  const { requirementId } = req.body;

  if (!requirementId) {
    return res.status(400).json({ message: 'Requirement ID is required.' });
  }

  try {
    const requirement = await prisma.requirement.findUnique({ where: { id: requirementId } });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }

    const properties = await prisma.property.findMany({
      where: {
        location: { path: ['city'], equals: requirement.location.city },
        propertyType: requirement.propertyType,
      },
      include: { listedBy: { select: { id: true, name: true, email: true, role: true } } },
    });

    const matches = properties
      .map((property) => ({ property, score: calculateMatchScore(property, requirement) }))
      .sort((a, b) => b.score - a.score);

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new match
const createMatch = async (req, res) => {
  const { propertyId, requirementId, type, notes } = req.body;

  if (!propertyId || !requirementId || !type) {
    return res.status(400).json({
      message: 'Property ID, Requirement ID, and match type are required.',
    });
  }

  try {
    const existingMatch = await prisma.match.findFirst({
      where: { propertyId, requirementId },
    });
    if (existingMatch) {
      return res.status(409).json({ message: 'Match already exists.' });
    }

    const [property, requirement] = await Promise.all([
      prisma.property.findUnique({ where: { id: propertyId } }),
      prisma.requirement.findUnique({ where: { id: requirementId } }),
    ]);

    if (!property || !requirement) {
      return res.status(404).json({ message: 'Property or requirement not found.' });
    }

    const score = calculateMatchScore(property, requirement);

    const match = await prisma.match.create({
      data: {
        propertyId,
        requirementId,
        initiatorId: req.user.id,
        score,
        type,
        notes: notes || '',
      },
      include: matchInclude,
    });

    // Background AI semantic scoring (non-blocking).
    enrichMatchesWithAI([{ matchId: match.id, ruleScore: score }]);

    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all matches involving the current user
const getMatches = async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: involvedWhere(req.user.id),
      include: matchInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single match by ID
const getMatchById = async (req, res) => {
  const { id } = req.params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: matchInclude,
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Matches of a given type involving the current user, sorted by score desc.
const getMatchesByType = (type) => async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: { type, ...involvedWhere(req.user.id) },
      include: matchInclude,
      orderBy: { score: 'desc' },
    });
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSellerBuyerMatches = getMatchesByType('seller-buyer');
const getDealerBuyerMatches = getMatchesByType('dealer-buyer');
const getDealerDealerMatches = getMatchesByType('dealer-dealer');

// Every match involving the current user, newest first. Used by dashboards.
const getMyMatches = async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: involvedWhere(req.user.id),
      include: matchInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Find (or create) the private Deal Room conversation between exactly the two
// parties of a match — the property owner and the requirement poster.
const findOrCreateDealRoom = async (a, b) => {
  let conv = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: a } } },
        { participants: { some: { id: b } } },
        { participants: { every: { id: { in: [a, b] } } } },
      ],
    },
    select: { id: true },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { participants: { connect: [{ id: a }, { id: b }] } },
      select: { id: true },
    });
  }
  return conv.id;
};

// The two parties of a match: property owner + requirement poster.
const matchParties = (match) => ({
  ownerId: match.property?.listedById || null,
  seekerId: match.requirement?.requiredById || null,
});

// Update match status. Only the two involved parties may change it. Accepting
// opens the private Deal Room (a conversation linked to the match).
const updateMatchStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'accepted', 'rejected', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const existing = await prisma.match.findUnique({
      where: { id },
      include: {
        property: { select: { listedById: true } },
        requirement: { select: { requiredById: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    const { ownerId, seekerId } = matchParties(existing);
    if (req.user.id !== ownerId && req.user.id !== seekerId) {
      return res.status(403).json({ message: 'You are not part of this match.' });
    }

    const data = { status };
    // On accept, open the Deal Room if one isn't linked yet.
    if (
      status === 'accepted' &&
      !existing.conversationId &&
      ownerId &&
      seekerId &&
      ownerId !== seekerId
    ) {
      data.conversationId = await findOrCreateDealRoom(ownerId, seekerId);
    }

    const match = await prisma.match.update({
      where: { id },
      data,
      include: matchInclude,
    });
    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/matches/:id/contact — the OTHER party's contact details, revealed
// only once the match is accepted (or closed) and only to the two parties.
const getMatchContact = async (req, res) => {
  const { id } = req.params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            listedById: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            listedBy: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        requirement: {
          select: {
            requiredById: true,
            requiredBy: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });
    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    const { ownerId, seekerId } = matchParties(match);
    if (req.user.id !== ownerId && req.user.id !== seekerId) {
      return res.status(403).json({ message: 'You are not part of this match.' });
    }
    if (match.status !== 'accepted' && match.status !== 'closed') {
      return res.status(403).json({
        revealed: false,
        message: 'Contact details are revealed once the match is accepted.',
      });
    }

    // Show the counterpart's details. For the property side, prefer the
    // per-listing contact override, falling back to the owner's profile.
    const iAmOwner = req.user.id === ownerId;
    const contact = iAmOwner
      ? {
          name: match.requirement.requiredBy?.name || '',
          email: match.requirement.requiredBy?.email || '',
          phone: match.requirement.requiredBy?.phone || '',
        }
      : {
          name: match.property.contactName || match.property.listedBy?.name || '',
          email: match.property.contactEmail || match.property.listedBy?.email || '',
          phone: match.property.contactPhone || match.property.listedBy?.phone || '',
        };

    res.status(200).json({ revealed: true, contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete match
const deleteMatch = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.match.deleteMany({
      where: { id, initiatorId: req.user.id },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Match not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Match deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  matchPropertyToRequirements,
  matchRequirementsToProperties,
  createMatch,
  getMatches,
  getMatchById,
  getMyMatches,
  getSellerBuyerMatches,
  getDealerBuyerMatches,
  getDealerDealerMatches,
  updateMatchStatus,
  getMatchContact,
  deleteMatch,
};
