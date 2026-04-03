import React, { useState } from 'react';
import { validateUpload } from '../../utils/uploadValidation.js';

export default function UploadField({ label, kind, bucket, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const check = validateUpload(selected, kind);
    if (!check.ok) {
      setError(check.error);
      setFile(null);
    } else {
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      onUploaded?.(data);
      setFile(null);
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          onChange={handleChange}
          className="text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.18em] file:text-slate-50"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-50 disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {file && !error && (
        <p className="text-[11px] text-slate-500">
          Ready: {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}
      {error && (
        <p className="text-[11px] font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

