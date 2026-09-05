-- Two-way mutual-confirmation visit scheduling.
-- Purely additive on the "Trip" table: new columns with defaults, no existing
-- data altered, no table renamed or dropped. Safe to deploy with
-- `npx prisma migrate deploy`.

-- Additive columns for the two-way visit flow.
ALTER TABLE "Trip"
    ADD COLUMN "visitorProposal" JSONB,
    ADD COLUMN "ownerProposal" JSONB,
    ADD COLUMN "visitorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "ownerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "confirmedAt" TEXT,
    ADD COLUMN "scheduleState" TEXT NOT NULL DEFAULT 'pending';
