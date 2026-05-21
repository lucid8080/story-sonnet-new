-- Narrators and story ↔ narrator assignments

CREATE TABLE "narrators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "narrators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "narrators_slug_key" ON "narrators"("slug");
CREATE INDEX "narrators_sort_order_name_idx" ON "narrators"("sort_order", "name");

CREATE TABLE "story_narrators" (
    "story_id" BIGINT NOT NULL,
    "narrator_id" TEXT NOT NULL,

    CONSTRAINT "story_narrators_pkey" PRIMARY KEY ("story_id","narrator_id")
);

CREATE INDEX "story_narrators_narrator_id_idx" ON "story_narrators"("narrator_id");

ALTER TABLE "story_narrators" ADD CONSTRAINT "story_narrators_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_narrators" ADD CONSTRAINT "story_narrators_narrator_id_fkey" FOREIGN KEY ("narrator_id") REFERENCES "narrators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
