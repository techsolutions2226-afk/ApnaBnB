-- Chat upgrade — Phase 1 (non-destructive)
--
--  1. ConversationParticipant: per-user chat prefs/read state. Backfilled
--     from the existing implicit __ConversationParticipants join table so no
--     membership data is lost; membership itself stays where it is.
--  2. Message: type, replies (parentMessageId), edit/forward flags, soft
--     delete (deletedAt), receipt timestamps (deliveredAt/readAt), reactions,
--     starredBy, location + property card fields.
--  3. Conversation.propertyId: native property context on a chat.
--  4. User.lastSeenAt: presence.

-- ── ConversationParticipant ──────────────────────────────────────────────
CREATE TABLE "ConversationParticipant" (
    "conversationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "pinned"         BOOLEAN NOT NULL DEFAULT false,
    "muted"          BOOLEAN NOT NULL DEFAULT false,
    "archived"       BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- Backfill from the implicit membership join (A = conversation, B = user).
INSERT INTO "ConversationParticipant" ("conversationId", "userId", "updatedAt")
SELECT "A", "B", CURRENT_TIMESTAMP FROM "_ConversationParticipants";

CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Message additions ────────────────────────────────────────────────────
ALTER TABLE "Message" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "Message" ADD COLUMN "parentMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "edited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "forwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "reactions" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Message" ADD COLUMN "starredBy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Message" ADD COLUMN "location" JSONB;
ALTER TABLE "Message" ADD COLUMN "propertyId" TEXT;

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

ALTER TABLE "Message" ADD CONSTRAINT "Message_parentMessageId_fkey"
    FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Conversation property context ────────────────────────────────────────
ALTER TABLE "Conversation" ADD COLUMN "propertyId" TEXT;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── User presence ────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);