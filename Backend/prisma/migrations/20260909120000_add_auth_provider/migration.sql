-- Add an auth-provider enum + column so the app can tell a Google-created
-- account from an email one, and make `password` nullable so a Google account
-- has no password at all (recovered via "Continue with Google", never reset).
--
-- Safely replayable (IF NOT EXISTS / IF EXISTS) and safe on live data:
--   • authProvider defaults to 'email', so every existing user is classed as
--     an email/password account and their password hash is untouched.
--   • password becomes nullable but NO existing row is nulled — the column only
--     becomes optional for future Google accounts.

-- 1. New enum for the provider column.
DO $$ BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('email', 'google');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Column on the user, defaulting existing accounts to 'email'.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "authProvider" "AuthProvider" NOT NULL DEFAULT 'email';

-- 3. Drop the NOT NULL so new Google accounts can have a NULL password. The
--    default NULL is intentional — Google rows carry no bcrypt hash at all.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;