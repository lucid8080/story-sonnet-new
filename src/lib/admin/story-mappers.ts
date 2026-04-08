import type { AgeRangeId, DurationBucketId, GenreId, MoodId } from '@/constants/storyFilters';
import { getBrowseSeedForSlug } from '@/data/storyBrowseSeed';
import type { AppStory } from '@/lib/stories';
import type { AdminStoryUpsertInput } from '@/lib/validation/storySchema';
import { getDurationBucket } from '@/utils/durationBucket';
import { parseDurationToSeconds } from '@/utils/parseDuration';
import {
  emptyEpisodeForm,
  type EpisodeFormState,
  type StoryFormState,
  type StoryFormState as SF,
} from './story-form';

function topicsToString(topics: string[]): string {
  return topics.join(', ');
}

function stringToTopics(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function appStoryToForm(story: AppStory): StoryFormState {
  const seed = getBrowseSeedForSlug(story.slug);
  const ageRange = (story.ageRange ?? seed.ageRange) as AgeRangeId;
  const genre = (story.genre ?? seed.genre) as GenreId;
  const mood = (story.mood ?? seed.mood) as MoodId;

  const bucket = story.durationBucket;
  const durationBucket: SF['durationBucket'] =
    bucket && ['under5', '5-10', '10-15', '15plus'].includes(bucket)
      ? (bucket as DurationBucketId)
      : 'auto';

  const publishedAt =
    story.publishedAt != null
      ? story.publishedAt.includes('T')
        ? story.publishedAt.slice(0, 16)
        : story.publishedAt
      : '';

  const episodes: EpisodeFormState[] =
    story.episodes.length > 0
      ? story.episodes.map((ep, idx) => {
          const num = ep.episodeNumber ?? idx + 1;
          const sec =
            ep.durationSeconds != null
              ? ep.durationSeconds
              : parseDurationToSeconds(ep.duration);
          return {
            id: ep.id,
            episodeNumber: num,
            title: ep.title,
            slug: ep.slug ?? '',
            summary: ep.description ?? '',
            durationSeconds: sec != null ? String(sec) : '',
            audioUrl: ep.audioSrc ?? '',
            audioStorageKey: ep.audioStorageKey ?? '',
            isPublished: ep.isPublished,
            isPremium: ep.isPremium,
            isFreePreview: ep.isFreePreview ?? false,
            label: ep.label ?? '',
          };
        })
      : [emptyEpisodeForm(`new-${crypto.randomUUID()}`, 1)];

  return {
    slug: story.slug,
    title: story.title,
    seriesTitle: story.seriesTitle,
    subtitle: story.subtitle ?? '',
    summary: story.summary ?? '',
    fullDescription: story.fullDescription ?? '',
    coverUrl: story.cover ?? '',
    accent: story.accent ?? '',
    ageRange,
    genre,
    mood,
    durationMinutes:
      story.durationMinutes != null ? String(story.durationMinutes) : '',
    durationBucket,
    durationLabel: story.durationLabel ?? '',
    isSeries: story.isSeries,
    seriesTagline: story.seriesTagline ?? '',
    universe: story.universe ?? '',
    readingLevel: story.readingLevel ?? '',
    topics: topicsToString(story.topics),
    characterTags: topicsToString(story.characterTags),
    cardTitleOverride: story.cardTitleOverride ?? '',
    cardDescriptionOverride: story.cardDescriptionOverride ?? '',
    badgeLabelOverride: story.badgeLabelOverride ?? '',
    popularityScore: String(story.popularityScore ?? seed.popularityScore),
    sortPriority: String(story.sortPriority ?? 0),
    publishedAt,
    isFeatured: story.isFeatured,
    isPremium: story.isPremium,
    isPublished: story.isPublished,
    metaTitle: story.metaTitle ?? '',
    metaDescription: story.metaDescription ?? '',
    ageGroup: story.ageGroup ?? '',
    episodes,
  };
}

export function formToAdminUpsertPayload(form: StoryFormState): AdminStoryUpsertInput {
  const durationMinutesParsed =
    form.durationMinutes.trim() === ''
      ? null
      : Number(form.durationMinutes);
  const popularity = Number(form.popularityScore) || 0;
  const sortP = Number(form.sortPriority) || 0;

  let durationBucket = null as AdminStoryUpsertInput['durationBucket'];
  if (form.durationBucket !== 'auto' && form.durationBucket !== '') {
    durationBucket = form.durationBucket as NonNullable<
      AdminStoryUpsertInput['durationBucket']
    >;
  } else if (durationMinutesParsed != null && Number.isFinite(durationMinutesParsed)) {
    durationBucket = getDurationBucket(durationMinutesParsed);
  }

  const publishedAt =
    form.publishedAt.trim() === ''
      ? null
      : new Date(form.publishedAt).toISOString();

  const episodes = form.episodes.map((ep, index) => {
    const n = index + 1;
    const durationSeconds =
      ep.durationSeconds.trim() === ''
        ? null
        : Math.max(0, parseInt(ep.durationSeconds, 10));

    return {
      id: ep.id,
      episodeNumber: n,
      title: ep.title,
      slug: ep.slug.trim() === '' ? null : ep.slug.trim().toLowerCase(),
      summary: ep.summary.trim() === '' ? null : ep.summary,
      durationMinutes: null,
      durationSeconds,
      audioUrl: ep.audioUrl.trim() === '' ? null : ep.audioUrl.trim(),
      audioStorageKey:
        ep.audioStorageKey.trim() === '' ? null : ep.audioStorageKey.trim(),
      isPublished: ep.isPublished,
      isPremium: ep.isPremium,
      isFreePreview: ep.isFreePreview,
      label: ep.label.trim() === '' ? null : ep.label,
    };
  });

  return {
    slug: form.slug.trim().toLowerCase(),
    title: form.title.trim(),
    seriesTitle: form.seriesTitle.trim() || form.title.trim(),
    subtitle: form.subtitle.trim() === '' ? null : form.subtitle,
    summary: form.summary.trim(),
    fullDescription:
      form.fullDescription.trim() === '' ? null : form.fullDescription,
    coverUrl: form.coverUrl.trim() === '' ? null : form.coverUrl,
    accent: form.accent.trim() === '' ? null : form.accent,
    ageRange: form.ageRange,
    genre:
      form.genre === ''
        ? null
        : (form.genre as NonNullable<AdminStoryUpsertInput['genre']>),
    mood:
      form.mood === ''
        ? null
        : (form.mood as NonNullable<AdminStoryUpsertInput['mood']>),
    durationMinutes:
      durationMinutesParsed != null && Number.isFinite(durationMinutesParsed)
        ? durationMinutesParsed
        : null,
    durationBucket,
    durationLabel:
      form.durationLabel.trim() === '' ? null : form.durationLabel.trim(),
    isSeries: form.isSeries,
    seriesTagline:
      form.seriesTagline.trim() === '' ? null : form.seriesTagline.trim(),
    universe: form.universe.trim() === '' ? null : form.universe.trim(),
    readingLevel:
      form.readingLevel.trim() === '' ? null : form.readingLevel.trim(),
    topics: stringToTopics(form.topics),
    characterTags: stringToTopics(form.characterTags),
    cardTitleOverride:
      form.cardTitleOverride.trim() === '' ? null : form.cardTitleOverride,
    cardDescriptionOverride:
      form.cardDescriptionOverride.trim() === ''
        ? null
        : form.cardDescriptionOverride,
    badgeLabelOverride:
      form.badgeLabelOverride.trim() === '' ? null : form.badgeLabelOverride,
    popularityScore: popularity,
    sortPriority: sortP,
    publishedAt,
    isFeatured: form.isFeatured,
    isPremium: form.isPremium,
    isPublished: form.isPublished,
    metaTitle: form.metaTitle.trim() === '' ? null : form.metaTitle,
    metaDescription:
      form.metaDescription.trim() === '' ? null : form.metaDescription,
    ageGroup: form.ageGroup.trim() === '' ? null : form.ageGroup,
    episodes,
  };
}
