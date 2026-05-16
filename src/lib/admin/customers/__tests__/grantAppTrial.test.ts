import { describe, expect, it } from 'vitest';
import { computeAppTrialExpiresAt } from '../grantAppTrial';

describe('computeAppTrialExpiresAt', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('adds duration from now when there is no existing claim', () => {
    const exp = computeAppTrialExpiresAt({ now, durationDays: 7 });
    expect(exp.toISOString()).toBe('2026-06-22T12:00:00.000Z');
  });

  it('extends from existing expiry when still active', () => {
    const exp = computeAppTrialExpiresAt({
      now,
      durationDays: 7,
      existingExpiresAt: new Date('2026-06-20T12:00:00.000Z'),
    });
    expect(exp.toISOString()).toBe('2026-06-27T12:00:00.000Z');
  });

  it('starts from now when existing expiry is in the past', () => {
    const exp = computeAppTrialExpiresAt({
      now,
      durationDays: 3,
      existingExpiresAt: new Date('2026-06-01T12:00:00.000Z'),
    });
    expect(exp.toISOString()).toBe('2026-06-18T12:00:00.000Z');
  });
});
