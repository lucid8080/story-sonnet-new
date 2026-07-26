/**
 * Normalize and validate an S3/R2 list prefix under the private `audio/` tree.
 * Always returns a prefix ending with `/`.
 */
export function assertSafeAudioPrefix(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/^\/+/, '');
  const collapsed = trimmed.replace(/\/+/g, '/');
  if (collapsed.includes('..')) {
    throw new Error('Invalid prefix');
  }
  if (collapsed === '' || collapsed === 'audio') {
    return 'audio/';
  }
  if (!collapsed.startsWith('audio/')) {
    throw new Error('Prefix must start with audio/');
  }
  return collapsed.endsWith('/') ? collapsed : `${collapsed}/`;
}

const MP3_KEY = /\.mp3$/i;

export function isPrivateAudioMp3Key(key: string): boolean {
  if (!key || key.endsWith('/')) return false;
  return MP3_KEY.test(key);
}
