ALTER TABLE "custom_story_orders"
ADD COLUMN "story_studio_draft_id" TEXT;

CREATE UNIQUE INDEX "custom_story_orders_story_studio_draft_id_key"
ON "custom_story_orders"("story_studio_draft_id");

ALTER TABLE "custom_story_orders"
ADD CONSTRAINT "custom_story_orders_story_studio_draft_id_fkey"
FOREIGN KEY ("story_studio_draft_id")
REFERENCES "story_studio_drafts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
