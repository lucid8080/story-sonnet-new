-- CreateTable
CREATE TABLE "story_series_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_series_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_stories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_series_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_series_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_series_likes_story_slug_idx" ON "story_series_likes"("story_slug");

-- CreateIndex
CREATE UNIQUE INDEX "story_series_likes_user_id_story_slug_key" ON "story_series_likes"("user_id", "story_slug");

-- CreateIndex
CREATE INDEX "user_saved_stories_story_slug_idx" ON "user_saved_stories"("story_slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_stories_user_id_story_slug_key" ON "user_saved_stories"("user_id", "story_slug");

-- CreateIndex
CREATE INDEX "story_series_comments_story_slug_created_at_idx" ON "story_series_comments"("story_slug", "created_at");

-- AddForeignKey
ALTER TABLE "story_series_likes" ADD CONSTRAINT "story_series_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_stories" ADD CONSTRAINT "user_saved_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_series_comments" ADD CONSTRAINT "story_series_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
