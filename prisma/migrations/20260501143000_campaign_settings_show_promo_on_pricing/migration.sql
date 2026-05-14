-- Show/hide promo code entry on public pricing page (Campaigns & Offers settings).
ALTER TABLE "campaign_settings" ADD COLUMN IF NOT EXISTS "show_promo_code_on_pricing" BOOLEAN NOT NULL DEFAULT true;
