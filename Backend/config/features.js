/* ─── Feature flags ───
   Product-level switches for features that are shelved but not removed.

   MESSAGING_ENABLED — the chat / Deal Room system. Switched OFF for now, kept
   in the tree so it can return without archaeology. When false:
     • /api/messages and /api/conversations are not mounted
     • Socket.IO is never initialised (no chat, no presence)
     • the admin message/conversation endpoints are not mounted
     • accepting a match no longer opens an empty Deal Room conversation

   No message data is deleted — the Message / Conversation /
   ConversationParticipant tables are untouched, as is MESSAGE_ENC_KEY (still
   needed by the seeders and unit tests).

   To bring messaging back: set MESSAGING_ENABLED=true here (or in .env) and
   flip the matching client flag in client/src/config/features.js.
   ─────────────────────────────────────────────── */

const MESSAGING_ENABLED = process.env.MESSAGING_ENABLED === 'true';

module.exports = { MESSAGING_ENABLED };
