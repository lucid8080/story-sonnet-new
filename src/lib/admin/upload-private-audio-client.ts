/**
 * Browser helpers for private episode MP3 uploads.
 * Uses a short-lived R2 PUT URL so files never pass through Vercel’s 4.5MB body limit.
 */

export type PresignAudioResponse = {
  storageKey: string;
  uploadUrl: string;
  contentType: string;
  error?: string;
};

export async function readLocalAudioDurationSeconds(
  file: File
): Promise<number | null> {
  if (typeof document === 'undefined') return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const duration = await new Promise<number | null>((resolve) => {
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        resolve(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
      };
      audio.onerror = () => resolve(null);
      audio.src = objectUrl;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadPrivateAudioDirect(params: {
  file: File;
  storySlug?: string;
  audioSubPath?: string;
  bucket?: string;
}): Promise<{ storageKey: string; durationSeconds: number | null }> {
  const contentType =
    params.file.type === 'audio/mpeg' || params.file.type === 'audio/mp3'
      ? params.file.type
      : 'audio/mpeg';

  let presign: PresignAudioResponse;
  try {
    const presignRes = await fetch('/api/admin/audio/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: params.file.name,
        contentType,
        storySlug: params.storySlug?.trim() || undefined,
        audioSubPath: params.audioSubPath?.trim() || undefined,
        bucket: params.bucket?.trim() || undefined,
      }),
    });
    presign = (await presignRes.json().catch(() => ({}))) as PresignAudioResponse;
    if (!presignRes.ok) {
      throw new Error(
        presign.error || `Presign failed (${presignRes.status})`
      );
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message && !e.message.startsWith('Presign')) {
      // Network/parse errors on same-origin presign are rare; rethrow as-is.
      if (
        e.message === 'Failed to fetch' ||
        e.name === 'TypeError'
      ) {
        throw new Error(
          'Could not reach /api/admin/audio/presign (Failed to fetch). Check you are logged in as admin and the deploy includes that route.'
        );
      }
    }
    throw e;
  }

  if (!presign.uploadUrl?.trim() || !presign.storageKey?.trim()) {
    throw new Error('Presign succeeded but uploadUrl/storageKey missing');
  }

  try {
    const putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': presign.contentType || contentType,
      },
      body: params.file,
    });
    if (!putRes.ok) {
      const hint =
        putRes.status === 403
          ? ' Check R2 CORS on the private audio bucket and that Content-Type was signed correctly.'
          : '';
      throw new Error(
        `Direct R2 upload failed (${putRes.status}).${hint}`
      );
    }
  } catch (e: unknown) {
    if (
      e instanceof TypeError ||
      (e instanceof Error && e.message === 'Failed to fetch')
    ) {
      throw new Error(
        'Failed to fetch while uploading to R2 (usually CORS). On the private audio bucket set AllowedHeaders to ["Content-Type"] (not "*"), AllowedMethods including PUT, and AllowedOrigins to this site’s exact origin.'
      );
    }
    throw e;
  }

  const durationSeconds = await readLocalAudioDurationSeconds(params.file);
  return {
    storageKey: presign.storageKey.trim(),
    durationSeconds,
  };
}
