-- CreateTable
CREATE TABLE "generation_options" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "vendor_label" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "env_key_required" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_tool_preferences" (
    "id" TEXT NOT NULL,
    "tool_key" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "selected_composite_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_tool_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generation_options_family_provider_value_key" ON "generation_options"("family", "provider", "value");

-- CreateIndex
CREATE INDEX "generation_options_family_provider_is_enabled_sort_order_idx" ON "generation_options"("family", "provider", "is_enabled", "sort_order");

-- CreateIndex
CREATE INDEX "generation_options_family_kind_is_enabled_idx" ON "generation_options"("family", "kind", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "generation_tool_preferences_tool_key_key" ON "generation_tool_preferences"("tool_key");

-- CreateIndex
CREATE INDEX "generation_tool_preferences_family_tool_key_idx" ON "generation_tool_preferences"("family", "tool_key");
