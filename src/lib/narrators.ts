import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import type { Narrator, Prisma } from '@prisma/client';

export type StoryNarratorRef = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
};

export type NarratorStoryCard = {
  slug: string;
  seriesTitle: string;
  cover: string | null;
};

export type NarratorDirectoryEntry = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  sortOrder: number;
  stories: NarratorStoryCard[];
};

function mapNarratorRef(row: Narrator): StoryNarratorRef {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    avatarUrl: resolvePublicAssetUrl(row.avatarUrl),
  };
}

export function formatReadByLine(narrators: Pick<StoryNarratorRef, 'name'>[]): string | null {
  if (!narrators.length) return null;
  const names = narrators.map((n) => n.name);
  if (names.length === 1) return `Narrator: ${names[0]}`;
  if (names.length === 2) return `Narrator: ${names[0]} and ${names[1]}`;
  return `Narrator: ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export async function fetchAllNarratorsAdmin(): Promise<
  (StoryNarratorRef & { bio: string | null; sortOrder: number })[]
> {
  if (!process.env.DATABASE_URL) return [];

  const rows = await prisma.narrator.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map((row) => ({
    ...mapNarratorRef(row),
    bio: row.bio,
    sortOrder: row.sortOrder,
  }));
}

export async function loadNarratorsByStoryIds(
  storyIds: bigint[]
): Promise<Map<string, StoryNarratorRef[]>> {
  const out = new Map<string, StoryNarratorRef[]>();
  if (!storyIds.length || !process.env.DATABASE_URL) return out;

  const links = await prisma.storyNarrator.findMany({
    where: { storyId: { in: storyIds } },
    include: { narrator: true },
    orderBy: { narrator: { sortOrder: 'asc' } },
  });

  for (const link of links) {
    const key = link.storyId.toString();
    const list = out.get(key) ?? [];
    list.push(mapNarratorRef(link.narrator));
    out.set(key, list);
  }
  return out;
}

export async function fetchNarratorAssignedStoryIds(
  narratorId: string
): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  const links = await prisma.storyNarrator.findMany({
    where: { narratorId },
    select: { storyId: true },
  });
  return links.map((l) => l.storyId.toString());
}

export async function syncNarratorStories(
  narratorId: string,
  storyIds: string[]
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database is not configured.');
  }
  const unique = [...new Set(storyIds.filter(Boolean))];
  const validStoryIds = unique
    .filter((id) => /^\d+$/.test(id))
    .map((id) => BigInt(id));

  await prisma.$transaction(async (tx) => {
    await tx.storyNarrator.deleteMany({ where: { narratorId } });
    if (!validStoryIds.length) return;

    const stories = await tx.story.findMany({
      where: { id: { in: validStoryIds } },
      select: { id: true },
    });
    if (!stories.length) return;

    await tx.storyNarrator.createMany({
      data: stories.map((s) => ({ storyId: s.id, narratorId })),
      skipDuplicates: true,
    });
  });
}

export async function syncStoryNarrators(
  tx: Prisma.TransactionClient,
  storyId: bigint,
  narratorIds: string[]
): Promise<void> {
  await tx.storyNarrator.deleteMany({ where: { storyId } });
  const unique = [...new Set(narratorIds.filter(Boolean))];
  if (!unique.length) return;

  const valid = await tx.narrator.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  if (!valid.length) return;

  await tx.storyNarrator.createMany({
    data: valid.map((n) => ({ storyId, narratorId: n.id })),
    skipDuplicates: true,
  });
}

export async function fetchNarratorsDirectory(): Promise<NarratorDirectoryEntry[]> {
  if (!process.env.DATABASE_URL) return [];

  const narrators = await prisma.narrator.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      stories: {
        include: {
          story: {
            select: {
              slug: true,
              seriesTitle: true,
              coverUrl: true,
              isPublished: true,
              isUserGenerated: true,
            },
          },
        },
      },
    },
  });

  return narrators.map((n) => ({
    id: n.id,
    slug: n.slug,
    name: n.name,
    bio: n.bio,
    avatarUrl: resolvePublicAssetUrl(n.avatarUrl),
    sortOrder: n.sortOrder,
    stories: n.stories
      .map((sn) => sn.story)
      .filter((s) => s.isPublished && !s.isUserGenerated)
      .sort((a, b) => a.seriesTitle.localeCompare(b.seriesTitle))
      .map((s) => ({
        slug: s.slug,
        seriesTitle: s.seriesTitle,
        cover: resolvePublicAssetUrl(s.coverUrl),
      })),
  }));
}
