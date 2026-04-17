/**
 * Normalize a single keyword phrase for deduplication (lowercase, collapse spaces).
 */
export function normalizeKeywordPhrase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[•\u2022\-–—]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse messy pasted lists: commas, newlines, bullets, numbered lines.
 */
export function parseKeywordListInput(raw: string): string[] {
  const lines = raw
    .split(/[\n,;]+/)
    .map((line) =>
      line
        .replace(/^\s*[\d]+[.)]\s+/, '')
        .replace(/^\s*[-*•]\s+/, '')
        .trim()
    )
    .filter((s) => s.length > 0);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const n = normalizeKeywordPhrase(line);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(line.trim());
  }
  return out;
}
