import type { DurationBucketId } from '@/constants/storyFilters';

/**
 * Maps total listening time (minutes) to MVP duration buckets.
 * under5: [0, 5), 5-10: [5, 10), 10-15: [10, 15), 15plus: [15, ∞)
 */
export function getDurationBucket(minutes: number): DurationBucketId {
  if (!Number.isFinite(minutes) || minutes < 0) return 'under5';
  if (minutes < 5) return 'under5';
  if (minutes < 10) return '5-10';
  if (minutes < 15) return '10-15';
  return '15plus';
}
