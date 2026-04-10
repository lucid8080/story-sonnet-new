import type {
  BriefPayloadParsed,
  ScriptPackagePayloadParsed,
} from '@/lib/story-studio/schemas/llm-output';
import {
  expressionTagDensityGuidance,
  storyCoreSystemPreamble,
} from '@/lib/story-studio/story-core';
import { STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE } from '@/lib/story-studio/constants';
import type { GenerationRequest } from '@/lib/story-studio/types';
import { catalogAgeLabel } from '@/lib/story-studio/normalize-request';

const TARGET_LENGTH_LABEL: Record<GenerationRequest['targetLengthRange'], string> =
  {
    '2-3': '2–3',
    '3-4': '3–4',
    '4-5': '4–5',
  };

function requestSummary(req: GenerationRequest): string {
  const idea =
    req.mode === 'prompt' && req.customPrompt.trim()
      ? req.customPrompt.trim()
      : req.simpleIdea.trim() || '(no extra idea — invent from selections)';

  return `MODE: ${req.mode}
TARGET LENGTH: about ${TARGET_LENGTH_LABEL[req.targetLengthRange]} minutes of spoken audio (approximate).
FORMAT: ${req.format} (episode count: ${req.episodeCount})
AGE BAND: ${req.studioAgeBand} (${catalogAgeLabel(req.studioAgeBand)}; catalog bucket ${req.catalogAgeRange})
STORY TYPE: ${req.storyType}
TONE: ${req.tone}
THEME / LESSON (soft): ${req.lesson}
MAIN CHARACTER TYPE: ${req.characterType}
SETTING: ${req.setting}
NARRATION STYLE: ${req.narrationStyle}
VOICE ENERGY: ${req.voiceEnergy}
TAG DENSITY: ${req.tagDensity}
${expressionTagDensityGuidance(req.tagDensity)}

USER IDEA / PROMPT:
${idea}

${req.flavor ? `PRESET FLAVOR:\n${req.flavor}\n` : ''}${req.coverArtDirection ? `VISUAL DIRECTION HINT:\n${req.coverArtDirection}\n` : ''}${req.musicDirection ? `MUSIC DIRECTION HINT:\n${req.musicDirection}\n` : ''}`;
}

const BRIEF_JSON_INSTRUCTIONS = `Return a single JSON object with these keys:
- title (string)
- seriesTitle (string; for standalone can match title or be a light series name)
- summary (2–4 sentences for parents)
- logline (one line)
- characters (array of short character descriptors)
- settingSketch (one paragraph)
- suggestedGenre (one of: adventure, bedtime, fantasy, animals, friendship, educational, funny, mystery — or null)
- suggestedMood (one of: bedtime, calm-quiet, learning-time, car-ride, quick-listen, uplifting — or null)
- ageRange (one of: 0-2, 3-5, 6-8, 9-12 — must match the age band above)
- episodeOutline (array of { title, beat } — length must match episode count requested)
- coverArtPrompt (one paragraph: kid-safe illustration only — scene, characters, palette, mood; do not describe on-image title or typography here; do not reserve space for series names, subtitles, bottom banners, or “label margins” — no extra text areas)
- musicPrompt (single paragraph: style, tempo, instruments; prefer instrumental)
- estimatedRuntimeMinutes (number from 1 to 5, within the requested minute range)
- safetyNotes (short: how you stayed age-safe)`;

function scriptJsonInstructions(density: string): string {
  return `Return a single JSON object with these keys:
- title (string)
- seriesTitle (string)
- summary (short catalog summary)
- fullScript (optional string: entire story in one block if standalone single episode)
- episodes (array of length matching episode count; each has title, summary, scriptText, optional hookEnding for series)
- coverArtPrompt (refined: same rules as brief — illustration/scene only; no series labels, subtitles, or reserved margins for extra text)
- musicPrompt (refined)
- narrationNotes (bullets for voice director)
- estimatedRuntimeMinutes (number from 1 to 5, within the requested minute range)
- ageRange (0-2 | 3-5 | 6-8 | 9-12)
- tags (string array: topics for catalog)
- expressionTagDensity (must be exactly: "${density}")`;
}

