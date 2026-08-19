// In-memory presence registry: how many live socket connections each user has.
// A user is "online" while their count is > 0. When the last socket of a user
// closes we persist `lastSeenAt` and notify their conversation partners.

const online = new Map(); // userId -> Set<socketId>

const presence = {
  add(userId, socketId) {
    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socketId);
  },

  // Returns true when the user has gone fully offline (last socket closed).
  remove(userId, socketId) {
    const set = online.get(userId);
    if (!set) return false;
    set.delete(socketId);
    if (set.size === 0) {
      online.delete(userId);
      return true;
    }
    return false;
  },

  isOnline(userId) {
    const set = online.get(userId);
    return !!set && set.size > 0;
  },
};

module.exports = { presence };