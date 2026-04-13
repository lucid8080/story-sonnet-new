-- CreateEnum
CREATE TYPE "ContentSpotlightBadgeCorner" AS ENUM ('bottom_right', 'bottom_left', 'top_right', 'top_left');

-- AlterTable
ALTER TABLE "content_spotlights" ADD COLUMN "badge_corner" "ContentSpotlightBadgeCorner" NOT NULL DEFAULT 'bottom_right';
