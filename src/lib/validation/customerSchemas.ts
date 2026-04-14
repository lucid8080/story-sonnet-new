import { z } from 'zod';

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().max(200).optional().or(z.literal('')),
  accountStatus: z
    .enum(['all', 'active', 'suspended', 'banned', 'pending', 'deleted'])
    .default('all'),
  role: z.string().max(64).optional().or(z.literal('')),
  plan: z.enum(['all', 'free', 'paying', 'premium_profile', 'past_due']).default('all'),
  joined: z.enum(['all', 'last7', 'last30']).default('all'),
  activity: z.enum(['all', 'active7', 'inactive30', 'never', 'no_activity_after_signup']).default('all'),
  flagged: z.enum(['all', 'yes', 'no']).default('all'),
  /** First TrialClaim (by createdAt) — app/cardless trial window per premiumAccess. */
  trial: z.enum(['all', 'active', 'ended', 'none']).default('all'),
  sort: z
    .enum([
      'created_desc',
      'created_asc',
      'last_active_desc',
      'last_active_asc',
      'spend_desc',
      'credits_desc',
      'usage_desc',
      'email_asc',
    ])
    .default('created_desc'),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export const customerPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().max(320).optional(),
    fullName: z.string().max(200).nullable().optional(),
    avatarUrl: z.string().url().max(2000).nullable().optional(),
    subscriptionPlan: z.string().max(64).nullable().optional(),
    marketingOptIn: z.boolean().optional(),
    internalTags: z.array(z.string().max(64)).max(50).optional(),
    isVip: z.boolean().optional(),
    isFlagged: z.boolean().optional(),
    riskLevel: z.enum(['none', 'low', 'medium', 'high']).optional(),
    isGuardianManaged: z.boolean().optional(),
    isMinorAccount: z.boolean().optional(),
    consentStatus: z.string().max(200).nullable().optional(),
    communicationRestricted: z.boolean().optional(),
    complianceNotes: z.string().max(8000).nullable().optional(),
    reason: z.string().min(3).max(2000),
  })
  .strict();

export const customerCreditsBodySchema = z.object({
  amount: z.number().int().min(-1_000_000).max(1_000_000),
  reason: z.string().min(3).max(2000),
  source: z.string().max(200).optional(),
});

export const customerStatusBodySchema = z.object({
  accountStatus: z.enum(['active', 'suspended', 'banned', 'pending', 'deleted']),
  reason: z.string().min(3).max(2000),
});

export const customerNoteBodySchema = z.object({
  body: z.string().min(1).max(8000),
  visibility: z.enum(['internal', 'support']).default('internal'),
});

export const bulkActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add_tag'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    tag: z.string().min(1).max(64),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('remove_tag'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    tag: z.string().min(1).max(64),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('grant_credits'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    amount: z.number().int().min(1).max(100000),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('suspend'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('activate'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('flag'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('unflag'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal('add_note_template'),
    userIds: z.array(z.string().cuid()).min(1).max(200),
    template: z.string().min(1).max(8000),
    reason: z.string().min(3).max(2000),
  }),
]);

export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const notesListQuerySchema = auditListQuerySchema;
