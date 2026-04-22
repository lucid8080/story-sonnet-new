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

function normalizeOpenRouterImageModel(model: string): string {
  const normalized = model.trim();
  if (normalized === 'google/nano-banana') {
    return 'google/gemini-2.5-flash-image';
  }
  return normalized;
}

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
  provider?: 'openrouter' | 'openai';
  model?: string;
}): Promise<StoryStudioImageResult> {
  const provider = opts.provider ?? 'openrouter';
  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY?.trim();
    const model = opts.model?.trim() || 'gpt-image-1';
    if (!key) {
      return {
        ok: false,
        reason: 'not_configured',
        message: 'Set OPENAI_API_KEY for OpenAI image generation.',
      };
    }
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: opts.prompt,
          size: '1536x1024',
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        return { ok: false, reason: 'api_error', message: buildImageApiError(res.status, raw) };
      }
      const json = JSON.parse(raw) as { data?: Array<{ b64_json?: string }> };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) {
        return { ok: false, reason: 'api_error', message: 'OpenAI image response missing b64_json' };
      }
      return { ok: true, imageBuffer: Buffer.from(b64, 'base64'), mimeType: 'image/png' };
    } catch (e) {
      return { ok: false, reason: 'api_error', message: e instanceof Error ? e.message : 'Image request failed' };
    }
  }

  const key =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.STORY_STUDIO_IMAGE_API_KEY?.trim();
  const url =
    process.env.STORY_STUDIO_IMAGE_API_URL?.trim() ||
    'https://openrouter.ai/api/v1/chat/completions';
  const model = normalizeOpenRouterImageModel(
    opts.model?.trim() || process.env.STORY_STUDIO_IMAGE_MODEL?.trim() || ''
  );

  if (!key || !model) {
    return {
      ok: false,
      reason: 'not_configured',
      message:
        'Set OPENROUTER_API_KEY and a valid image model (or STORY_STUDIO_IMAGE_* envs) for image generation.',
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
