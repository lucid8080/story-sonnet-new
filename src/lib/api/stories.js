import { supabase } from '../supabaseClient.js';
import { stories as staticStories } from '../../data.js';

function parseDurationToSeconds(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();

  // mm:ss format
  const mmSsMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (mmSsMatch) {
    const minutes = Number(mmSsMatch[1]);
    const seconds = Number(mmSsMatch[2]);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return minutes * 60 + seconds;
    }
  }

  // \"Xm\" or \"X min\" / \"X mins\"
  const minMatch = trimmed.match(/^(\d+)\s*(m|min|mins|minute|minutes)$/);
  if (minMatch) {
    const minutes = Number(minMatch[1]);
    if (Number.isFinite(minutes)) {
      return minutes * 60;
    }
  }

  // plain integer treated as minutes
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    return asNumber * 60;
  }

  return null;
}

function computeAverageDuration(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }

  const seconds = episodes
    .map((ep) => parseDurationToSeconds(ep.duration))
    .filter((v) => v != null);

  if (seconds.length === 0) {
    return null;
  }

  const avgSeconds = seconds.reduce((sum, v) => sum + v, 0) / seconds.length;
  const avgMinutes = Math.round(avgSeconds / 60);

  if (!Number.isFinite(avgMinutes) || avgMinutes <= 0) {
    return null;
  }

  return avgMinutes === 1 ? '~1 min' : `~${avgMinutes} min`;
}

function mapDbStoryToApp(story, episodes) {
  const averageDurationLabel = computeAverageDuration(episodes);

  return {
    id: story.id,
    slug: story.slug,
    seriesTitle: story.series_title,
    title: story.title,
    ageGroup: story.age_group,
    durationLabel: story.duration_label,
    averageDurationLabel,
    summary: story.summary,
    cover: story.cover_url,
    accent: story.accent,
    isPremium: story.is_premium,
    isPublished: story.is_published,
    episodes: (episodes || []).map((ep) => ({
      id: ep.id,
      label: ep.label || `Episode ${ep.episode_number}`,
      title: ep.title,
      duration: ep.duration,
      audioSrc: ep.audio_url,
      description: ep.description,
      isPremium: ep.is_premium,
      isPublished: ep.is_published,
    })),
  };
}

export async function fetchStories() {
  if (!supabase) {
    return staticStories;
  }

  const { data: dbStories, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[stories] Falling back to static data because Supabase failed.', error);
    return staticStories;
  }

  if (!dbStories || dbStories.length === 0) {
    return staticStories;
  }

  const storyIds = dbStories.map((s) => s.id);

  const { data: dbEpisodes, error: episodesError } = await supabase
    .from('episodes')
    .select('*')
    .in('story_id', storyIds)
    .order('episode_number', { ascending: true });

  if (episodesError) {
    console.warn('[stories] Episodes query failed, using stories without episodes.', episodesError);
  }

  const episodesByStoryId = (dbEpisodes || []).reduce((acc, ep) => {
    acc[ep.story_id] = acc[ep.story_id] || [];
    acc[ep.story_id].push(ep);
    return acc;
  }, {});

  return dbStories.map((story) => mapDbStoryToApp(story, episodesByStoryId[story.id] || []));
}

export async function fetchStoryBySlug(slug) {
  if (!supabase) {
    return staticStories.find((s) => s.slug === slug) || null;
  }

  const { data: story, error } = await supabase
    .from('stories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !story) {
    return staticStories.find((s) => s.slug === slug) || null;
  }

  const { data: episodes, error: episodesError } = await supabase
    .from('episodes')
    .select('*')
    .eq('story_id', story.id)
    .order('episode_number', { ascending: true });

  if (episodesError) {
    console.warn('[stories] Episodes query failed; using story without episodes.', episodesError);
  }

  return mapDbStoryToApp(story, episodes || []);
}

export async function updateStoryMeta({ id, title, is_published, is_premium, duration_label }) {
  if (!supabase) {
    console.warn('[stories] updateStoryMeta called without Supabase configured; no-op.');
    throw new Error('Updating stories is only supported when Supabase is configured.');
  }

  if (!id) {
    throw new Error('updateStoryMeta requires a story id.');
  }

  const payload = {};
  if (typeof title === 'string') payload.title = title;
  if (typeof is_published === 'boolean') payload.is_published = is_published;
  if (typeof is_premium === 'boolean') payload.is_premium = is_premium;
  if (typeof duration_label === 'string') payload.duration_label = duration_label;

  if (Object.keys(payload).length === 0) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('stories')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[stories] updateStoryMeta failed', error);
  }

  return { data, error };
}


