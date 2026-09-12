-- AddVideoUrl — Property walkthrough video (Cloudinary URL).
-- The schema declared videoUrl for a long time without a migration ever
-- creating the column; this closes that gap so listing saves that include a
-- video don't fail on a missing column.
ALTER TABLE "Property" ADD COLUMN "videoUrl" TEXT;