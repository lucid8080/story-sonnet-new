/**
 * Rewrite `stories.full_description` from linked Story Studio Brief fields
 * (summary, logline, settingSketch, characters, episodeOutline) — never from
 * episode script / dialog text.
 *
 * Usage (repo root, DATABASE_URL required):
 *   npm run backfill:full-description-from-brief -- --dry-run
 *   npm run backfill:full-description-from-brief
 *   npm run backfill:full-description-from-brief -- --slug=the-great-giggleville-toy-factory
 */
import { PrismaClient } from '@prisma/client';
import { fullDescriptionFromBrief } from '../src/lib/story-studio/mapping/draft-to-admin-upsert';
import { parseJsonToBrief } from '../src/lib/story-studio/schemas/llm-output';

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  let dryRun = false;
  let slug: string | null = null;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length).trim().toLowerCase() || null;
    }
  }
  return { dryRun, slug };
}

async function main() {
  const { dryRun, slug } = parseArgs(process.argv.slice(2));

  const drafts = await prisma.storyStudioDraft.findMany({
    where: {
      linkedStoryId: { not: null },
      ...(slug
        ? { linkedStory: { slug } }
        : {}),
    },
    select: {
      id: true,
      seriesTitle: true,
      brief: true,
      linkedStoryId: true,
      linkedStory: {
        select: {
          id: true,
          slug: true,
          seriesTitle: true,
          fullDescription: true,
        },
      },
    },
  });

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const draft of drafts) {
    const story = draft.linkedStory;
    if (!story) {
      skipped += 1;
      console.log(`[backfill] skip draft ${draft.id}: no linked story row`);
      continue;
    }

    const raw = draft.brief;
    if (raw == null) {
      skipped += 1;
      console.log(
        `[backfill] skip ${story.slug} (draft ${draft.id}): no brief`
      );
      continue;
    }

    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    let parsed;
    try {
      parsed = parseJsonToBrief(text);
    } catch (err) {
      skipped += 1;
      console.warn(
        `[backfill] skip ${story.slug} (draft ${draft.id}): brief JSON parse threw`,
        err
      );
      continue;
    }
    if (!parsed.success) {
      skipped += 1;
      console.warn(
        `[backfill] skip ${story.slug} (draft ${draft.id}): brief schema failed`,
        parsed.error.flatten()
      );
      continue;
    }

    const next = fullDescriptionFromBrief(parsed.data);
    if (!next) {
      skipped += 1;
      console.log(
        `[backfill] skip ${story.slug} (draft ${draft.id}): composed description empty`
      );
      continue;
    }

    const prev = story.fullDescription?.trim() ?? '';
    if (prev === next) {
      unchanged += 1;
      console.log(`[backfill] unchanged ${story.slug}`);
      continue;
    }

    const preview = next.slice(0, 120).replace(/\s+/g, ' ');
    if (dryRun) {
      updated += 1;
      console.log(
        `[backfill] DRY-RUN would update ${story.slug} (${prev.length} → ${next.length} chars): ${preview}…`
      );
      continue;
    }

    await prisma.story.update({
      where: { id: story.id },
      data: { fullDescription: next },
    });
    updated += 1;
    console.log(
      `[backfill] updated ${story.slug} (${prev.length} → ${next.length} chars)`
    );
  }

  console.log(
    `[backfill] done${dryRun ? ' (dry-run)' : ''}. updated=${updated} unchanged=${unchanged} skipped=${skipped} drafts=${drafts.length}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
