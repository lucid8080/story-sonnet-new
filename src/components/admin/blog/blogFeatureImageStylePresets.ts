import { ART_STYLE_OPTIONS } from '@/lib/story-studio/art-style-options';

export type BlogFeatureImageStylePreset = {
  id: string;
  label: string;
  /** Full prompt text for the image API */
  text: string;
};

/** Short preview for list rows (first line / truncated). */
export function presetPreview(text: string, max = 96): string {
  const one = text.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max - 1)}…`;
}

/** Photography / layout-oriented presets (blog hero). */
const BLOG_HERO_STYLE_PRESETS: BlogFeatureImageStylePreset[] = [
  {
    id: 'editorial-warm',
    label: 'Warm editorial photography',
    text:
      'Natural editorial photography, warm golden-hour or soft window light, shallow depth of field, authentic family-friendly mood, subtle film grain, no text or logos in frame.',
  },
  {
    id: 'watercolor',
    label: 'Soft watercolor illustration',
    text:
      'Soft watercolor illustration, gentle washes and paper texture, pastel and warm tones, whimsical but calm, children’s editorial style, clean composition, no text or lettering in the image.',
  },
  {
    id: 'flat-vector',
    label: 'Clean flat vector',
    text:
      'Modern flat vector illustration, bold friendly shapes, limited harmonious palette, subtle gradients, plenty of breathing room, crisp edges, no text or icons in the image.',
  },
  {
    id: '3d-soft',
    label: 'Gentle 3D render',
    text:
      'Soft stylized 3D render, rounded forms, gentle studio lighting, pastel or warm neutrals, playful but premium, shallow depth, no text or UI elements.',
  },
  {
    id: 'cinematic',
    label: 'Cinematic golden hour',
    text:
      'Cinematic wide photograph, golden hour backlight, soft lens flare, emotional but hopeful mood, natural colors, family-safe content, atmospheric haze, no text in frame.',
  },
  {
    id: 'picture-book',
    label: 'Pastel picture-book art',
    text:
      'Pastel children’s picture-book style, hand-painted feel, cozy indoor or gentle outdoor scene, soft outlines, warm inviting palette, storybook charm, no words or captions in the art.',
  },
  {
    id: 'line-art',
    label: 'Minimal line art + soft fill',
    text:
      'Minimal line illustration with soft flat color fills, plenty of white space, elegant and calm, limited palette, modern editorial look, no typography in the image.',
  },
  {
    id: 'lifestyle-bright',
    label: 'Bright lifestyle photo',
    text:
      'Bright airy lifestyle photography, soft daylight, clean Scandinavian-inspired interior or park setting, natural poses, optimistic mood, high clarity, no text or watermarks.',
  },
];

const STORY_STUDIO_BLOG_SUFFIX =
  ' Wide composition suitable for a blog hero image, family-friendly, no text or lettering in the image.';

/** Story Studio Quick Build art styles, mapped for blog feature images. */
const STORY_STUDIO_BLOG_STYLE_PRESETS: BlogFeatureImageStylePreset[] =
  ART_STYLE_OPTIONS.map((o) => ({
    id: `story-studio-${o.id}`,
    label: `${o.label} (Story Studio)`,
    text: `${o.defaultPrompt.trim()}${STORY_STUDIO_BLOG_SUFFIX}`,
  }));

export const BLOG_FEATURE_IMAGE_STYLE_PRESETS: BlogFeatureImageStylePreset[] = [
  ...BLOG_HERO_STYLE_PRESETS,
  ...STORY_STUDIO_BLOG_STYLE_PRESETS,
];
