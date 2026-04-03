/**
 * Parse common duration strings (mm:ss, "N min", plain minutes) to seconds.
 * Strips trailing parenthetical notes like "(est.)" before parsing.
 */
export function parseDurationToSeconds(
  raw: string | null | undefined
): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim();

  const mmSsMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (mmSsMatch) {
    const minutes = Number(mmSsMatch[1]);
    const seconds = Number(mmSsMatch[2]);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return minutes * 60 + seconds;
    }
  }

  const minMatch = trimmed.match(/^(\d+)\s*(m|min|mins|minute|minutes)$/);
  if (minMatch) {
    const minutes = Number(minMatch[1]);
    if (Number.isFinite(minutes)) return minutes * 60;
  }

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) return asNumber * 60;

  return null;
}
