-- On-site check-in proof for confirmed visits.
-- Purely additive on the "Trip" table + one new enum value. No existing data
-- altered, no table renamed or dropped. Safe to deploy with
-- `npx prisma migrate deploy`.

-- The "checked_in" state: visitor proved arrival at the property.
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'checked_in';

-- Additive columns for the check-in flow and visit outcome tracking.
ALTER TABLE "Trip"
    ADD COLUMN "checkInCode" TEXT,
    ADD COLUMN "checkInCodeExpiresAt" TIMESTAMP(3),
    ADD COLUMN "checkInCodeUsed" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "checkInFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "checkedInAt" TIMESTAMP(3),
    ADD COLUMN "completedAt" TIMESTAMP(3),
    ADD COLUMN "completedById" TEXT,
    ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'pending';