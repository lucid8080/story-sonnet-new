import type { TranscriptLineJson } from '@/lib/transcripts/from-script';

/** Strip simple HTML tags sometimes present in SRT cues. */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim();
}

function normalizeCueText(text: string): string {
  return stripHtmlTags(text.replace(/\r\n/g, '\n').replace(/\n/g, ' '));
}

/**
 * Parse SubRip (.srt) content into scrolling transcript lines (one per cue).
 */
export function srtToTranscriptLines(srt: string): TranscriptLineJson[] {
  const normalized = srt.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\r?\n\r?\n/);
  const lines: TranscriptLineJson[] = [];

  for (const block of blocks) {
    const rows = block.split(/\r?\n/).map((r) => r.trim());
    if (rows.length < 2) continue;

    let i = 0;
    if (/^\d+$/.test(rows[0])) i = 1;
    if (i >= rows.length) continue;

    const timing = rows[i];
    if (!/-->/.test(timing)) continue;
    i += 1;

    const textParts: string[] = [];
    for (; i < rows.length; i++) {
      const t = normalizeCueText(rows[i]);
      if (t) textParts.push(t);
    }
    const text = textParts.join(' ').trim();
    if (!text) continue;

    lines.push({ id: lines.length + 1, text });
  }

  return lines;
}
