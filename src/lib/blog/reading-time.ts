const WORDS_PER_MINUTE = 200;

/** Strip tags and collapse whitespace for plain-text snippets (e.g. image prompts). */
export function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const IMAGE_PROMPT_SNIPPET_MAX = 1500;

/** Truncate plain text for API payloads (blog feature image context). */
export function truncateForImagePrompt(text: string, max = IMAGE_PROMPT_SNIPPET_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function estimateReadingTimeMinutesFromHtml(html: string): number {
  const text = plainTextFromHtml(html);
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
