-- Blog admin singleton (custom feature-image style presets JSON array)
CREATE TABLE "blog_admin_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "feature_image_style_custom_presets_json" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_admin_settings_pkey" PRIMARY KEY ("id")
);
