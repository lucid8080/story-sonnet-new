-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlogGenerationSource" AS ENUM ('MANUAL', 'AI_SCRATCH', 'AI_KEYWORDS', 'AI_REWRITE');

-- CreateEnum
CREATE TYPE "BlogKeywordPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BlogKeywordStatus" AS ENUM ('UNUSED', 'TOPIC_CREATED', 'DRAFT_CREATED', 'PUBLISHED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BlogKeywordSourceType" AS ENUM ('MANUAL', 'IMPORTED', 'AI_SUGGESTED');

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "accent_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_keyword_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_keyword_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content_html" TEXT NOT NULL,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "featured_image_url" TEXT,
    "featured_image_storage_key" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "canonical_url" TEXT,
    "author_name" TEXT,
    "author_id" TEXT,
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "allow_comments" BOOLEAN NOT NULL DEFAULT false,
    "reading_time_minutes" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "meta_keywords" TEXT,
    "ai_prompt" TEXT,
    "ai_keywords" JSONB,
    "generation_source" "BlogGenerationSource" NOT NULL DEFAULT 'MANUAL',
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_tags" (
    "post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "blog_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalized_keyword" TEXT NOT NULL,
    "search_intent" TEXT,
    "notes" TEXT,
    "priority" "BlogKeywordPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "BlogKeywordStatus" NOT NULL DEFAULT 'UNUSED',
    "source_type" "BlogKeywordSourceType" NOT NULL DEFAULT 'MANUAL',
    "category_id" TEXT,
    "group_id" TEXT,
    "target_audience" TEXT,
    "related_questions" JSONB,
    "tags_json" JSONB,
    "assigned_topic_title" TEXT,
    "assigned_blog_post_id" TEXT,
    "last_generated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_categories_slug_idx" ON "blog_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_categories_created_at_idx" ON "blog_categories"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_slug_key" ON "blog_tags"("slug");

-- CreateIndex
CREATE INDEX "blog_tags_slug_idx" ON "blog_tags"("slug");

-- CreateIndex
CREATE INDEX "blog_tags_created_at_idx" ON "blog_tags"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_keyword_groups_slug_key" ON "blog_keyword_groups"("slug");

-- CreateIndex
CREATE INDEX "blog_keyword_groups_slug_idx" ON "blog_keyword_groups"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts"("published_at");

-- CreateIndex
CREATE INDEX "blog_posts_scheduled_at_idx" ON "blog_posts"("scheduled_at");

-- CreateIndex
CREATE INDEX "blog_posts_category_id_idx" ON "blog_posts"("category_id");

-- CreateIndex
CREATE INDEX "blog_posts_is_featured_idx" ON "blog_posts"("is_featured");

-- CreateIndex
CREATE INDEX "blog_posts_created_at_idx" ON "blog_posts"("created_at");

-- CreateIndex
CREATE INDEX "blog_posts_updated_at_idx" ON "blog_posts"("updated_at");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "blog_posts_status_scheduled_at_idx" ON "blog_posts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_keywords_normalized_keyword_key" ON "blog_keywords"("normalized_keyword");

-- CreateIndex
CREATE UNIQUE INDEX "blog_keywords_assigned_blog_post_id_key" ON "blog_keywords"("assigned_blog_post_id");

-- CreateIndex
CREATE INDEX "blog_keywords_keyword_idx" ON "blog_keywords"("keyword");

-- CreateIndex
CREATE INDEX "blog_keywords_normalized_keyword_idx" ON "blog_keywords"("normalized_keyword");

-- CreateIndex
CREATE INDEX "blog_keywords_status_idx" ON "blog_keywords"("status");

-- CreateIndex
CREATE INDEX "blog_keywords_priority_idx" ON "blog_keywords"("priority");

-- CreateIndex
CREATE INDEX "blog_keywords_category_id_idx" ON "blog_keywords"("category_id");

-- CreateIndex
CREATE INDEX "blog_keywords_created_at_idx" ON "blog_keywords"("created_at");

-- CreateIndex
CREATE INDEX "blog_post_tags_tag_id_idx" ON "blog_post_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_keywords" ADD CONSTRAINT "blog_keywords_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_keywords" ADD CONSTRAINT "blog_keywords_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "blog_keyword_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_keywords" ADD CONSTRAINT "blog_keywords_assigned_blog_post_id_fkey" FOREIGN KEY ("assigned_blog_post_id") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
