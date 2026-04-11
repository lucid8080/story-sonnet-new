export type StoryStudioImageResult =
  | { ok: true; imageBuffer: Buffer; mimeType: string }
  | { ok: false; reason: 'not_configured' | 'api_error'; message: string };

type OpenRouterImageResponse = {
  choices?: Array<{
    message?: {
      images?: Array<{
        image_url?: {
          url?: string;
        };
      }>;
      content?:
        | string
        | Array<{
            type?: string;
            image_url?: { url?: string };
            text?: string;
          }>;
    };
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
};

function buildImageApiError(status: number, payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return `Image API ${status}`;
  }
  const maybeError = (payload as { error?: { message?: string; code?: string } })
    .error;
  const message =
    maybeError?.message?.trim() ||
    (payload as { message?: string }).message?.trim();
  const code = maybeError?.code ? ` (${String(maybeError.code)})` : '';
  return message ? `Image API ${status}${code}: ${message}` : `Image API ${status}`;
}

/**
 * OpenRouter image-generation adapter.
 * Expects chat-completions JSON with image output.
 */
export async function generateStoryCoverImage(opts: {
  prompt: string;
}): Promise<StoryStudioImageResult> {
  const key = process.env.STORY_STUDIO_IMAGE_API_KEY?.trim();
  const url = process.env.STORY_STUDIO_IMAGE_API_URL?.trim();
  const model = process.env.STORY_STUDIO_IMAGE_MODEL?.trim();

  if (!key || !url || !model) {
    return {
      ok: false,
      reason: 'not_configured',
      message:
        'Set STORY_STUDIO_IMAGE_API_KEY, STORY_STUDIO_IMAGE_API_URL, and STORY_STUDIO_IMAGE_MODEL for cover generation.',
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: opts.prompt }],
      }),
    });
    const raw = await res.text();
    const data = JSON.parse(raw) as OpenRouterImageResponse;
    if (!res.ok) {
      return {
        ok: false,
        reason: 'api_error',
        message: buildImageApiError(res.status, data),
      };
    }
    const message = data.choices?.[0]?.message;
    const imageUrlFromImages = message?.images?.[0]?.image_url?.url;
    const imageUrlFromContent = Array.isArray(message?.content)
      ? message.content.find((part) => part?.type === 'image_url')?.image_url?.url
      : undefined;
    const imageDataUrl = imageUrlFromImages || imageUrlFromContent;
    let mimeType = 'image/png';
    let b64: string | undefined;
    if (imageDataUrl?.startsWith('data:')) {
      const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        mimeType = m[1] || mimeType;
        b64 = m[2];
      }
    } else if (imageDataUrl) {
      b64 = imageDataUrl;
    }
    if (!b64) {
      return {
        ok: false,
        reason: 'api_error',
        message:
          `Image API ${res.status}: expected choices[0].message.images[0].image_url.url`,
      };
    }
    const buf = Buffer.from(b64, 'base64');
    return { ok: true, imageBuffer: buf, mimeType };
  } catch (e) {
    return {
      ok: false,
      reason: 'api_error',
      message: e instanceof Error ? e.message : 'Image request failed',
    };
  }
}
