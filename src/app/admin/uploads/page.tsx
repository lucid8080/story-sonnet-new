'use client';

import { useState } from 'react';

export default function AdminUploadsPage() {
  const [bucket, setBucket] = useState('');
  const [storySlug, setStorySlug] = useState('');
  const [audioSubPath, setAudioSubPath] = useState('');
  const [assetKind, setAssetKind] = useState<'cover' | 'audio'>('cover');
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
    fd.append('assetKind', assetKind);
    if (bucket) fd.append('bucket', bucket);
    if (storySlug.trim()) fd.append('storySlug', storySlug.trim());
    if (assetKind === 'audio' && audioSubPath.trim()) {
      fd.append('audioSubPath', audioSubPath.trim());
    }
    setUploading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || `Upload failed (${res.status})`);
        return;
      }
      if (data.storageKey) {
        setStatus(
          `Private audio key (paste in episode admin): ${data.storageKey}`
        );
      } else {
        setStatus(`Uploaded: ${data.fileUrl}`);
      }
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
        Covers use the <strong>public</strong> bucket (<code>R2_BUCKET</code> +
        <code>R2_PUBLIC_BASE_URL</code>). MP3s use the <strong>private</strong>{' '}
        audio bucket (<code>R2_PRIVATE_BUCKET</code> or fallback{' '}
        <code>R2_BUCKET</code>) and return a storage key for the episode editor.
        Object keys use your <strong>filename</strong> only (no timestamp);
        uploading again to the same path <strong>overwrites</strong> the file.
        <strong> Bucket override</strong> is the bucket <em>name</em> only (no
        slashes). Use <strong>Story slug</strong> and (for audio){' '}
        <strong>Audio subfolder</strong> to build paths like{' '}
        <code>covers/my-story/cover.webp</code> or{' '}
        <code>audio/my-story/music/theme.mp3</code>.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-6 max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
      >
        <div>
          <label className="text-xs font-semibold text-slate-500">
            Asset type
          </label>
          <select
            value={assetKind}
            onChange={(e) =>
              setAssetKind(e.target.value === 'audio' ? 'audio' : 'cover')
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="cover">Cover (public URL)</option>
            <option value="audio">Audio (private — returns storage key)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">
            Story slug (optional)
          </label>
          <input
            value={storySlug}
            onChange={(e) => setStorySlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="e.g. the-adventures-of-zubie-and-robo-rex"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-slate-400">
            Lowercase letters, numbers, hyphens — same as the story slug in admin.
          </p>
        </div>
        {assetKind === 'audio' && (
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Audio subfolder (optional)
            </label>
            <input
              value={audioSubPath}
              onChange={(e) => setAudioSubPath(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. music"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-400">
              Requires story slug. Use segments like <code>music</code> or{' '}
              <code>music/extra</code> (each segment slug-shaped).
            </p>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-500">
            Bucket override (optional)
          </label>
          <input
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={
              assetKind === 'audio'
                ? 'Private audio bucket name'
                : 'Public assets bucket'
            }
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
