-- Campaigns & Offers: marketing campaigns, placements, analytics, promos, trials

CREATE TYPE "CampaignType" AS ENUM ('notification_bar', 'trial_offer', 'promo_code');
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired');
CREATE TYPE "CampaignPlacementKey" AS ENUM (
    'global_top_bar',
    'homepage_hero',
    'pricing_banner',
    'checkout_callout',
    'account_dashboard_card',
    'library_banner',
    'story_detail_banner',
    'modal_trigger'
);
CREATE TYPE "CampaignAudience" AS ENUM (
    'all',
    'logged_out',
    'logged_in',
    'subscribers',
    'free_users',
    'trial_users',
    'new_users'
);
CREATE TYPE "NotificationDismissPolicy" AS ENUM ('session', 'hours_24', 'days_7', 'until_campaign_end');
CREATE TYPE "DiscountType" AS ENUM ('percent', 'fixed_cents', 'trial_extension_days', 'free_first_payment');
CREATE TYPE "PromoDurationMode" AS ENUM ('once', 'recurring_cycles', 'forever');
CREATE TYPE "PromoStackingRule" AS ENUM ('none', 'with_trial', 'with_announcement_only');
CREATE TYPE "AnalyticsEventType" AS ENUM (
    'impression',
    'cta_click',
    'dismiss',
    'trial_claim',
    'promo_validate_ok',
    'promo_validate_fail',
    'promo_redeem',
    'conversion_proxy'
);
CREATE TYPE "TrialOfferKind" AS ENUM ('fixed_duration', 'weekend_trial', 'first_month_free', 'premium_unlock');

CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "internal_name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pinned_highest" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaigns_status_starts_at_ends_at_type_idx" ON "campaigns" ("status", "starts_at", "ends_at", "type");
CREATE INDEX "campaigns_priority_published_at_idx" ON "campaigns" ("priority", "published_at");
CREATE INDEX "campaigns_type_status_idx" ON "campaigns" ("type", "status");

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "campaign_placements" (
    "campaign_id" TEXT NOT NULL,
    "placement" "CampaignPlacementKey" NOT NULL,

    CONSTRAINT "campaign_placements_pkey" PRIMARY KEY ("campaign_id","placement")
);

CREATE INDEX "campaign_placements_placement_idx" ON "campaign_placements" ("placement");

ALTER TABLE "campaign_placements" ADD CONSTRAINT "campaign_placements_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_bar_campaign_details" (
    "campaign_id" TEXT NOT NULL,
    "message_primary" TEXT NOT NULL,
    "message_secondary" TEXT,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "dismiss_policy" "NotificationDismissPolicy" NOT NULL DEFAULT 'session',
    "icon_or_badge_text" TEXT,
    "bg_variant" TEXT NOT NULL DEFAULT 'brand',
    "text_variant" TEXT NOT NULL DEFAULT 'light',
    "audience" "CampaignAudience" NOT NULL DEFAULT 'all',

    CONSTRAINT "notification_bar_campaign_details_pkey" PRIMARY KEY ("campaign_id")
);

ALTER TABLE "notification_bar_campaign_details" ADD CONSTRAINT "notification_bar_campaign_details_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "trial_offer_campaign_details" (
    "campaign_id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT,
    "badge_text" TEXT,
    "cta_label" TEXT NOT NULL DEFAULT 'Start trial',
    "offer_kind" "TrialOfferKind" NOT NULL DEFAULT 'fixed_duration',
    "duration_days" INTEGER NOT NULL DEFAULT 7,
    "eligibility_json" JSONB NOT NULL DEFAULT '{}',
    "max_total_redemptions" INTEGER,
    "max_per_user" INTEGER,
    "unlimited_redemptions" BOOLEAN NOT NULL DEFAULT true,
    "auto_apply_signup" BOOLEAN NOT NULL DEFAULT false,
    "linked_promo_campaign_id" TEXT,
    "landing_slug" TEXT,

    CONSTRAINT "trial_offer_campaign_details_pkey" PRIMARY KEY ("campaign_id")
);

