# Story Sonnet

Kid-friendly audio story app built with React + Vite.

## Primary TTS path: Mistral API

Story Sonnet now treats the **Mistral API as the main voice-generation path**.
The older Hugging Face / Voxtral demo route should be treated as fallback only when needed.

### Files
- `scripts/generate-audio-mistral.py` — generate episode audio via Mistral
- `scripts/create-mistral-voice.py` — create a reusable saved Mistral voice from a short sample
- `.env.local` — local API key + default voice settings

### Default env keys
```env
MISTRAL_API_KEY=...
MISTRAL_TTS_MODEL=voxtral-mini-tts-2603
# Preferred main setup:
# MISTRAL_TTS_VOICE_ID=...
# Optional fallback if you do not have a saved voice yet:
# MISTRAL_TTS_REF_AUDIO=/absolute/path/to/reference-sample.mp3
```

### Recommended setup
1. Trim a clean voice sample under 60 seconds
2. Create a saved Mistral voice
3. Put the returned `MISTRAL_TTS_VOICE_ID` into `.env.local`
4. Generate episodes directly through Mistral

### Quick usage
Create a reusable saved voice:
```bash
python3 scripts/create-mistral-voice.py \
  --name "Pip Main Voice" \
  --sample /tmp/pip-voice-sample.mp3 \
  --languages en
```

Generate an episode with a saved voice:
```bash
python3 scripts/generate-audio-mistral.py \
  --input content/pip-and-the-moonlight-mailbox/tts-input-final.md \
  --output public/audio/pip-and-the-moonlight-mailbox/episode-main.mp3
```

Generate directly from a short reference clip if no saved voice exists yet:
```bash
python3 scripts/generate-audio-mistral.py \
  --input content/pip-and-the-moonlight-mailbox/tts-input-final.md \
  --ref-audio /tmp/pip-voice-sample.mp3 \
  --output public/audio/pip-and-the-moonlight-mailbox/episode-main.mp3
```

### Important
- Mistral reference clips must be **under 60 seconds**.
- The best long-term setup is a saved `voice_id` per series voice.
- The speech endpoint returns base64 audio in JSON; the script handles decoding automatically.
