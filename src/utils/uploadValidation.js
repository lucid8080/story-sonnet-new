const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg'];

export function validateUpload(file, kind) {
  if (!file) return { ok: false, error: 'No file selected.' };

  const maxSizeMb = kind === 'audio' ? 50 : 10;
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    return { ok: false, error: `File is too large. Max ${maxSizeMb} MB.` };
  }

  if (kind === 'image' && !IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Images must be JPG, PNG, or WEBP.' };
  }

  if (kind === 'audio' && !AUDIO_TYPES.includes(file.type)) {
    return { ok: false, error: 'Audio must be an MP3 file.' };
  }

  return { ok: true };
}