ALTER TABLE "trial_offer_campaign_details" ADD CONSTRAINT "trial_offer_campaign_details_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trial_offer_campaign_details" ADD CONSTRAINT "trial_offer_campaign_details_linked_promo_campaign_id_fkey" FOREIGN KEY ("linked_promo_campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "promo_code_campaign_details" (
    "campaign_id" TEXT NOT NULL,
    "code_raw" TEXT NOT NULL,
    "code_normalized" TEXT NOT NULL,
    "public_title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "applies_to_all_plans" BOOLEAN NOT NULL DEFAULT true,
    "plan_keys_json" JSONB NOT NULL DEFAULT '[]',
    "duration_mode" "PromoDurationMode" NOT NULL DEFAULT 'once',
    "recurring_cycles" INTEGER,
    "stacking_rule" "PromoStackingRule" NOT NULL DEFAULT 'none',
    "first_purchase_only" BOOLEAN NOT NULL DEFAULT false,
    "logged_in_only" BOOLEAN NOT NULL DEFAULT false,
    "new_users_only" BOOLEAN NOT NULL DEFAULT false,
    "new_user_max_age_days" INTEGER,
    "one_per_account" BOOLEAN NOT NULL DEFAULT true,
    "max_uses_total" INTEGER,
    "max_uses_per_user" INTEGER,
    "unlimited_uses" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promo_code_campaign_details_pkey" PRIMARY KEY ("campaign_id")
);

CREATE UNIQUE INDEX "promo_code_campaign_details_code_normalized_key" ON "promo_code_campaign_details" ("code_normalized");

CREATE INDEX "promo_code_campaign_details_code_normalized_idx" ON "promo_code_campaign_details" ("code_normalized");

ALTER TABLE "promo_code_campaign_details" ADD CONSTRAINT "promo_code_campaign_details_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "campaign_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "default_campaign_priority" INTEGER NOT NULL DEFAULT 0,
    "allow_multiple_top_bars" BOOLEAN NOT NULL DEFAULT false,
    "global_kill_switch" BOOLEAN NOT NULL DEFAULT false,
    "test_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
    "test_mode_user_ids_json" JSONB NOT NULL DEFAULT '[]',
    "preview_header_name" TEXT NOT NULL DEFAULT 'x-campaign-preview',
    "preview_header_secret" TEXT,
    "default_bar_dismiss_policy" "NotificationDismissPolicy" NOT NULL DEFAULT 'session',
    "promos_can_stack_with_trials" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "campaign_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "campaign_settings" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "campaign_analytics_events" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "placement" "CampaignPlacementKey",
    "user_id" TEXT,
    "session_key" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_analytics_events_campaign_id_created_at_idx" ON "campaign_analytics_events" ("campaign_id", "created_at");
CREATE INDEX "campaign_analytics_events_type_created_at_idx" ON "campaign_analytics_events" ("type", "created_at");

ALTER TABLE "campaign_analytics_events" ADD CONSTRAINT "campaign_analytics_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_analytics_events" ADD CONSTRAINT "campaign_analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "promo_code_redemptions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promo_code_redemptions_campaign_id_user_id_idx" ON "promo_code_redemptions" ("campaign_id", "user_id");
CREATE INDEX "promo_code_redemptions_user_id_created_at_idx" ON "promo_code_redemptions" ("user_id", "created_at");

ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "trial_claims" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trial_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trial_claims_campaign_id_user_id_key" ON "trial_claims" ("campaign_id", "user_id");
CREATE INDEX "trial_claims_user_id_idx" ON "trial_claims" ("user_id");

ALTER TABLE "trial_claims" ADD CONSTRAINT "trial_claims_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trial_claims" ADD CONSTRAINT "trial_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "campaign_status_history" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "from_status" "CampaignStatus",
    "to_status" "CampaignStatus" NOT NULL,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_status_history_campaign_id_created_at_idx" ON "campaign_status_history" ("campaign_id", "created_at");

ALTER TABLE "campaign_status_history" ADD CONSTRAINT "campaign_status_history_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_status_history" ADD CONSTRAINT "campaign_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
