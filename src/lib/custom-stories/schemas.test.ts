import { describe, expect, it } from 'vitest';
import {
  createCustomStoryOrderSchema,
  orderInputToGenerationPatch,
} from '@/lib/custom-stories/schemas';

describe('createCustomStoryOrderSchema', () => {
  const valid = {
    packageType: 'premium',
    episodeCount: 5,
    nfcRequested: false,
    simpleIdea: 'A brave child learns teamwork in a moonlit forest.',
  };

  it('accepts valid payloads', () => {
    const parsed = createCustomStoryOrderSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('requires simple idea', () => {
    const parsed = createCustomStoryOrderSchema.safeParse({
      ...valid,
      simpleIdea: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('maps order input into generation patch fields', () => {
    const parsed = createCustomStoryOrderSchema.parse(valid);
    const patch = orderInputToGenerationPatch(parsed);
    expect(patch.simpleIdea).toBe(valid.simpleIdea);
    expect(patch.lesson).toBe('kindness');
    expect(patch.tagDensity).toBe('medium');
  });
});
