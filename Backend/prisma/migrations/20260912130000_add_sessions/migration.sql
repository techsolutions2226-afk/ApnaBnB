-- CreateTable: one row per sign-in, so an ordinary logout can drop a single
-- device instead of bumping User.tokenVersion and signing the account out
-- everywhere. tokenVersion stays the global kill switch; this is the
-- per-device layer underneath it.
--
-- IF NOT EXISTS throughout, matching the convention used by
-- 20260906223231_add_token_version: these migrations are replayed against
-- databases that were also patched directly during development.
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    -- The user's tokenVersion when this session was minted. A global
    -- revocation moves the user past it and strands every older row, so the
    -- existing bump sites need no changes.
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey: deleting a user clears their sessions, same as every other
-- user-owned table here.
DO $$
BEGIN
    ALTER TABLE "Session"
        ADD CONSTRAINT "Session_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