export function buildBriefUserPrompt(req: GenerationRequest): string {
  return `${requestSummary(req)}

TASK: Write a STORY BRIEF only (no full script yet).

${BRIEF_JSON_INSTRUCTIONS}`;
}

export function buildScriptUserPrompt(
  req: GenerationRequest,
  brief: BriefPayloadParsed
): string {
  const briefJson = JSON.stringify(brief, null, 2);
  const density = req.tagDensity;
  const scriptInstructions = scriptJsonInstructions(density);

  return `${requestSummary(req)}

APPROVED BRIEF (follow closely; you may refine titles for read-aloud rhythm):
${briefJson}

TASK: Write the FULL SCRIPT for spoken audio.

${scriptInstructions}

SCRIPT RULES:
- Primary content lives in episodes[].scriptText (and fullScript optional duplicate for single episode).
- Each episodes[].summary must be a unique, short episode blurb (1-2 sentences).
- Do not copy any sentence/paragraph from episodes[].scriptText into episodes[].summary, including the first paragraph.
- Each episodes[].scriptText must be at most ${STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE} characters (narration only; JSON titles/summaries do not count toward this cap).
- Use expression tags per TAG DENSITY tier.
- Include light sound cues only as bracket tags, not SFX stage directions outside brackets.
- Keep vocabulary aligned with age band ${req.studioAgeBand}.`;
}

export function buildOpenRouterMessagesForBrief(req: GenerationRequest) {
  return [
    { role: 'system' as const, content: storyCoreSystemPreamble() },
    { role: 'user' as const, content: buildBriefUserPrompt(req) },
  ];
}

export function buildOpenRouterMessagesForScript(
  req: GenerationRequest,
  brief: BriefPayloadParsed
) {
  return [
    { role: 'system' as const, content: storyCoreSystemPreamble() },
    { role: 'user' as const, content: buildScriptUserPrompt(req, brief) },
  ];
}

function resolveCoverLogline(
  brief: BriefPayloadParsed | null,
  req: GenerationRequest
): string {
  const fromLogline = brief?.logline?.trim();
  if (fromLogline) return fromLogline;
  const fromSummary = brief?.summary?.trim();
  if (fromSummary) return fromSummary;
  const idea =
    req.mode === 'prompt' && req.customPrompt.trim()
      ? req.customPrompt.trim()
      : req.simpleIdea.trim();
  return idea || '(story)';
}

function pickCoverArtPromptSegment(
  scriptPkg: ScriptPackagePayloadParsed | null,
  brief: BriefPayloadParsed | null,
  draftTitle: string
): string {
  const fromScript = scriptPkg?.coverArtPrompt?.trim();
  if (fromScript) return fromScript;
  const fromBrief = brief?.coverArtPrompt?.trim();
  if (fromBrief) return fromBrief;
  return draftTitle;
}

export type CoverImagePromptParts = {
  logline: string;
  title: string;
  coverArtPrompt: string;
};

/** Cover image: full string sent to the image model. */
export function buildCoverImagePrompt(parts: CoverImagePromptParts): string {
  return `Create a vertical 4:5 unique children's book cover image for ${parts.logline}. Only include the title text exactly as: ${parts.title} and place the title near the top in beautiful, readable children's book cover lettering.

${parts.coverArtPrompt}

Constraints: kid-safe, vibrant but soft, poster-style composition, no logos, no watermark, no extra on-image text beyond the specified title, family-friendly.`;
}

/** Draft-shaped input for resolving script/brief cover text + constraints (orchestration + UI). */
export type DraftCoverImagePromptInput = {
  title: string;
  scriptPackage: unknown;
  brief: unknown;
};

/** Full prompt sent to the image API for this draft’s current brief/script/title. */
export function buildDraftCoverImagePrompt(
  req: GenerationRequest,
  draft: DraftCoverImagePromptInput
): string {
  const scriptPkg = draft.scriptPackage as ScriptPackagePayloadParsed | null;
  const brief = draft.brief as BriefPayloadParsed | null;
  const title = scriptPkg?.title ?? brief?.title ?? draft.title;
  const logline = resolveCoverLogline(brief, req);
  const coverArtPrompt = pickCoverArtPromptSegment(
    scriptPkg,
    brief,
    draft.title
  );
  return buildCoverImagePrompt({ logline, title, coverArtPrompt });
}
