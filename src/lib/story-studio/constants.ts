/**
 * Story Studio script length ceilings.
 * Prefer `target-length.ts` for per-tier LLM caps and UI options.
 */
export {
  STORY_STUDIO_LLM_MAX_SCRIPT_CHARS_PER_EPISODE,
  STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE,
  STORY_STUDIO_MAX_ESTIMATED_RUNTIME_MINUTES,
  llmMaxScriptCharsForRange,
} from '@/lib/story-studio/target-length';
