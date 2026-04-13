import { describe, expect, it } from 'vitest';
import { sortCampaignsByConflictRules, sortKeyForCampaign } from '../resolve';

describe('sortKeyForCampaign', () => {
  it('boosts pinned campaigns', () => {
    const base = {
      publishedAt: new Date('2020-01-01'),
      createdAt: new Date('2020-01-01'),
    };
    expect(sortKeyForCampaign({ priority: 1, pinnedHighest: false, ...base })).toBe(1);
    expect(sortKeyForCampaign({ priority: 1, pinnedHighest: true, ...base })).toBe(1_000_000_001);
  });
});

describe('sortCampaignsByConflictRules', () => {
  const d = (iso: string) => new Date(iso);

  it('orders by priority then publishedAt', () => {
    const a = { id: 'a', priority: 1, pinnedHighest: false, publishedAt: d('2024-01-01'), createdAt: d('2024-01-01') };
    const b = { id: 'b', priority: 5, pinnedHighest: false, publishedAt: d('2024-01-02'), createdAt: d('2024-01-02') };
    const sorted = sortCampaignsByConflictRules([a, b]);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('pinned wins over higher numeric priority', () => {
    const lowPinned = {
      id: 'p',
      priority: 0,
      pinnedHighest: true,
      publishedAt: d('2020-01-01'),
      createdAt: d('2020-01-01'),
    };
    const high = {
      id: 'h',
      priority: 999,
      pinnedHighest: false,
      publishedAt: d('2025-01-01'),
      createdAt: d('2025-01-01'),
    };
    const sorted = sortCampaignsByConflictRules([high, lowPinned]);
    expect(sorted[0].id).toBe('p');
  });

  it('tie-breaks with newer publishedAt', () => {
    const older = {
      id: 'o',
      priority: 3,
      pinnedHighest: false,
      publishedAt: d('2024-01-01'),
      createdAt: d('2024-01-01'),
    };
    const newer = {
      id: 'n',
      priority: 3,
      pinnedHighest: false,
      publishedAt: d('2024-06-01'),
      createdAt: d('2024-01-01'),
    };
    const sorted = sortCampaignsByConflictRules([older, newer]);
    expect(sorted[0].id).toBe('n');
  });

  it('uses createdAt when publishedAt null', () => {
    const first = {
      id: '1',
      priority: 0,
      pinnedHighest: false,
      publishedAt: null,
      createdAt: d('2023-01-01'),
    };
    const second = {
      id: '2',
      priority: 0,
      pinnedHighest: false,
      publishedAt: null,
      createdAt: d('2024-01-01'),
    };
    const sorted = sortCampaignsByConflictRules([first, second]);
    expect(sorted[0].id).toBe('2');
  });
});
