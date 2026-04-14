import { describe, expect, it } from 'vitest';
import { hasActiveAppTrial, isStripePayingOrTrialing } from '../premiumAccess';

describe('isStripePayingOrTrialing', () => {
  it('is true for active and trialing', () => {
    expect(isStripePayingOrTrialing('active')).toBe(true);
    expect(isStripePayingOrTrialing('trialing')).toBe(true);
  });
  it('is false for free', () => {
    expect(isStripePayingOrTrialing('free')).toBe(false);
    expect(isStripePayingOrTrialing(undefined)).toBe(false);
  });
});

describe('hasActiveAppTrial', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('is false when no expiry', () => {
    expect(hasActiveAppTrial(null, now)).toBe(false);
  });

  it('is true when expiry is after now', () => {
    expect(hasActiveAppTrial(new Date('2026-06-20T12:00:00.000Z'), now)).toBe(true);
  });

  it('is false when expiry is on or before now', () => {
    expect(hasActiveAppTrial(new Date('2026-06-15T12:00:00.000Z'), now)).toBe(false);
    expect(hasActiveAppTrial(new Date('2026-06-10T12:00:00.000Z'), now)).toBe(false);
  });
});
