-- AlterTable
ALTER TABLE "story_series_comments"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "story_series_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_slug" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_series_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_series_ratings_story_slug_idx" ON "story_series_ratings"("story_slug");

-- CreateIndex
CREATE UNIQUE INDEX "story_series_ratings_user_id_story_slug_key" ON "story_series_ratings"("user_id", "story_slug");

-- AddForeignKey
ALTER TABLE "story_series_ratings" ADD CONSTRAINT "story_series_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
