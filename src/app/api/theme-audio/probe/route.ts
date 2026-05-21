import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
  probeThemeAudioAvailability,
  type ThemeAudioProbeResult,
} from '@/lib/themeAudioUrls';
import { collectThemeSlugAliases } from '@/lib/storyThemeAliases';
import {
  getCachedPublishedStoryBySlug,
  THEME_PROBE_CACHE_REVALIDATE_SEC,
} from '@/lib/storyPageCache';

export const runtime = 'nodejs';

function getCachedThemeProbe(
  slug: string,
  aliasesKey: string,
  slugAliases: string[]
): Promise<ThemeAudioProbeResult> {
  return unstable_cache(
    async () => probeThemeAudioAvailability(slug, slugAliases),
    ['theme-probe-v1', slug, aliasesKey],
    {
      revalidate: THEME_PROBE_CACHE_REVALIDATE_SEC,
      tags: ['theme-probe', `theme-probe:${slug}`],
    }
  )();
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug')?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const story = await getCachedPublishedStoryBySlug(slug);
  const slugAliases = story ? collectThemeSlugAliases(slug, story) : [];
  const aliasesKey = slugAliases.length ? slugAliases.join(',') : '-';

  try {
    const probe = await getCachedThemeProbe(slug, aliasesKey, slugAliases);
    return NextResponse.json(probe);
  } catch (e) {
    console.error('[theme-audio/probe]', e);
    return NextResponse.json(
      { error: 'Could not probe theme audio' },
      { status: 500 }
    );
  }
}
