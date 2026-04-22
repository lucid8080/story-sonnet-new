import type { GenerationOptionGroup, ResolvedGenerationOption } from '@/lib/generation/types';
import { toSafeLabel } from '@/lib/generation/resolve';

export function serializeGenerationOption(option: ResolvedGenerationOption) {
  return {
    id: option.id,
    family: option.family,
    provider: option.provider,
    providerLabel: option.providerLabel,
    vendorLabel: option.vendorLabel ?? null,
    kind: option.kind,
    value: option.value,
    label: option.label,
    displayLabel: toSafeLabel(option),
    compositeKey: option.compositeKey,
    source: option.source,
    sortOrder: option.sortOrder ?? 0,
  };
}

export function serializeGenerationOptionGroup(group: GenerationOptionGroup) {
  return {
    provider: group.provider,
    providerLabel: group.providerLabel,
    items: group.items.map(serializeGenerationOption),
  };
}
