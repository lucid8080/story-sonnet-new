#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
from pathlib import Path
from urllib import error, request

DEFAULT_API_URL = "https://api.mistral.ai/v1/audio/voices"


def load_env_file(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode('ascii')


def main():
    parser = argparse.ArgumentParser(description='Create a reusable Mistral voice from a reference sample.')
    parser.add_argument('--name', required=True, help='Display name for the saved voice')
    parser.add_argument('--sample', required=True, help='Path to sample audio file')
    parser.add_argument('--slug', default=None, help='Optional slug')
    parser.add_argument('--gender', default=None, help='Optional gender label')
    parser.add_argument('--age', type=int, default=None, help='Optional age label')
    parser.add_argument('--languages', nargs='*', default=None, help='Optional supported languages, e.g. en fr')
    parser.add_argument('--tags', nargs='*', default=None, help='Optional tags')
    parser.add_argument('--api-url', default=DEFAULT_API_URL, help='Override Mistral voice creation endpoint')
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    load_env_file(root / '.env.local')
    load_env_file(root / '.env')
    api_key = os.environ.get('MISTRAL_API_KEY')
    if not api_key:
        print('Missing MISTRAL_API_KEY in .env.local or environment.', file=sys.stderr)
        sys.exit(2)

    sample = Path(args.sample)
    payload = {
        'name': args.name,
        'sample_audio': to_base64(sample),
        'sample_filename': sample.name,
    }
    if args.slug:
        payload['slug'] = args.slug
    if args.gender:
        payload['gender'] = args.gender
    if args.age is not None:
        payload['age'] = args.age
    if args.languages:
        payload['languages'] = args.languages
    if args.tags:
        payload['tags'] = args.tags

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
            body = json.loads(resp.read().decode('utf-8'))
    except error.HTTPError as exc:
        print(f'Mistral API HTTP {exc.code}: {exc.read().decode("utf-8", errors="replace")}', file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f'Mistral API request failed: {exc}', file=sys.stderr)
        sys.exit(1)

    print(json.dumps(body, indent=2))
    voice_id = body.get('id') or body.get('voice_id')
    if voice_id:
        print(f'\nVoice created. Set MISTRAL_TTS_VOICE_ID={voice_id}')


if __name__ == '__main__':
    main()
