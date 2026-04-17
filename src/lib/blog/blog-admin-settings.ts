/** Same shape as blog feature image presets (id, label, text). */
export type BlogFeatureImageStyleCustomPreset = {
  id: string;
  label: string;
  text: string;
};

/** Parse JSON from DB into validated preset list (drops invalid entries). */
export function parseFeatureImageCustomPresets(
  raw: unknown
): BlogFeatureImageStyleCustomPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: BlogFeatureImageStyleCustomPreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const text = typeof o.text === 'string' ? o.text.trim() : '';
    if (!id || !label || !text) continue;
    if (id.length > 100 || label.length > 120 || text.length > 4000) continue;
    out.push({ id, label, text });
  }
  return out;
}
