-- Story Studio singleton settings (art style prompt overrides, etc.)
CREATE TABLE "story_studio_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "art_style_prompt_overrides_json" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_studio_settings_pkey" PRIMARY KEY ("id")
);
