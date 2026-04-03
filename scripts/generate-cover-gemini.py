#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_MODELS = [
    'nano-banana-pro-preview',
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview',
    'gemini-3.1-flash-image-preview',
]


def call_model(api_key: str, model: str, prompt: str):
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    body = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'responseModalities': ['TEXT', 'IMAGE']},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read().decode())


def extract_image(response: dict):
    for cand in response.get('candidates', []):
        for part in cand.get('content', {}).get('parts', []):
            inline = part.get('inlineData')
            if inline and inline.get('data'):
                return inline.get('mimeType', 'image/png'), base64.b64decode(inline['data'])
    return None, None


def main():
    parser = argparse.ArgumentParser(description='Generate a story cover with Gemini image models.')
    parser.add_argument('prompt_file', help='Path to prompt markdown/text file')
    parser.add_argument('output_file', help='Path to save output image (png)')
    parser.add_argument('--api-key', default=os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY'))
    parser.add_argument('--model', action='append', dest='models', help='Specific model(s) to try')
    parser.add_argument('--retry', type=int, default=1, help='Retries per model on 429')
    args = parser.parse_args()

    if not args.api_key:
        print('Missing GEMINI_API_KEY / GOOGLE_API_KEY', file=sys.stderr)
        sys.exit(2)

    prompt = Path(args.prompt_file).read_text()
    output_path = Path(args.output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    models = args.models or DEFAULT_MODELS
    last_error = None

    for model in models:
        for attempt in range(args.retry + 1):
            try:
                print(f'Trying {model} (attempt {attempt + 1})...')
                data = call_model(args.api_key, model, prompt)
                mime, raw = extract_image(data)
                if raw:
                    output_path.write_bytes(raw)
                    print(f'Saved {output_path} ({len(raw)} bytes, {mime})')
                    return
                print(f'No image returned from {model}')
                last_error = 'No image returned'
                break
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors='ignore')
                last_error = f'HTTP {e.code}: {body[:1200]}'
                print(last_error, file=sys.stderr)
                if e.code == 429 and attempt < args.retry:
                    time.sleep(35)
                    continue
                break
            except Exception as e:
                last_error = repr(e)
                print(last_error, file=sys.stderr)
                break

    print('Image generation failed.', file=sys.stderr)
    if last_error:
        print(last_error, file=sys.stderr)
    sys.exit(1)


if __name__ == '__main__':
    main()
