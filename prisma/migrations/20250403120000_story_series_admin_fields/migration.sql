-- Story series admin / discovery metadata
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "age_range" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "duration_bucket" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "full_description" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "is_series" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "series_tagline" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "universe" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "reading_level" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "topics" JSONB;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "character_tags" JSONB;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "card_title_override" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "card_description_override" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "badge_label_override" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "popularity_score" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "sort_priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "meta_title" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "meta_description" TEXT;

-- Episodes: slug + duration seconds
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "duration_seconds" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "episodes_story_id_slug_key" ON "episodes" ("story_id", "slug");
