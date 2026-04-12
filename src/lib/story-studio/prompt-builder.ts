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
- characters (array of strings only — each item one plain sentence; do not use objects or sub-keys)
- settingSketch (one paragraph)
- suggestedGenre (one of: adventure, bedtime, fantasy, animals, friendship, educational, funny, mystery — or null)
- suggestedMood (one of: bedtime, calm-quiet, learning-time, car-ride, quick-listen, uplifting — or null)
- ageRange (one of: 0-2, 3-5, 6-8, 9-12 — must match the age band above)
- episodeOutline (array of { title, beat } — length must match episode count requested)
- coverArtPrompt (one paragraph: kid-safe illustration only — scene, characters, palette, mood; do not describe on-image title or typography here; do not reserve space for series names, subtitles, bottom banners, or “label margins” — no extra text areas)
- musicPrompt (single paragraph: style, tempo, instruments; prefer instrumental)
- estimatedRuntimeMinutes (number from 1 to 5, within the requested minute range)
- safetyNotes (short: how you stayed age-safe)`;

const BRIEF_CREATIVITY_RULES = `CREATIVE DIVERSITY (required):
- The same preset selections can yield many different stories. Vary the central conflict, supporting characters, and concrete details (objects, sounds, small world-building beats) — not just wording.
- When MAIN CHARACTER TYPE is animal (or broad), do not default to the same few “cozy forest” species every time. Actively prefer less overused choices that still fit SETTING and age band (avoid leaning on hedgehog/fox-with-scarf clichés unless the user idea names them).
- Models often pick the same “quirky rare mammal” (tapir, pangolin, pine marten, dik-dik) when sliders stay identical — treat that as a failure mode: pick a **different taxonomic lane** than your last instinct (e.g. bird, amphibian, insect, familiar rodent, riparian mammal) unless USER IDEA names a species.
- Invent original character names. Do not reuse common default pet names like Pip, Poppy, or Olive unless USER IDEA / PROMPT already specifies them.
- If USER IDEA is empty or generic, treat that as a prompt to surprise the listener with a distinctive premise while honoring all selections.`;

/** Picks a rotating protagonist lane for forest + animal — hash is stable per variety seed. */
const FOREST_ANIMAL_PROTAGONIST_SPINS = [
  'Make the **hero a bird** (songbird, woodpecker, jay, young owl) — not a mammal.',
  'Make the **hero a small rodent or rabbit** (mouse, vole, squirrel, rabbit) — avoid exotic zoo mammals.',
  'Make the **hero an amphibian** (frog, toad, newt) with forest-appropriate stakes.',
  'Make the **hero a gentle invertebrate** (butterfly, beetle, worm) — age-safe, not scary.',
  'Make the **hero a bat** (dusk forest / cave edge) with a kindness beat.',
  'Make the **hero a deer-family youngster** (fawn, moose calf) — familiar forest mammal, fresh conflict.',
  'Make the **hero a badger, boar piglet, or porcupine** — sturdy forest mammals, not tapir-like exotics.',
  'Make the **hero a raccoon or skunk** — North American forest tone, original problem.',
  'Make the **hero a bear cub** with a non-generic kindness dilemma (not “lost honey”).',
  'Make the **hero an otter or beaver** — stream/pond edge in the forest.',
  'Make the **hero a shy lizard or snake** — curious, non-threatening for the age band.',
  'Make the **hero a young wolf or coyote** — pack/community kindness, non-frightening.',
] as const;

function hashStringToUint(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return h >>> 0;
}

function forestAnimalProtagonistSpin(
  req: GenerationRequest,
  varietySeed: string
): string | null {
  if (req.characterType !== 'animal' || req.setting !== 'forest') return null;
  const s = varietySeed.trim();
  if (!s) return null;
  const idx = hashStringToUint(s) % FOREST_ANIMAL_PROTAGONIST_SPINS.length;
  return FOREST_ANIMAL_PROTAGONIST_SPINS[idx] ?? null;
}

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

${BRIEF_CREATIVITY_RULES}

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

export function buildOpenRouterMessagesForBrief(
  req: GenerationRequest,
  opts?: { varietySeed?: string }
) {
  let user = buildBriefUserPrompt(req);
  const seed = opts?.varietySeed?.trim() ?? '';
  const spin = forestAnimalProtagonistSpin(req, seed);
  if (spin) {
    user += `\n\nSPECIES / CAST ROTATION (mandatory — align with MAIN CHARACTER TYPE + SETTING):\n${spin}`;
  }
  return [
    { role: 'system' as const, content: storyCoreSystemPreamble() },
    { role: 'user' as const, content: user },
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

export type SingleEpisodePromptContext = {
  /** 0-based index of this episode in the series after insert. */
  episodeIndex: number;
  /** Total episodes after adding this one (for “episode N of M”). */
  totalEpisodesAfter: number;
  /** Optional beat from brief.episodeOutline[episodeIndex]. */
  outlineBeat: { title: string; beat: string } | null;
  /** Existing episodes before this slot (titles + summaries + short script tail). */
  priorEpisodes: {
    title: string;
    summary: string;
    scriptTail: string;
  }[];
  /** User directions from the modal. */
  directions: string;
};

function singleEpisodeJsonInstructions(density: string): string {
  return `Return a single JSON object with ONLY these keys (no wrapper, no markdown):
