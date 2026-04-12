/**
 * Backfill `episodes.transcript_lines` from Story Studio `script_package` for drafts
 * that are already linked to a library story (`linked_story_id`).
 *
 * Usage (repo root, DATABASE_URL required):
 *   node --env-file=.env npx tsx scripts/backfill-episode-transcripts-from-studio.ts
 */
import { PrismaClient } from '@prisma/client';
import { parseJsonToScriptPackage } from '../src/lib/story-studio/schemas/llm-output';
import { scriptToTranscriptLines } from '../src/lib/transcripts/from-script';

const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.storyStudioDraft.findMany({
    where: { linkedStoryId: { not: null } },
    include: { episodes: { orderBy: { sortOrder: 'asc' } } },
  });

  let storiesTouched = 0;
  let episodesUpdated = 0;

  for (const draft of drafts) {
    const storyId = draft.linkedStoryId;
    if (storyId == null) continue;

    const raw = draft.scriptPackage;
    if (raw == null) {
      console.log(`[backfill] skip draft ${draft.id}: no scriptPackage`);
      continue;
    }

    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const parsed = parseJsonToScriptPackage(text);
    if (!parsed.success) {
      console.warn(
        `[backfill] skip draft ${draft.id}: script parse failed`,
        parsed.error.flatten()
      );
      continue;
    }

    const script = parsed.data;
    let draftUpdated = false;

    for (let i = 0; i < draft.episodes.length; i++) {
      const scriptText = script.episodes[i]?.scriptText?.trim();
      if (!scriptText) continue;

      const lines = scriptToTranscriptLines(scriptText);
      const result = await prisma.episode.updateMany({
        where: {
          storyId,
          episodeNumber: i + 1,
        },
        data: { transcriptLines: lines },
      });
      if (result.count > 0) {
        episodesUpdated += result.count;
        draftUpdated = true;
      } else {
        console.warn(
          `[backfill] no episode row for storyId=${storyId.toString()} episodeNumber=${i + 1} (draft ${draft.id})`
        );
      }
    }

    if (draftUpdated) storiesTouched += 1;
  }

  console.log(
    `[backfill] done. Drafts with ≥1 episode updated: ${storiesTouched}, episode rows updated: ${episodesUpdated}`
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
