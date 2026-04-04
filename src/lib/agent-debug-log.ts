import { appendFileSync } from 'fs';
import { join } from 'path';

const LOG_REL = 'debug-2b6d71.log';

/** NDJSON to workspace log file + ingest (ingest may be unavailable on deployed hosts). */
export function agentDebugLog(payload: Record<string, unknown>) {
  const body = {
    sessionId: '2b6d71',
    timestamp: Date.now(),
    ...payload,
  };
  try {
    appendFileSync(join(process.cwd(), LOG_REL), `${JSON.stringify(body)}\n`, {
      encoding: 'utf8',
    });
  } catch {
    /* e.g. serverless read-only FS */
  }
  fetch('http://127.0.0.1:7619/ingest/678f1997-b99a-405b-943f-eded3c164e8b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '2b6d71',
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}
