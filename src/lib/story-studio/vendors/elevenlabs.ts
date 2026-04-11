export type ElevenLabsResult =
  | { ok: true; audioBuffer: Buffer; mimeType: string }
  | { ok: false; reason: 'not_configured' | 'api_error'; message: string };

/**
 * Text-to-speech via ElevenLabs REST API (server-only).
 * Wire exact endpoint to match your account; this shape is stable for orchestration.
 */
export async function elevenLabsTextToSpeech(opts: {
  text: string;
  voiceId?: string;
}): Promise<ElevenLabsResult> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const defaultVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
  const voiceId = opts.voiceId?.trim() || defaultVoice;

  if (!key || !voiceId) {
    return {
      ok: false,
      reason: 'not_configured',
      message:
        'Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env to generate narration audio.',
    };
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const modelId =
    process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: modelId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        reason: 'api_error',
        message: `ElevenLabs ${res.status}: ${errText.slice(0, 400)}`,
      };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, audioBuffer: buf, mimeType: 'audio/mpeg' };
  } catch (e) {
    return {
      ok: false,
      reason: 'api_error',
      message: e instanceof Error ? e.message : 'ElevenLabs request failed',
    };
  }
}
