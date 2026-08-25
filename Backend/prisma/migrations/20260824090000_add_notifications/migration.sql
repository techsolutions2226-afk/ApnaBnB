-- In-app notifications. Purely additive: no existing table is altered.

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Serves the unread badge.
CREATE INDEX "Notification_recipientId_read_createdAt_idx"
    ON "Notification"("recipientId", "read", "createdAt");

-- Serves the inbox list.
CREATE INDEX "Notification_recipientId_createdAt_idx"
    ON "Notification"("recipientId", "createdAt");

-- Deleting a user clears their inbox.
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
