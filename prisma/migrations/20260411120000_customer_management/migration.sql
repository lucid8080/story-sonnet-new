-- Customer management: Profile extensions + ledger, notes, audit, purchases

CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'banned', 'pending', 'deleted');
CREATE TYPE "RiskLevel" AS ENUM ('none', 'low', 'medium', 'high');
CREATE TYPE "CreditLedgerType" AS ENUM ('grant', 'spend', 'refund', 'promo', 'manual_adjustment');
CREATE TYPE "NoteVisibility" AS ENUM ('internal', 'support');

ALTER TABLE "profiles" ADD COLUMN "account_status" "AccountStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "profiles" ADD COLUMN "subscription_plan" TEXT;
ALTER TABLE "profiles" ADD COLUMN "credit_balance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "last_active_at" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN "login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "lifetime_spend_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "refund_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "is_flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_vip" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "risk_level" "RiskLevel" NOT NULL DEFAULT 'none';
ALTER TABLE "profiles" ADD COLUMN "internal_tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "profiles" ADD COLUMN "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_guardian_managed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_minor_account" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "consent_status" TEXT;
ALTER TABLE "profiles" ADD COLUMN "communication_restricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "compliance_notes" TEXT;
ALTER TABLE "profiles" ADD COLUMN "total_engagement_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "profiles_account_status_idx" ON "profiles"("account_status");
CREATE INDEX "profiles_subscription_status_idx" ON "profiles"("subscription_status");
CREATE INDEX "profiles_last_active_at_idx" ON "profiles"("last_active_at");
CREATE INDEX "profiles_created_at_idx" ON "profiles"("created_at");

CREATE TABLE "customer_credit_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreditLedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_credit_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_credit_ledger_user_id_created_at_idx" ON "customer_credit_ledger"("user_id", "created_at");

ALTER TABLE "customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_admin_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "author_admin_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'internal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_admin_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_admin_notes_user_id_created_at_idx" ON "customer_admin_notes"("user_id", "created_at");

ALTER TABLE "customer_admin_notes" ADD CONSTRAINT "customer_admin_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_admin_notes" ADD CONSTRAINT "customer_admin_notes_author_admin_id_fkey" FOREIGN KEY ("author_admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "customer_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "actor_admin_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_audit_logs_user_id_created_at_idx" ON "customer_audit_logs"("user_id", "created_at");
CREATE INDEX "customer_audit_logs_actor_admin_id_idx" ON "customer_audit_logs"("actor_admin_id");

ALTER TABLE "customer_audit_logs" ADD CONSTRAINT "customer_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_audit_logs" ADD CONSTRAINT "customer_audit_logs_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "customer_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "product_type" TEXT NOT NULL DEFAULT 'subscription',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_purchases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_purchases_user_id_created_at_idx" ON "customer_purchases"("user_id", "created_at");

ALTER TABLE "customer_purchases" ADD CONSTRAINT "customer_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
