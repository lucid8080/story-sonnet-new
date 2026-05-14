-- Show/hide promo code entry on public pricing page (Campaigns & Offers settings).
-- Idempotent: safe if a later migration or manual DDL already added the column.
ALTER TABLE "campaign_settings" ADD COLUMN IF NOT EXISTS "show_promo_code_on_pricing" BOOLEAN NOT NULL DEFAULT true;
