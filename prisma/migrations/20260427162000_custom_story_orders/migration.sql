CREATE TABLE "custom_story_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_type" TEXT NOT NULL,
    "episode_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inputs" JSONB NOT NULL,
    "story_id" BIGINT,
    "stripe_session_id" TEXT,
    "price_cents" INTEGER NOT NULL,
    "nfc_requested" BOOLEAN NOT NULL DEFAULT false,
    "nfc_fulfilled_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "generation_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_story_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "custom_story_orders_user_id_created_at_idx" ON "custom_story_orders"("user_id", "created_at");
CREATE INDEX "custom_story_orders_status_created_at_idx" ON "custom_story_orders"("status", "created_at");
CREATE INDEX "custom_story_orders_stripe_session_id_idx" ON "custom_story_orders"("stripe_session_id");

ALTER TABLE "custom_story_orders"
ADD CONSTRAINT "custom_story_orders_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "custom_story_orders"
ADD CONSTRAINT "custom_story_orders_story_id_fkey"
FOREIGN KEY ("story_id") REFERENCES "stories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
