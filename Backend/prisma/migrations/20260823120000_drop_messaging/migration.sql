-- Remove the messaging / chat system entirely.
--
-- Verified empty before running: Conversation 0 rows, Message 0 rows,
-- ConversationParticipant 0 rows, and no Match referenced a conversation.
-- Blocking existed only to gate chat, so it goes with it.

-- Drop FK columns on retained tables first.
ALTER TABLE "Match" DROP COLUMN IF EXISTS "conversationId";

-- Join tables for the implicit many-to-many relations.
DROP TABLE IF EXISTS "_ConversationParticipants";
DROP TABLE IF EXISTS "_UserBlocks";

-- Messaging tables. Message references Conversation, so it goes first.
DROP TABLE IF EXISTS "Message";
DROP TABLE IF EXISTS "ConversationParticipant";
DROP TABLE IF EXISTS "Conversation";
