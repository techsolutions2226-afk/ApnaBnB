-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "aiError" TEXT,
ADD COLUMN     "aiReason" TEXT,
ADD COLUMN     "aiScore" DOUBLE PRECISION,
ADD COLUMN     "aiStatus" TEXT NOT NULL DEFAULT 'pending';
