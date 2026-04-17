import {
  buildBlogImageKey,
  makeUniqueSafeFileName,
  sanitizeUploadFileName,
} from '@/lib/media-upload-keys';
import { getDefaultStorageBucket, uploadPublicObject } from '@/lib/s3';

export async function uploadBlogFeatureImageBuffer(opts: {
  blogSlug: string;
  buffer: Buffer;
  mimeType: string;
  fileNameHint?: string;
}): Promise<{ fileUrl: string; storageKey: string }> {
  const bucket = getDefaultStorageBucket();
  if (!bucket) throw new Error('Storage bucket not configured');

  const ext =
    opts.mimeType.includes('png') || opts.mimeType === 'image/png'
      ? 'png'
      : opts.mimeType.includes('webp')
        ? 'webp'
        : 'jpg';
  const safe = sanitizeUploadFileName(
    opts.fileNameHint?.replace(/\.[^.]+$/, '') || `feature.${ext}`
  );
  const leaf = makeUniqueSafeFileName(`${safe.replace(/\.[^.]+$/, '')}.${ext}`);
  const key = buildBlogImageKey({ blogSlug: opts.blogSlug, safeFileName: leaf });
  const { url } = await uploadPublicObject({
    bucket,
    key,
    body: opts.buffer,
    contentType: opts.mimeType,
  });
  return { fileUrl: url, storageKey: key };
}
