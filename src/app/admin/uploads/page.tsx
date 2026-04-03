'use client';

import { useState } from 'react';

export default function AdminUploadsPage() {
  const [bucket, setBucket] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus('Choose a file.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    if (bucket) fd.append('bucket', bucket);
    setUploading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || `Upload failed (${res.status})`);
        return;
      }
      setStatus(`Uploaded: ${data.fileUrl}`);
      fileInput.value = '';
    } catch {
      setStatus('Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">Uploads</h1>
      <p className="mt-1 text-sm text-slate-500">
        POST multipart to S3-compatible storage. Set <code>R2_BUCKET</code>{' '}
        (or <code>S3_BUCKET</code>) or enter bucket below. Requires admin session
        and R2 (or S3) credentials.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-6 max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
      >
        <div>
          <label className="text-xs font-semibold text-slate-500">
            Bucket (optional if R2_BUCKET / S3_BUCKET env set)
          </label>
          <input
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="covers"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">File</label>
          <input
            type="file"
            name="file"
            required
            className="mt-1 w-full text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        {status && (
          <p className="text-xs text-slate-600 break-all">{status}</p>
        )}
      </form>
    </div>
  );
}
