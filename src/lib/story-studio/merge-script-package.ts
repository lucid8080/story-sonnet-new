import { z } from 'zod';
import type { GenerationRequest } from '@/lib/story-studio/types';
import {
  scriptPackagePayloadSchema,
  scriptPackageStorageSchema,
  type ScriptPackagePayloadParsed,
} from '@/lib/story-studio/schemas/llm-output';

function formatScriptPackageValidationError(error: z.ZodError): string {
  const parts = error.issues.map((issue) => {
    const [root, index, field] = issue.path;
    if (root === 'episodes' && typeof index === 'number') {
      const fieldLabel =
        field === 'scriptText'
          ? 'script text'
          : field === 'summary'
            ? 'summary'
            : field === 'title'
              ? 'title'
              : field != null
                ? String(field)
                : 'field';
      return `Episode ${index + 1} ${fieldLabel}: ${issue.message}`;
    }
    const path =
      issue.path.length > 0 ? issue.path.map(String).join('.') : 'form';
    return `${path}: ${issue.message}`;
  });
  return (
    parts.slice(0, 8).join('; ') || 'Script package validation failed.'
  );
}

export type EpisodeRowInput = {
  title: string;
  scriptText: string;
  summary: string | null;
};

const PLACEHOLDER_EPISODE_SCRIPT =
  'Write the narrator lines for this episode here.';
const PLACEHOLDER_SERIES_SUMMARY =
  'Series description pending — edit before pushing to the library.';

/**
 * Valid minimal script package + one episode for a draft that has no generated
 * script yet (enables “Add first episode” from Story Studio).
 */
export function minimalScriptPackageFromDraft(opts: {
  draftTitle: string;
  catalogAgeRange: GenerationRequest['catalogAgeRange'];
  tagDensity: GenerationRequest['tagDensity'];
}): ScriptPackagePayloadParsed {
  const seriesTitle = opts.draftTitle.trim() || 'Untitled draft';
  const seed = {
    seriesTitle,
    summary: PLACEHOLDER_SERIES_SUMMARY,
    episodes: [
      {
        title: 'Episode 1',
        summary:
          'A distinct one-line teaser for listeners — edit so it does not match the script text.',
        scriptText: PLACEHOLDER_EPISODE_SCRIPT,
      },
    ],
    coverArtPrompt: '',
    musicPrompt: '',
    narrationNotes: '',
    estimatedRuntimeMinutes: 3,
    ageRange: opts.catalogAgeRange,
    tags: [] as string[],
    expressionTagDensity: opts.tagDensity,
  };
  const parsed = scriptPackagePayloadSchema.safeParse(seed);
  if (!parsed.success) {
    throw new Error(
      `minimalScriptPackageFromDraft: ${parsed.error.message}`
    );
  }
  return parsed.data;
}

/** First saved episode when the draft had no `scriptPackage` yet (e.g. modal + LLM preview). */
export function firstEpisodePackageFromGenerated(
  opts: {
    draftTitle: string;
    catalogAgeRange: GenerationRequest['catalogAgeRange'];
    tagDensity: GenerationRequest['tagDensity'];
    /** Prefer series summary from the story brief when present. */
    seriesSummaryHint?: string | null;
  },
  episode: {
    title: string;
    summary: string;
    scriptText: string;
    hookEnding?: string;
  }
): ScriptPackagePayloadParsed {
  const seriesTitle = opts.draftTitle.trim() || 'Untitled draft';
  const seriesSummary =
    opts.seriesSummaryHint?.trim() || PLACEHOLDER_SERIES_SUMMARY;
  const seed = {
    seriesTitle,
    summary: seriesSummary,
    episodes: [
      {
        title: episode.title,
        summary: episode.summary,
        scriptText: episode.scriptText,
        hookEnding: episode.hookEnding,
      },
    ],
    fullScript: episode.scriptText,
    coverArtPrompt: '',
    musicPrompt: '',
    narrationNotes: '',
    estimatedRuntimeMinutes: 3,
    ageRange: opts.catalogAgeRange,
    tags: [] as string[],
    expressionTagDensity: opts.tagDensity,
  };
  const parsed = scriptPackagePayloadSchema.safeParse(seed);
  if (!parsed.success) {
    throw new Error(
      `firstEpisodePackageFromGenerated: ${parsed.error.message}`
    );
  }
  return parsed.data;
}

/**
 * Merges edited episode rows into the stored script package and keeps
 * `fullScript` aligned with single-episode drafts (same as `normalizeScriptPackage`).
 */
export function mergeScriptPackageWithEpisodes(
  scriptPackage: unknown,
  episodeRows: EpisodeRowInput[]
):
  | { ok: true; data: ScriptPackagePayloadParsed }
  | { ok: false; message: string } {
  if (!scriptPackage || typeof scriptPackage !== 'object') {
    return {
      ok: false,
      message: 'No script package — generate a script first.',
    };
  }
  const pkg = scriptPackage as ScriptPackagePayloadParsed;
  const mergedEpisodes: Array<{
    title: string;
    summary: string;
    scriptText: string;
    hookEnding?: string;
  }> = [];

  for (let i = 0; i < episodeRows.length; i++) {
    const ep = episodeRows[i];
    const prev = pkg.episodes[i];
    const rawSummary = (ep.summary ?? '').trim();
    const summary =
      rawSummary ||
      (prev?.summary?.trim() ? prev.summary : 'Episode summary pending.');
    const scriptText =
      ep.scriptText.trim() || (prev?.scriptText?.trim() ?? '');
    if (!scriptText) {
      const label = ep.title.trim() || `Episode ${i + 1}`;
      return {
        ok: false,
        message: `Episode ${i + 1} (“${label}”): add script text before saving. Expand the episode in the Script tab if it is collapsed.`,
      };
    }
    mergedEpisodes.push({
      title: ep.title.trim() || `Episode ${i + 1}`,
      summary,
      scriptText,
      hookEnding: prev?.hookEnding,
    });
  }

  const next: ScriptPackagePayloadParsed = {
    ...pkg,
    episodes: mergedEpisodes,
    fullScript:
      mergedEpisodes.length === 1
        ? mergedEpisodes[0].scriptText
        : undefined,
  };

  const parsed = scriptPackageStorageSchema.safeParse(next);
  if (!parsed.success) {
    return {
      ok: false,
      message: formatScriptPackageValidationError(parsed.error),
    };
  }
  return { ok: true, data: parsed.data };
}
