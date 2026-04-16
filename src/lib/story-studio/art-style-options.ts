/**
 * Quick Build art style presets — labels, default illustrator-facing copy, and optional DB overrides.
 */
export const ART_STYLE_OPTIONS = [
  {
    id: 'whimsical-storybook',
    label: 'Whimsical storybook',
    defaultPrompt:
      'Playful hand-drawn storybook look: soft outlines, warm paper texture, slightly exaggerated friendly shapes, cozy picture-book lighting.',
  },
  {
    id: 'soft-watercolor',
    label: 'Soft watercolor',
    defaultPrompt:
      'Transparent watercolor washes, feathered edges, gentle pigment blooms, light paper grain, airy and calm.',
  },
  {
    id: 'gouache-picture-book',
    label: 'Gouache picture book',
    defaultPrompt:
      'Matte gouache blocks of color, visible brush strokes, crisp but soft edges, rich opaque layers like classic picture books.',
  },
  {
    id: 'bold-cartoon',
    label: 'Bold cartoon',
    defaultPrompt:
      'Bold outlines, flat color fills, expressive shapes, high readability, energetic Saturday-morning style (kid-safe).',
  },
  {
    id: 'cozy-bedtime',
    label: 'Cozy bedtime',
    defaultPrompt:
      'Muted warm palette, soft gradients, gentle shadows, snug compositions, dreamy calm suitable for winding down.',
  },
  {
    id: 'bright-playful',
    label: 'Bright playful',
    defaultPrompt:
      'Saturated cheerful colors, bouncy shapes, clear focal points, sunny optimistic mood, lots of friendly visual rhythm.',
  },
  {
    id: 'gentle-pastel',
    label: 'Gentle pastel',
    defaultPrompt:
      'Powdery pastel tones, soft edges, low contrast, airy backgrounds, tender and soothing illustration.',
  },
  {
    id: 'magical-fantasy',
    label: 'Magical fantasy',
    defaultPrompt:
      'Soft magical glows, enchanted atmosphere, jewel-like accents, wonder and adventure without being scary.',
  },
  {
    id: 'nature-illustration',
    label: 'Nature illustration',
    defaultPrompt:
      'Observational nature-guide warmth: believable plants and animals, organic textures, grounded outdoor palette.',
  },
  {
    id: 'minimal-modern-kids',
    label: 'Minimal modern kids',
    defaultPrompt:
      'Clean geometric shapes, limited palette, plenty of negative space, modern editorial kids’ aesthetic, crisp and legible.',
  },
  {
    id: 'pencil-watercolor',
    label: 'Pencil + watercolor',
    defaultPrompt:
      'Loose graphite pencil linework with light watercolor washes on top, sketchbook charm, hand-made feel.',
  },
  {
    id: 'dreamy-painted',
    label: 'Dreamy painted',
    defaultPrompt:
      'Painterly blended strokes, soft focus depth, luminous highlights, storybook dream sequence mood.',
  },
  {
    id: 'educational-picture-book',
    label: 'Educational picture-book',
    defaultPrompt:
      'Clear readable forms, friendly diagrams where needed, bright but orderly, classroom-poster clarity without clutter.',
  },
  {
    id: '3d-toy-like',
    label: '3D toy-like',
    defaultPrompt:
      'Soft rounded 3D toy aesthetic: plasticine or vinyl-toy surfaces, gentle studio lighting, chunky appealing forms.',
  },
] as const;

export type ArtStyleId = (typeof ART_STYLE_OPTIONS)[number]['id'];

/** Admin-edited fragments keyed by `ArtStyleId`; omit a key to use built-in `defaultPrompt`. */
export type ArtStylePromptOverrides = Partial<Record<ArtStyleId, string>>;

export function artStyleLabel(id: ArtStyleId): string {
  const found = ART_STYLE_OPTIONS.find((o) => o.id === id);
  return found?.label ?? id;
}

export function defaultArtStylePrompt(id: ArtStyleId): string {
  const found = ART_STYLE_OPTIONS.find((o) => o.id === id);
  return found?.defaultPrompt ?? '';
}

/** Effective style description: DB override, else built-in default prompt. */
export function resolveArtStyleDescription(
  id: ArtStyleId,
  overrides?: ArtStylePromptOverrides
): string {
  const fromDb = overrides?.[id]?.trim();
  if (fromDb) return fromDb;
  return defaultArtStylePrompt(id).trim();
}

/**
 * Block injected into LLM `requestSummary` and cover image prompts.
 * `overrides` comes from `StoryStudioSettings` (admin); omit for code defaults only.
 */
export function formatArtStylePromptBlock(
  req: { artStyle: ArtStyleId; customArtStyle: string },
  overrides?: ArtStylePromptOverrides
): string {
  const label = artStyleLabel(req.artStyle);
  const desc = resolveArtStyleDescription(req.artStyle, overrides);
  const custom = req.customArtStyle.trim();
  let s = `ART STYLE (illustration): ${label}.`;
  if (desc) s += ` ${desc}`;
  if (custom) s += ` CUSTOM ART STYLE NOTES: ${custom}`;
  return s;
}