- title (string)
- summary (unique short episode blurb, 1–2 sentences; must NOT copy wording from scriptText)
- scriptText (string: full narration for THIS episode only; at most ${STORY_STUDIO_MAX_SCRIPT_CHARS_PER_EPISODE} characters)
- hookEnding (optional string: soft “next time” line only if the series format calls for it)

Expression tag density for bracket tags must match: "${density}".`;
}

export function buildSingleEpisodeUserPrompt(
  req: GenerationRequest,
  brief: BriefPayloadParsed,
  ctx: SingleEpisodePromptContext
): string {
  const briefJson = JSON.stringify(brief, null, 2);
  const priorBlock =
    ctx.priorEpisodes.length === 0
      ? '(This is the first episode in the series.)'
      : ctx.priorEpisodes
          .map(
            (p, i) =>
              `--- Prior episode ${i + 1}: ${p.title} ---\nSummary: ${p.summary}\nLast part of script (for continuity, do not repeat verbatim):\n${p.scriptTail}`
          )
          .join('\n\n');

  const outlineBlock = ctx.outlineBeat
    ? `Planned beat for this slot (from series outline — follow unless directions conflict):\nTitle: ${ctx.outlineBeat.title}\nBeat: ${ctx.outlineBeat.beat}`
    : '(No separate outline row for this slot — stay consistent with the approved brief.)';

  const directions =
    ctx.directions.trim() ||
    '(No extra directions — follow the brief and continuity.)';

  return `${requestSummary(req)}

APPROVED SERIES BRIEF (stay consistent with characters, setting, and tone):
${briefJson}

THIS EPISODE SLOT: episode ${ctx.episodeIndex + 1} of ${ctx.totalEpisodesAfter} (after adding this installment).

${outlineBlock}

PRIOR CONTEXT (continuity):
${priorBlock}

USER DIRECTIONS FOR THIS EPISODE:
${directions}

TASK: Write ONE new episode only — spoken audio script for a kids story.

${singleEpisodeJsonInstructions(req.tagDensity)}

SCRIPT RULES:
- scriptText is narration for this episode only; do not include other episodes.
- summary must be unique and must not duplicate sentences from scriptText.
- Keep vocabulary aligned with age band ${req.studioAgeBand}.`;
}

export function buildOpenRouterMessagesForSingleEpisode(
  req: GenerationRequest,
  brief: BriefPayloadParsed,
  ctx: SingleEpisodePromptContext
) {
  return [
    { role: 'system' as const, content: storyCoreSystemPreamble() },
    {
      role: 'user' as const,
      content: buildSingleEpisodeUserPrompt(req, brief, ctx),
    },
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
