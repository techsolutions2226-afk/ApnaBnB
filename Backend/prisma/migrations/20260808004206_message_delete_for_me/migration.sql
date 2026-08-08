-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedForMe" TEXT[] DEFAULT ARRAY[]::TEXT[];
