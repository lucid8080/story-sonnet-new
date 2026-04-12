-- Admin inbox: sign-up + subscription-active events; per-admin read cursor

CREATE TYPE "AdminInboxEventType" AS ENUM ('user_signup', 'subscription_active');

CREATE TABLE "admin_inbox_events" (
    "id" TEXT NOT NULL,
    "type" "AdminInboxEventType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_inbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_inbox_events_created_at_idx" ON "admin_inbox_events"("created_at");
CREATE INDEX "admin_inbox_events_user_id_idx" ON "admin_inbox_events"("user_id");

ALTER TABLE "admin_inbox_events" ADD CONSTRAINT "admin_inbox_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "admin_notification_seen" (
    "admin_user_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_notification_seen_pkey" PRIMARY KEY ("admin_user_id")
);

ALTER TABLE "admin_notification_seen" ADD CONSTRAINT "admin_notification_seen_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
