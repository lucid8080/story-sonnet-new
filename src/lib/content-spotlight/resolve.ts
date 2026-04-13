import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type {
  SpotlightRailDTO,
  StorySpotlightBadgeDTO,
  StorySpotlightInfoBarDTO,
} from '@/lib/content-spotlight/types';
import { isMissingContentSpotlightSchemaError } from '@/lib/content-spotlight/prismaSafeQuery';
import { isSpotlightPubliclyVisible } from '@/lib/content-spotlight/visibility';

const spotlightInclude = {
  badgeAsset: true,
  stories: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      story: {
        select: {
          id: true,
          slug: true,
          title: true,
          coverUrl: true,
          cardTitleOverride: true,
          seriesTitle: true,
          isPublished: true,
        },
      },
    },
  },
} satisfies Prisma.ContentSpotlightInclude;

export type SpotlightWithRelations = Prisma.ContentSpotlightGetPayload<{
  include: typeof spotlightInclude;
}>;

async function loadSpotlightCandidates(): Promise<SpotlightWithRelations[]> {
  try {
    return await prisma.contentSpotlight.findMany({
      where: {
        publishedAt: { not: null },
        status: { in: ['active', 'scheduled'] },
      },
      include: spotlightInclude,
    });
  } catch (e) {
    if (isMissingContentSpotlightSchemaError(e)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[content-spotlight] DB schema missing or behind app (e.g. content calendar tables or `badge_corner`); run `npx prisma migrate deploy`. Public site renders without spotlights.'
        );
      }
      return [];
    }
    throw e;
  }
}

function visibleAt(
  rows: SpotlightWithRelations[],
  at: Date
): SpotlightWithRelations[] {
  return rows.filter((s) => isSpotlightPubliclyVisible(s, at));
}

function sortSpotlights<T extends { priority: number; updatedAt: Date }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export async function resolveStorySpotlightBadge(
  storyId: bigint,
  at: Date = new Date()
): Promise<StorySpotlightBadgeDTO | null> {
  const candidates = sortSpotlights(visibleAt(await loadSpotlightCandidates(), at));
  for (const s of candidates) {
    if (!s.showBadge || !s.badgeAsset?.publicUrl) continue;
    const link = s.stories.find((row) => row.storyId === storyId);
    if (!link) continue;
    const st = link.story;
    if (!st.isPublished) continue;
    return {
      spotlightId: s.id,
      slug: s.slug,
      title: s.title,
      badgeUrl: s.badgeAsset.publicUrl,
      badgeAlt: s.badgeAsset.altText || s.title,
      badgeCorner: s.badgeCorner,
      showPopup: s.showPopup,
      popupTitle: s.popupTitle,
      popupBody: s.popupBody,
      shortBlurb: s.shortBlurb,
      ctaLabel: s.ctaLabel,
      ctaUrl: s.ctaUrl,
    };
  }
  return null;
}

export async function resolveStorySpotlightInfoBar(
  storyId: bigint,
  at: Date = new Date()
): Promise<StorySpotlightInfoBarDTO | null> {
  const candidates = sortSpotlights(visibleAt(await loadSpotlightCandidates(), at));
  for (const s of candidates) {
    if (!s.showInfoBar) continue;
    const link = s.stories.find((row) => row.storyId === storyId);
    if (!link) continue;
    const st = link.story;
    if (!st.isPublished) continue;
    return {
      spotlightId: s.id,
      title: s.title,
      infoBarText: s.infoBarText,
      shortBlurb: s.shortBlurb,
      ctaLabel: s.ctaLabel,
      ctaUrl: s.ctaUrl,
    };
  }
  return null;
}

function storyCardTitle(
  story: SpotlightWithRelations['stories'][number]['story'],
  link: SpotlightWithRelations['stories'][number]
): string {
  const o = link.cardTitleOverride?.trim();
  if (o) return o;
  const c = story.cardTitleOverride?.trim();
  if (c) return c;
  return story.title;
}

function toRailDTO(s: SpotlightWithRelations): SpotlightRailDTO {
  return {
    spotlightId: s.id,
    slug: s.slug,
    title: s.title,
    shortBlurb: s.shortBlurb,
    type: s.type,
    priority: s.priority,
    stories: s.stories
      .filter((row) => row.story.isPublished)
      .map((row) => ({
        storyId: row.story.id.toString(),
        slug: row.story.slug,
        title: storyCardTitle(row.story, row),
        coverUrl: row.story.coverUrl,
        sortOrder: row.sortOrder,
        isFeatured: row.isFeatured,
      })),
  };
}

export async function resolveHomepageSpotlightRails(
  at: Date = new Date()
): Promise<SpotlightRailDTO[]> {
  const rows = visibleAt(await loadSpotlightCandidates(), at).filter(
    (s) => s.featureOnHomepage
  );
  return sortSpotlights(rows).map(toRailDTO);
}

export async function resolveLibrarySpotlightRails(
  at: Date = new Date()
): Promise<SpotlightRailDTO[]> {
  const rows = visibleAt(await loadSpotlightCandidates(), at).filter(
    (s) => s.featureOnLibraryPage
  );
  return sortSpotlights(rows).map(toRailDTO);
}

/** Map slug → badge for a set of stories (e.g. homepage pool). */
export async function resolveSpotlightBadgesBySlug(
  slugs: string[],
  at: Date = new Date()
): Promise<Map<string, StorySpotlightBadgeDTO>> {
  const out = new Map<string, StorySpotlightBadgeDTO>();
  if (slugs.length === 0) return out;
  const stories = await prisma.story.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(stories.map((s) => [s.slug, s.id]));
  const candidates = sortSpotlights(
    visibleAt(await loadSpotlightCandidates(), at)
  );
  for (const slug of slugs) {
    const id = bySlug.get(slug);
    if (id == null) continue;
    for (const s of candidates) {
      if (!s.showBadge || !s.badgeAsset?.publicUrl) continue;
      if (!s.stories.some((row) => row.storyId === id)) continue;
      out.set(slug, {
        spotlightId: s.id,
        slug: s.slug,
        title: s.title,
        badgeUrl: s.badgeAsset.publicUrl,
        badgeAlt: s.badgeAsset.altText || s.title,
        badgeCorner: s.badgeCorner,
        showPopup: s.showPopup,
        popupTitle: s.popupTitle,
        popupBody: s.popupBody,
        shortBlurb: s.shortBlurb,
        ctaLabel: s.ctaLabel,
        ctaUrl: s.ctaUrl,
      });
      break;
    }
  }
  return out;
}
