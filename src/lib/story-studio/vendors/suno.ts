export type SunoGenerateResult =
  | {
      ok: true;
      /** Provider job id for polling, if async */
      jobId: string;
      /** Direct audio URL when sync */
      audioUrl?: string;
      raw: unknown;
    }
  | { ok: false; reason: 'not_configured' | 'api_error'; message: string };

/**
 * Placeholder Suno adapter — API surface varies by product tier.
 * Replace `SUNO_API_URL` + payload with official docs when available.
 */
export async function sunoGenerateTheme(opts: {
  prompt: string;
  title?: string;
}): Promise<SunoGenerateResult> {
  const key = process.env.SUNO_API_KEY?.trim();
  const base = process.env.SUNO_API_URL?.trim();

  if (!key) {
    return {
      ok: false,
      reason: 'not_configured',
      message:
        'Set SUNO_API_KEY (and optionally SUNO_API_URL) in .env to generate theme music.',
    };
  }

  if (!base) {
    return {
      ok: false,
      reason: 'not_configured',
      message:
        'Set SUNO_API_URL to your Suno API base URL when integrating (Story Studio stub).',
    };
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        title: opts.title,
      }),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        reason: 'api_error',
        message: `Suno ${res.status}: ${JSON.stringify(raw).slice(0, 400)}`,
      };
    }

    const jobId =
      (raw as { id?: string }).id ||
      (raw as { job_id?: string }).job_id ||
      `suno-${Date.now()}`;
    const audioUrl = (raw as { audio_url?: string }).audio_url;

    return { ok: true, jobId, audioUrl, raw };
  } catch (e) {
    return {
      ok: false,
      reason: 'api_error',
      message: e instanceof Error ? e.message : 'Suno request failed',
    };
  }
}
