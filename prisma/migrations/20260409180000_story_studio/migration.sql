-- Story Studio: presets, drafts, draft episodes, generated assets, generation jobs

CREATE TABLE "story_studio_presets" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaults" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_studio_presets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_studio_drafts" (
    "id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled draft',
    "slug" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'quick',
    "preset_id" TEXT,
    "request" JSONB NOT NULL DEFAULT '{}',
    "brief" JSONB,
    "script_package" JSONB,
    "linked_story_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_studio_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_studio_draft_episodes" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Episode',
    "script_text" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "estimated_duration_seconds" INTEGER,
    "notes" JSONB,

    CONSTRAINT "story_studio_draft_episodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_studio_generated_assets" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "draft_episode_id" TEXT,
    "kind" TEXT NOT NULL,
    "storage_key" TEXT,
    "public_url" TEXT,
    "mime_type" TEXT,
    "vendor" TEXT NOT NULL DEFAULT '',
    "vendor_artifact_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_studio_generated_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_studio_generation_jobs" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "payload" JSONB,
    "result_ref" TEXT,

    CONSTRAINT "story_studio_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "story_studio_presets_slug_key" ON "story_studio_presets"("slug");

CREATE INDEX "story_studio_drafts_created_by_user_id_idx" ON "story_studio_drafts"("created_by_user_id");

CREATE INDEX "story_studio_drafts_updated_at_idx" ON "story_studio_drafts"("updated_at");

CREATE INDEX "story_studio_draft_episodes_draft_id_idx" ON "story_studio_draft_episodes"("draft_id");

CREATE INDEX "story_studio_generated_assets_draft_id_idx" ON "story_studio_generated_assets"("draft_id");

CREATE INDEX "story_studio_generation_jobs_draft_id_idx" ON "story_studio_generation_jobs"("draft_id");

CREATE INDEX "story_studio_generation_jobs_status_idx" ON "story_studio_generation_jobs"("status");

ALTER TABLE "story_studio_drafts" ADD CONSTRAINT "story_studio_drafts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "story_studio_drafts" ADD CONSTRAINT "story_studio_drafts_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "story_studio_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "story_studio_drafts" ADD CONSTRAINT "story_studio_drafts_linked_story_id_fkey" FOREIGN KEY ("linked_story_id") REFERENCES "stories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "story_studio_draft_episodes" ADD CONSTRAINT "story_studio_draft_episodes_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "story_studio_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_studio_generated_assets" ADD CONSTRAINT "story_studio_generated_assets_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "story_studio_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_studio_generated_assets" ADD CONSTRAINT "story_studio_generated_assets_draft_episode_id_fkey" FOREIGN KEY ("draft_episode_id") REFERENCES "story_studio_draft_episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "story_studio_generation_jobs" ADD CONSTRAINT "story_studio_generation_jobs_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "story_studio_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
