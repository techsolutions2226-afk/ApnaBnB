-- Slug uniqueness moves from global to per-role: "basic" can exist for
-- seller, dealer AND buyer as separate plans.
DROP INDEX IF EXISTS "Plan_slug_key";

CREATE UNIQUE INDEX "Plan_role_slug_key" ON "Plan"("role", "slug");