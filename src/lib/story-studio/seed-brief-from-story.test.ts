import { describe, expect, it } from 'vitest';
import {
  briefPayloadForLlmPrompt,
  parseJsonToBrief,
} from '@/lib/story-studio/schemas/llm-output';
import { seedBriefFromStory } from '@/lib/story-studio/seed-brief-from-story';

describe('seedBriefFromStory', () => {
  it('maps library story fields into a valid brief', () => {
    const brief = seedBriefFromStory({
      seriesTitle: 'Lantern Library',
      summary: 'A cozy tale.',
      seriesTagline: 'Books and fireflies',
      ageRange: '6-8',
      genre: 'fantasy',
      mood: 'bedtime',
      durationMinutes: 5,
    });
    expect(brief.seriesTitle).toBe('Lantern Library');
    expect(brief.logline).toBe('Books and fireflies');
    expect(brief.suggestedGenre).toBe('fantasy');
    expect(brief.estimatedRuntimeMinutes).toBe(5);
    expect(brief.characterGuides).toEqual([]);
    expect(brief.sceneGuides).toEqual([]);
    const parsed = parseJsonToBrief(JSON.stringify(brief));
    expect(parsed.success).toBe(true);
  });
});

describe('brief guides schema', () => {
  it('defaults missing guides on older briefs', () => {
    const parsed = parseJsonToBrief(
      JSON.stringify({
        seriesTitle: 'Old Brief',
        summary: 'Summary text here.',
        logline: '',
        characters: ['Hero'],
        settingSketch: '',
        suggestedGenre: null,
        suggestedMood: null,
        ageRange: '3-5',
        episodeOutline: [],
        coverArtPrompt: '',
        musicPrompt: '',
        estimatedRuntimeMinutes: 3,
        safetyNotes: '',
      })
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.characterGuides).toEqual([]);
    expect(parsed.data.sceneGuides).toEqual([]);
  });

  it('strips image URLs for LLM prompts', () => {
    const parsed = parseJsonToBrief(
      JSON.stringify({
        seriesTitle: 'With Guides',
        summary: 'Summary text here.',
        logline: '',
        characters: ['Hero'],
        settingSketch: '',
        ageRange: '6-8',
        episodeOutline: [],
        coverArtPrompt: '',
        musicPrompt: '',
        estimatedRuntimeMinutes: 3,
        safetyNotes: '',
        characterGuides: [
          {
            name: 'Nori',
            notes: 'green cloak',
            imageUrl: 'https://cdn.example/nori.webp',
          },
        ],
        sceneGuides: [
          { name: 'Meadow', notes: 'dusk', imageUrl: 'https://cdn.example/s.webp' },
        ],
      })
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const forLlm = briefPayloadForLlmPrompt(parsed.data);
    expect(forLlm.characterGuides[0].imageUrl).toBeNull();
    expect(forLlm.characterGuides[0].notes).toBe('green cloak');
    expect(forLlm.sceneGuides[0].imageUrl).toBeNull();
  });
});
