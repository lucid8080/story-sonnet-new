import {
  buildBlogImageKey,
  makeUniqueSafeFileName,
  sanitizeUploadFileName,
} from '@/lib/media-upload-keys';
import { uploadOriginalPlusDisplayWebp } from '@/lib/images/dualPublicImageUpload';
import { getDefaultStorageBucket } from '@/lib/s3';

export async function uploadBlogFeatureImageBuffer(opts: {
  blogSlug: string;
  buffer: Buffer;
  mimeType: string;
  fileNameHint?: string;
}): Promise<{
  fileUrl: string;
  storageKey: string;
  originalFileUrl: string;
  originalStorageKey: string;
}> {
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
  const dual = await uploadOriginalPlusDisplayWebp({
    bucket,
    originalKey: key,
    body: opts.buffer,
    originalContentType: opts.mimeType,
    preset: 'blog',
  });
  return {
    fileUrl: dual.displayUrl,
    storageKey: dual.displayKey,
    originalFileUrl: dual.originalUrl,
    originalStorageKey: dual.originalKey,
  };
}
