#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib import error, request

DEFAULT_API_URL = "https://api.mistral.ai/v1/audio/speech"


def load_env_file(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def infer_format(output_path: Path, explicit: str | None) -> str:
    if explicit:
        return explicit
    suffix = output_path.suffix.lower().lstrip('.')
    return suffix or 'mp3'


def to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode('ascii')



def prepare_ref_audio(path: Path, trim_seconds: float | None) -> Path:
    if not trim_seconds or trim_seconds <= 0:
        return path
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        return path
    tmpdir = Path(tempfile.mkdtemp(prefix='mistral-ref-'))
    out = tmpdir / f'{path.stem}-trimmed{path.suffix}'
    cmd = [ffmpeg, '-y', '-i', str(path), '-ss', '0', '-t', str(trim_seconds), str(out)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out

def decode_audio_payload(raw: bytes, content_type: str) -> bytes:
    if 'application/json' in (content_type or ''):
        data = json.loads(raw.decode('utf-8'))
        if 'audio_data' not in data:
            raise ValueError(f'No audio_data field in JSON response: {data}')
        return base64.b64decode(data['audio_data'])
    return raw


def main():
    parser = argparse.ArgumentParser(description="Generate Story Sonnet TTS audio via Mistral API.")
    parser.add_argument("--input", required=True, help="Path to narration script text file")
    parser.add_argument("--output", required=True, help="Path to output audio file")
    parser.add_argument("--voice-id", default=None, help="Saved Mistral voice identifier")
    parser.add_argument("--ref-audio", default=None, help="Reference audio clip for one-off voice cloning")
    parser.add_argument("--voice", default=None, help="Backward-compatible alias; treated as --voice-id")
    parser.add_argument("--model", default=None, help="Model name for the Mistral TTS request")
    parser.add_argument("--format", default=None, help="Response audio format, e.g. mp3 or wav")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Override Mistral speech endpoint")
    parser.add_argument("--trim-ref-seconds", type=float, default=20.0, help="Trim reference audio to this many seconds before upload (recommended 3-25s). Use 0 to disable trimming.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    load_env_file(root / '.env.local')
    load_env_file(root / '.env')

    api_key = os.environ.get('MISTRAL_API_KEY')
    model = args.model or os.environ.get('MISTRAL_TTS_MODEL', 'voxtral-mini-tts-2603')
    voice_id = args.voice_id or args.voice or os.environ.get('MISTRAL_TTS_VOICE_ID')
    ref_audio = args.ref_audio or os.environ.get('MISTRAL_TTS_REF_AUDIO')

    if not api_key:
        print('Missing MISTRAL_API_KEY in .env.local or environment.', file=sys.stderr)
        sys.exit(2)
    if not voice_id and not ref_audio:
        print('Provide either --voice-id / MISTRAL_TTS_VOICE_ID or --ref-audio / MISTRAL_TTS_REF_AUDIO.', file=sys.stderr)
        sys.exit(2)

    input_path = Path(args.input)
    output_path = Path(args.output)
    text = input_path.read_text(encoding='utf-8').strip()
    if not text:
        print(f'Input file is empty: {input_path}', file=sys.stderr)
        sys.exit(2)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    response_format = infer_format(output_path, args.format)

    payload = {
        'model': model,
        'input': text,
        'response_format': response_format,
    }
    if voice_id:
        payload['voice_id'] = voice_id
    if ref_audio:
        ref_path = prepare_ref_audio(Path(ref_audio), args.trim_ref_seconds)
        payload['ref_audio'] = to_base64(ref_path)

    req = request.Request(
        args.api_url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )

    try:
        with request.urlopen(req, timeout=300) as resp:
            raw = resp.read()
            content_type = resp.headers.get('Content-Type', '')
    except error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        print(f'Mistral API HTTP {exc.code}: {body}', file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f'Mistral API request failed: {exc}', file=sys.stderr)
        sys.exit(1)

    try:
        audio = decode_audio_payload(raw, content_type)
    except Exception as exc:
        print(f'Failed to decode Mistral audio response: {exc}', file=sys.stderr)
        sys.exit(1)

    output_path.write_bytes(audio)
    guessed = mimetypes.guess_type(str(output_path))[0] or 'unknown'
    voice_mode = f'voice_id={voice_id}' if voice_id else f'ref_audio={Path(ref_audio).name}'
    print(f'Saved {output_path} ({len(audio)} bytes, model={model}, {voice_mode}, format={response_format}, mime~={guessed})')


if __name__ == '__main__':
    main()
