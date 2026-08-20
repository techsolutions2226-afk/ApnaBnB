/* Shared blocking helper — used by BOTH the REST send path
   (messageController.sendMessage) and the socket send path
   (sockets/index.js send_message) so a block cannot be bypassed by falling
   back to whichever transport isn't checked. Mirrors how filterPersonalInfo is
   shared across both transports.

   The block relation is an implicit m2m self-relation on User ("UserBlocks"):
   `blocked` = users this user blocked, `blockedBy` = users who blocked them.
   Either direction blocks messaging between the pair. */

const prisma = require('../db/prisma');

/**
 * True if a block exists between `userA` and `userB` in EITHER direction.
 * A single query checks both sides of the self-relation.
 */
const areBlocked = async (userA, userB) => {
  if (!userA || !userB || userA === userB) return false;
  const hit = await prisma.user.findFirst({
    where: {
      id: userA,
      OR: [
        { blocked: { some: { id: userB } } },
        { blockedBy: { some: { id: userB } } },
      ],
    },
    select: { id: true },
  });
  return !!hit;
};

/**
 * True if the sender is blocked from (or has blocked) ANY of the other
 * participants in a conversation. `otherIds` are participant ids excluding the
 * sender. Used to gate a send into a whole conversation.
 */
const isSendBlocked = async (senderId, otherIds) => {
  if (!Array.isArray(otherIds) || otherIds.length === 0) return false;
  const hit = await prisma.user.findFirst({
    where: {
      id: senderId,
      OR: [
        { blocked: { some: { id: { in: otherIds } } } },
        { blockedBy: { some: { id: { in: otherIds } } } },
      ],
    },
    select: { id: true },
  });
  return !!hit;
};

module.exports = { areBlocked, isSendBlocked };
