/**
 * Build scrolling transcript lines from Story Studio script text.
 * Strips bracket expression tags (e.g. [narrator warmly]) and splits into readable lines.
 */

export type TranscriptLineJson = { id: string | number; text: string };

/** Remove Story Studio / TTS expression tags like [narrator warmly]. */
export function stripExpressionTags(script: string): string {
  return script.replace(/\[[^\]]+\]/g, '');
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Split script into transcript lines (paragraphs / non-empty lines).
 */
export function scriptToTranscriptLines(script: string): TranscriptLineJson[] {
  const stripped = stripExpressionTags(script);
  const withoutTags = normalizeWhitespace(stripped);
  if (!withoutTags) return [];

  const rawBlocks = stripped.split(/\r?\n/);
  const lines: string[] = [];

  for (const block of rawBlocks) {
    const t = normalizeWhitespace(block);
    if (t.length > 0) lines.push(t);
  }

  if (lines.length === 0 && withoutTags) {
    lines.push(withoutTags);
  }

  return lines.map((text, i) => ({
    id: i + 1,
    text,
  }));
}
