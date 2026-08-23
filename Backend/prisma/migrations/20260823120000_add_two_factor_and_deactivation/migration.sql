-- Two-factor authentication, login alerts and reversible self-deactivation.

ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorMethod" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User" ADD COLUMN "twoFactorChallengeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorChallengeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "twoFactorChallengeAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "twoFactorCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "twoFactorCodeLastSentAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN "loginAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "User" ADD COLUMN "deactivated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
