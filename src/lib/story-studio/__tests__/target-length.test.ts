import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TARGET_LENGTH_RANGE,
  llmMaxScriptCharsForRange,
  llmMinScriptCharsForRange,
  llmTargetScriptCharsForRange,
  maxTokensForTargetLengthRange,
  remapTargetLengthRange,
  scriptLengthOutOfRangeMessage,
  STORY_STUDIO_LLM_MAX_SCRIPT_CHARS_PER_EPISODE,
  STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE,
  TARGET_LENGTH_RANGE_IDS,
  TARGET_LENGTH_TIERS,
  targetLengthRangeToApproxMinutes,
} from '@/lib/story-studio/target-length';

describe('target-length tiers', () => {
  it('exposes four approved range ids', () => {
    expect([...TARGET_LENGTH_RANGE_IDS]).toEqual([
      '1-3',
      '3-5',
      '5-8',
      '8-12',
    ]);
    expect(TARGET_LENGTH_TIERS).toHaveLength(4);
  });

  it('defaults to 3-5', () => {
    expect(DEFAULT_TARGET_LENGTH_RANGE).toBe('3-5');
  });

  it('keeps edit ceiling at 12k and absolute LLM ceiling at 10k', () => {
    expect(STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE).toBe(12_000);
    expect(STORY_STUDIO_LLM_MAX_SCRIPT_CHARS_PER_EPISODE).toBe(10_000);
  });

  it('returns per-tier min / target / max chars', () => {
    expect(llmMinScriptCharsForRange('1-3')).toBe(1_000);
    expect(llmTargetScriptCharsForRange('1-3')).toBe(1_800);
    expect(llmMaxScriptCharsForRange('1-3')).toBe(2_500);

    expect(llmMinScriptCharsForRange('3-5')).toBe(2_500);
    expect(llmTargetScriptCharsForRange('3-5')).toBe(3_500);
    expect(llmMaxScriptCharsForRange('3-5')).toBe(4_500);

    expect(llmMinScriptCharsForRange('5-8')).toBe(5_000);
    expect(llmTargetScriptCharsForRange('5-8')).toBe(6_000);
    expect(llmMaxScriptCharsForRange('5-8')).toBe(7_000);

    expect(llmMinScriptCharsForRange('8-12')).toBe(7_500);
    expect(llmTargetScriptCharsForRange('8-12')).toBe(8_500);
    expect(llmMaxScriptCharsForRange('8-12')).toBe(10_000);
  });

  it('returns approx midpoint minutes', () => {
    expect(targetLengthRangeToApproxMinutes('1-3')).toBe(2);
    expect(targetLengthRangeToApproxMinutes('3-5')).toBe(4);
    expect(targetLengthRangeToApproxMinutes('5-8')).toBe(6);
    expect(targetLengthRangeToApproxMinutes('8-12')).toBe(10);
  });

  it('scales maxTokens with longer tiers', () => {
    expect(maxTokensForTargetLengthRange('1-3')).toBeLessThan(
      maxTokensForTargetLengthRange('8-12')
    );
  });
});

describe('scriptLengthOutOfRangeMessage', () => {
  it('flags scripts below the tier minimum', () => {
    expect(scriptLengthOutOfRangeMessage('Episode', 4100, '5-8')).toMatch(
      /too short/
    );
  });

  it('flags scripts above the tier maximum', () => {
    expect(scriptLengthOutOfRangeMessage('Episode', 7200, '5-8')).toMatch(
      /exceeds/
    );
  });

  it('returns null when inside the band', () => {
    expect(scriptLengthOutOfRangeMessage('Episode', 6000, '5-8')).toBeNull();
  });
});

describe('remapTargetLengthRange', () => {
  it('passes through current ids', () => {
    for (const id of TARGET_LENGTH_RANGE_IDS) {
      expect(remapTargetLengthRange(id)).toBe(id);
    }
  });

  it('maps legacy string ids', () => {
    expect(remapTargetLengthRange('2-3')).toBe('1-3');
    expect(remapTargetLengthRange('3-4')).toBe('3-5');
    expect(remapTargetLengthRange('4-5')).toBe('3-5');
  });

  it('maps numeric targetMinutes-style values', () => {
    expect(remapTargetLengthRange(2)).toBe('1-3');
    expect(remapTargetLengthRange(3)).toBe('1-3');
    expect(remapTargetLengthRange(4)).toBe('3-5');
    expect(remapTargetLengthRange(5)).toBe('3-5');
    expect(remapTargetLengthRange(7)).toBe('5-8');
    expect(remapTargetLengthRange(10)).toBe('8-12');
  });

  it('falls back to default for unknown values', () => {
    expect(remapTargetLengthRange('nope')).toBe(DEFAULT_TARGET_LENGTH_RANGE);
    expect(remapTargetLengthRange(null)).toBe(DEFAULT_TARGET_LENGTH_RANGE);
    expect(remapTargetLengthRange(undefined)).toBe(
      DEFAULT_TARGET_LENGTH_RANGE
    );
  });
});
