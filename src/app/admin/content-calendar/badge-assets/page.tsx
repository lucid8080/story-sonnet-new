'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type Row = {
  id: string;
  name: string;
  publicUrl: string;
  altText: string;
  createdAt: string;
};

export default function BadgeAssetsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/content-calendar/badge-assets');
    const j = await res.json();
    if (j.ok) setRows(j.badgeAssets);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    fd.set('assetKind', 'spotlight_badge');
    const up = await fetch('/api/upload', { method: 'POST', body: fd });
    const uj = await up.json();
    if (!up.ok) {
      toast.error(uj.error || 'Upload failed');
      return;
    }
    const name = file.name.replace(/\.[^.]+$/, '') || 'Badge';
    const reg = await fetch('/api/admin/content-calendar/badge-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        publicUrl: uj.fileUrl,
        storagePath: uj.storagePath,
        altText: name,
        mimeType: 'image/png',
        fileSizeBytes: file.size,
      }),
    });
    const rj = await reg.json();
    if (!reg.ok) {
      toast.error(rj.error || 'Register failed');
      return;
    }
    toast.success('Badge registered');
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Upload PNG</h2>
        <input
          type="file"
          accept="image/png"
          className="mt-2 text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="relative mx-auto aspect-square w-32 bg-slate-100">
              <Image
                src={r.publicUrl}
                alt={r.altText || r.name}
                fill
                className="object-contain p-2"
                sizes="128px"
              />
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900">{r.name}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{r.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
