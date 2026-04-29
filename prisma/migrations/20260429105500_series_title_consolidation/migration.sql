-- Story title consolidation:
-- 1) StoryStudioDraft: rename legacy `title` to canonical `series_title`.
-- 2) Story: drop legacy `title` column; `series_title` is canonical.

ALTER TABLE "story_studio_drafts"
ADD COLUMN "series_title" TEXT;

UPDATE "story_studio_drafts"
SET "series_title" = COALESCE(NULLIF(TRIM("title"), ''), 'Untitled draft');

ALTER TABLE "story_studio_drafts"
ALTER COLUMN "series_title" SET NOT NULL,
ALTER COLUMN "series_title" SET DEFAULT 'Untitled draft';

ALTER TABLE "story_studio_drafts"
DROP COLUMN "title";

ALTER TABLE "stories"
DROP COLUMN "title";
