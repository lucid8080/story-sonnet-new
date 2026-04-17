/**
 * Strip accidental markdown fences from model output before JSON.parse.
 */
export function extractJsonObject(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    const lines = s.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines[lines.length - 1]?.trim() === '```') lines.pop();
    s = lines.join('\n').trim();
  }
  return s;
}
