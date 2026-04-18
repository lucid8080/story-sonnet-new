import {
  encodeDisplayWebp,
  isDecodableRasterImage,
  tryReuseWebpAsDisplay,
  type DisplayWebpPreset,
} from '@/lib/images/encodeDisplayWebp';
import { displayKeyFromOriginalKey } from '@/lib/images/displayKey';
import { uploadPublicObject } from '@/lib/s3';

export type DualUploadResult = {
  originalUrl: string;
  originalKey: string;
  displayUrl: string;
  displayKey: string;
  /** True when display buffer was reused (small WebP) without re-encode */
  displayReusedWebp: boolean;
};

/**
 * Upload original bytes to `originalKey`, then WebP display variant to `*_display.webp`.
 * `fileUrl` for the site should be {@link DualUploadResult.displayUrl}.
 */
export async function uploadOriginalPlusDisplayWebp(params: {
  bucket: string;
  originalKey: string;
  body: Buffer;
  originalContentType: string;
  preset: DisplayWebpPreset;
}): Promise<DualUploadResult> {
  const { bucket, originalKey, body, originalContentType, preset } = params;

  const { url: originalUrl } = await uploadPublicObject({
    bucket,
    key: originalKey,
    body,
    contentType: originalContentType,
  });

  const displayKey = displayKeyFromOriginalKey(originalKey);
  const raster = await isDecodableRasterImage(body);
  if (!raster) {
    return {
      originalUrl,
      originalKey,
      displayUrl: originalUrl,
      displayKey: originalKey,
      displayReusedWebp: false,
    };
  }

  const reused = await tryReuseWebpAsDisplay(body, preset);
  let displayBody: Buffer;
  let displayReusedWebp = false;

  if (reused) {
    displayBody = reused;
    displayReusedWebp = true;
  } else {
    const enc = await encodeDisplayWebp(body, preset);
    displayBody = enc.webpBuffer;
  }

  const { url: displayUrl } = await uploadPublicObject({
    bucket,
    key: displayKey,
    body: displayBody,
    contentType: 'image/webp',
  });

  return {
    originalUrl,
    originalKey,
    displayUrl,
    displayKey,
    displayReusedWebp,
  };
}
