-- Add ownership and visibility metadata for user-generated stories
CREATE TYPE "StoryAccess" AS ENUM ('public', 'private');

ALTER TABLE "stories"
ADD COLUMN "is_user_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "owner_user_id" TEXT,
ADD COLUMN "access" "StoryAccess" NOT NULL DEFAULT 'public';

CREATE INDEX "stories_owner_user_id_idx" ON "stories"("owner_user_id");
CREATE INDEX "stories_is_user_generated_access_idx" ON "stories"("is_user_generated", "access");

ALTER TABLE "stories"
ADD CONSTRAINT "stories_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
