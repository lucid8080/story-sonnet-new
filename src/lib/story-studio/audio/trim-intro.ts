import { spawn } from 'node:child_process';

export type TrimIntroResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; reason: 'ffmpeg_missing' | 'ffmpeg_failed'; message: string };

/**
 * Trim first `durationSeconds` of an audio file using ffmpeg.
 * Fails gracefully when ffmpeg is not on PATH (typical serverless).
 */
export function trimAudioToBuffer(opts: {
  inputBuffer: Buffer;
  durationSeconds: number;
}): Promise<TrimIntroResult> {
  return new Promise((resolve) => {
    const resolved = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';

    const child = spawn(
      resolved,
      [
        '-i',
        'pipe:0',
        '-t',
        String(opts.durationSeconds),
        '-c:a',
        'libmp3lame',
        '-b:a',
        '192k',
        '-f',
        'mp3',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const chunks: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    let err = '';
    child.stderr.on('data', (c: Buffer) => {
      err += c.toString();
    });

    child.on('error', () => {
      resolve({
        ok: false,
        reason: 'ffmpeg_missing',
        message:
          'ffmpeg not found. Install ffmpeg locally or set FFMPEG_PATH; theme intro trim skipped on serverless.',
      });
    });

    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          reason: 'ffmpeg_failed',
          message: err.slice(0, 400) || `ffmpeg exited ${code}`,
        });
        return;
      }
      resolve({ ok: true, buffer: Buffer.concat(chunks) });
    });

    child.stdin.write(opts.inputBuffer);
    child.stdin.end();
  });
}
