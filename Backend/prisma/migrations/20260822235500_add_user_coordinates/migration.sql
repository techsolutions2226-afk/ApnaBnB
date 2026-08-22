-- Optional coordinates captured when a user opts into "use my current
-- location" during Google signup. Nullable: users who type an address or
-- decline the browser permission prompt simply have no coordinates.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "longitude" DOUBLE PRECISION;
