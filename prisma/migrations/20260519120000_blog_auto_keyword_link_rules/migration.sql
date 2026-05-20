-- External keyword → URL rules for blog auto-linking
ALTER TABLE "blog_admin_settings"
ADD COLUMN "auto_keyword_link_rules_json" JSONB NOT NULL DEFAULT '[]';
