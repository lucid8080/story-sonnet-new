-- CreateEnum
CREATE TYPE "ContentSpotlightType" AS ENUM ('holiday', 'awareness_month', 'seasonal', 'editorial');

-- CreateEnum
CREATE TYPE "ContentSpotlightStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired');

-- CreateEnum
CREATE TYPE "ContentSpotlightRecurrence" AS ENUM ('one_time', 'recurring_yearly');

-- CreateTable
CREATE TABLE "badge_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'image/png',
    "width" INTEGER,
    "height" INTEGER,
    "file_size_bytes" INTEGER,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_spotlights" (
    "id" TEXT NOT NULL,
    "internal_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ContentSpotlightType" NOT NULL,
    "short_blurb" TEXT NOT NULL,
    "long_description" TEXT,
    "popup_title" TEXT NOT NULL,
    "popup_body" TEXT NOT NULL,
    "info_bar_text" TEXT NOT NULL,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recurrence" "ContentSpotlightRecurrence" NOT NULL DEFAULT 'one_time',
    "status" "ContentSpotlightStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "show_badge" BOOLEAN NOT NULL DEFAULT true,
    "show_popup" BOOLEAN NOT NULL DEFAULT true,
    "show_info_bar" BOOLEAN NOT NULL DEFAULT true,
    "feature_on_homepage" BOOLEAN NOT NULL DEFAULT false,
    "feature_on_library_page" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "theme_token" TEXT,
    "badge_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_spotlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_spotlight_stories" (
    "id" TEXT NOT NULL,
    "spotlight_id" TEXT NOT NULL,
    "story_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "card_title_override" TEXT,

    CONSTRAINT "content_spotlight_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_calendar_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_calendar_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "badge_assets_created_at_idx" ON "badge_assets"("created_at");

-- CreateIndex
CREATE INDEX "content_spotlights_status_starts_at_ends_at_idx" ON "content_spotlights"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "content_spotlights_priority_idx" ON "content_spotlights"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "content_spotlights_slug_key" ON "content_spotlights"("slug");

-- CreateIndex
CREATE INDEX "content_spotlight_stories_spotlight_id_sort_order_idx" ON "content_spotlight_stories"("spotlight_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "content_spotlight_stories_spotlight_id_story_id_key" ON "content_spotlight_stories"("spotlight_id", "story_id");

-- AddForeignKey
ALTER TABLE "badge_assets" ADD CONSTRAINT "badge_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_spotlights" ADD CONSTRAINT "content_spotlights_badge_asset_id_fkey" FOREIGN KEY ("badge_asset_id") REFERENCES "badge_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_spotlight_stories" ADD CONSTRAINT "content_spotlight_stories_spotlight_id_fkey" FOREIGN KEY ("spotlight_id") REFERENCES "content_spotlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_spotlight_stories" ADD CONSTRAINT "content_spotlight_stories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
