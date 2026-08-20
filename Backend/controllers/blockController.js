/* Block / unblock users. Blocking is a mutual gate: once either side blocks the
   other, neither can send messages to the pair (enforced in the REST + socket
   send paths via utils/blocking). The block itself is one-directional (this user
   blocked that user), stored on the implicit m2m self-relation "UserBlocks". */

const prisma = require('../db/prisma');

// POST /api/blocks/:userId — block a user (idempotent).
const blockUser = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: 'User id is required.' });
  if (userId === req.user.id) return res.status(400).json({ message: "You can't block yourself." });

  try {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return res.status(404).json({ message: 'User not found.' });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { blocked: { connect: { id: userId } } },
    });

    res.status(200).json({ message: 'User blocked.', blockedUserId: userId });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/blocks/:userId — unblock a user (idempotent).
const unblockUser = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: 'User id is required.' });

  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { blocked: { disconnect: { id: userId } } },
    });

    res.status(200).json({ message: 'User unblocked.', unblockedUserId: userId });
  } catch (error) {
    next(error);
  }
};

// GET /api/blocks — ids the current user has blocked (drives the UI's
// Block/Unblock toggle in the chat header menu).
const listBlocked = async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { blocked: { select: { id: true } } },
    });
    const ids = (me?.blocked || []).map((u) => u.id);
    res.status(200).json({ blocked: ids });
  } catch (error) {
    next(error);
  }
};

module.exports = { blockUser, unblockUser, listBlocked };
