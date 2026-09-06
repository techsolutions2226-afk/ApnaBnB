-- AlterTable: add a session-invalidation counter to every user.
-- Defaults to 0 so existing rows are valid at their current version.
-- IF NOT EXISTS keeps this safe to replay: the column was also applied
-- directly during development to avoid a full migrate reset.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;