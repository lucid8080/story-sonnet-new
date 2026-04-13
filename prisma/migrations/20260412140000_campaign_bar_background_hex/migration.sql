-- Optional custom background hex for global top bar (notification + trial)

ALTER TABLE "notification_bar_campaign_details" ADD COLUMN "bar_background_hex" TEXT;
ALTER TABLE "trial_offer_campaign_details" ADD COLUMN "bar_background_hex" TEXT;
