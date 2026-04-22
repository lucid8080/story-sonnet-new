import type { PrismaClient } from '@prisma/client';
import { BUILT_IN_GENERATION_CATALOG, GENERATION_TOOL_FAMILY } from '@/lib/generation/catalog';
import type {
  GenerationFamily,
  GenerationOptionGroup,
  GenerationToolKey,
  ProviderKey,
  ResolvedGenerationOption,
} from '@/lib/generation/types';

type GenerationPrismaLike = PrismaClient & {
  generationOption?: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        family: string;
        provider: string;
        kind: string;
        vendorLabel: string | null;
        label: string;
        value: string;
        envKeyRequired: string | null;
        isEnabled: boolean;
        sortOrder: number;
      }>
    >;
  };
  generationToolPreference?: {
    findUnique: (args: unknown) => Promise<{ selectedCompositeKey: string | null } | null>;
    upsert?: (args: unknown) => Promise<unknown>;
  };
};

function isMissingGenerationTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; meta?: { table?: string } };
  return (
    e.code === 'P2021' &&
    typeof e.meta?.table === 'string' &&
    (e.meta.table.includes('generation_options') ||
      e.meta.table.includes('generation_tool_preferences'))
  );
}

function providerLabelFromKey(provider: ProviderKey): string {
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'openai') return 'OpenAI';
  return 'ElevenLabs';
}

function requiredEnvEnabled(envKey?: string | null): boolean {
  if (!envKey) return true;
  return Boolean(process.env[envKey]?.trim());
}

function makeCompositeKey(family: GenerationFamily, provider: string, value: string): string {
  return `${family}:${provider}:${value}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function toSafeLabel(option: ResolvedGenerationOption): string {
  return option.vendorLabel?.trim()
    ? `${option.vendorLabel}: ${option.label}`
    : option.label;
}

export async function listResolvedGenerationOptionsByFamily(
  prisma: PrismaClient,
  family: GenerationFamily
): Promise<ResolvedGenerationOption[]> {
  const builtIns = BUILT_IN_GENERATION_CATALOG.filter((item) => item.family === family).map(
    (item) =>
      ({
        ...item,
        isEnabled: item.isEnabled ?? true,
        compositeKey: makeCompositeKey(item.family, item.provider, item.value),
        source: 'built_in' as const,
      }) satisfies ResolvedGenerationOption
  );

  const prismaGeneration = prisma as GenerationPrismaLike;
  let customRows: Array<{
    id: string;
    family: string;
    provider: string;
    kind: string;
    vendorLabel: string | null;
    label: string;
    value: string;
    envKeyRequired: string | null;
    isEnabled: boolean;
    sortOrder: number;
  }> = [];
  if (prismaGeneration.generationOption) {
    try {
      customRows = await prismaGeneration.generationOption.findMany({
        where: { family, isEnabled: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });
    } catch (error) {
      if (!isMissingGenerationTableError(error)) throw error;
    }
  }

  const custom: ResolvedGenerationOption[] = customRows.map((row) => ({
    id: row.id,
    family: row.family as GenerationFamily,
    provider: row.provider as ProviderKey,
    providerLabel: providerLabelFromKey(row.provider as ProviderKey),
    vendorLabel: row.vendorLabel ?? undefined,
    kind: row.kind as 'model' | 'voice',
    value: row.value,
    label: row.label,
    envKeyRequired: row.envKeyRequired ?? undefined,
    isEnabled: row.isEnabled,
    sortOrder: row.sortOrder,
    compositeKey: makeCompositeKey(row.family as GenerationFamily, row.provider, row.value),
    source: 'custom',
  }));

  const seen = new Set<string>();
  const merged: ResolvedGenerationOption[] = [];
  [...builtIns, ...custom].forEach((item) => {
    const dedupe = `${item.family}:${item.provider}:${normalize(item.value)}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    if (!requiredEnvEnabled(item.envKeyRequired)) return;
    if (item.isEnabled === false) return;
    merged.push(item);
  });

  return merged.sort((a, b) => {
    const sa = a.sortOrder ?? 0;
    const sb = b.sortOrder ?? 0;
    if (sa !== sb) return sa - sb;
    if (a.providerLabel !== b.providerLabel) return a.providerLabel.localeCompare(b.providerLabel);
    return a.label.localeCompare(b.label);
  });
}

export async function listGroupedGenerationOptionsByFamily(
  prisma: PrismaClient,
  family: GenerationFamily
): Promise<GenerationOptionGroup[]> {
  const options = await listResolvedGenerationOptionsByFamily(prisma, family);
  const groups = new Map<string, GenerationOptionGroup>();
  for (const option of options) {
    const key = option.provider;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        provider: option.provider,
        providerLabel: option.providerLabel,
        items: [option],
      });
      continue;
    }
    current.items.push(option);
  }
  return [...groups.values()];
}

function defaultForTool(
  all: ResolvedGenerationOption[],
  toolKey: GenerationToolKey
): ResolvedGenerationOption | null {
  const family = GENERATION_TOOL_FAMILY[toolKey];
  const familyOptions = all.filter((o) => o.family === family);
  return familyOptions[0] ?? null;
}

export async function resolveSelectionForTool(
  prisma: PrismaClient,
  toolKey: GenerationToolKey
): Promise<{
  selection: ResolvedGenerationOption | null;
  fallbackApplied: boolean;
  reason?: string;
}> {
  const family = GENERATION_TOOL_FAMILY[toolKey];
  const options = await listResolvedGenerationOptionsByFamily(prisma, family);
  if (!options.length) {
    return {
      selection: null,
      fallbackApplied: false,
      reason: `No enabled providers for ${family}.`,
    };
  }

  const prismaGeneration = prisma as GenerationPrismaLike;
  let pref: { selectedCompositeKey: string | null } | null = null;
  if (prismaGeneration.generationToolPreference) {
    try {
      pref = await prismaGeneration.generationToolPreference.findUnique({
        where: { toolKey },
      });
    } catch (error) {
      if (!isMissingGenerationTableError(error)) throw error;
    }
  }
  if (!pref?.selectedCompositeKey) {
    const fallback = defaultForTool(options, toolKey);
    if (fallback && prismaGeneration.generationToolPreference) {
      try {
        await prismaGeneration.generationToolPreference.upsert({
          where: { toolKey },
          create: {
            toolKey,
            family,
            selectedCompositeKey: fallback.compositeKey,
          },
          update: {
            family,
            selectedCompositeKey: fallback.compositeKey,
          },
        });
      } catch (error) {
        if (!isMissingGenerationTableError(error)) throw error;
      }
    }
    return { selection: fallback, fallbackApplied: true };
  }

  const selected = options.find((o) => o.compositeKey === pref.selectedCompositeKey);
  if (selected) {
    return { selection: selected, fallbackApplied: false };
  }
  const fallback = defaultForTool(options, toolKey);
  return {
    selection: fallback,
    fallbackApplied: true,
    reason: 'Saved selection is unavailable; applied fallback.',
  };
}

export async function validateSelectionForTool(
  prisma: PrismaClient,
  toolKey: GenerationToolKey,
  selectedCompositeKey: string
): Promise<ResolvedGenerationOption | null> {
  const family = GENERATION_TOOL_FAMILY[toolKey];
  const options = await listResolvedGenerationOptionsByFamily(prisma, family);
  return options.find((option) => option.compositeKey === selectedCompositeKey) ?? null;
}
