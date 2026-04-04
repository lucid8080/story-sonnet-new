-- AlterTable
ALTER TABLE "episodes" ADD COLUMN "audio_storage_key" TEXT;
ALTER TABLE "episodes" ADD COLUMN "is_free_preview" BOOLEAN NOT NULL DEFAULT false;
