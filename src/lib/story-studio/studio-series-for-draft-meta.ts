/**
 * Series title used for Story Studio draft identity (left-rail title + slug),
 * preferring script package when present, then brief JSON.
 */
export function studioSeriesTitleForDraftMeta(
  brief: unknown,
  scriptPackage: unknown
): string | null {
  if (scriptPackage && typeof scriptPackage === 'object') {
    const st = (scriptPackage as { seriesTitle?: unknown }).seriesTitle;
    if (typeof st === 'string') {
      const t = st.trim();
      if (t.length > 0) return t;
    }
  }
  if (!brief || typeof brief !== 'object') return null;
  const st = (brief as { seriesTitle?: unknown }).seriesTitle;
  if (typeof st !== 'string') return null;
  const t = st.trim();
  return t.length > 0 ? t : null;
}
