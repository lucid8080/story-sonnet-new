CREATE TABLE "generation_settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "custom_stories_global_enabled" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "generation_settings_pkey" PRIMARY KEY ("id")
);
