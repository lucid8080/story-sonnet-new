'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';

type AccountSettingsPanelProps = {
  initialImageUrl: string | null;
  email: string | null | undefined;
};

export default function AccountSettingsPanel({
  initialImageUrl,
  email,
}: AccountSettingsPanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const initials = useMemo(() => {
    const source = email || 'U';
    return source.slice(0, 1).toUpperCase();
  }, [email]);

  async function handleAvatarUpload(file: File) {
    setAvatarBusy(true);
    setAvatarError(null);
    setAvatarMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { imageUrl?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Avatar upload failed.');
      }

      setImageUrl(payload?.imageUrl ?? null);
      setAvatarMessage('Avatar updated.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    setAvatarError(null);
    setAvatarMessage(null);
    try {
      const response = await fetch('/api/account/avatar', { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not remove avatar.');
      }
      setImageUrl(null);
      setAvatarMessage('Avatar removed.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Password change failed.');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password changed successfully.');
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : 'Password update failed.'
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8">
      <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
        <h2 className="text-xl font-black text-slate-900">Avatar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a JPG, PNG, or WEBP image up to 2MB.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Your avatar"
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-black text-slate-700">
              {initials}
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60">
            {avatarBusy ? 'Working...' : 'Upload avatar'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={avatarBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleAvatarUpload(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <button
            type="button"
            disabled={avatarBusy || !imageUrl}
            onClick={() => void handleAvatarRemove()}
            className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove avatar
          </button>
        </div>
        {avatarMessage && (
          <p className="mt-3 text-sm font-medium text-emerald-700">{avatarMessage}</p>
        )}
        {avatarError && (
          <p className="mt-3 text-sm font-medium text-rose-700">{avatarError}</p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
        <h2 className="text-xl font-black text-slate-900">Password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Change your password for email and password sign-in.
        </p>
        <form className="mt-5 grid gap-4" onSubmit={handlePasswordSubmit}>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Current password</span>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-rose-200 focus:ring"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-rose-200 focus:ring"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">
              Confirm new password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-rose-200 focus:ring"
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={passwordBusy}
              className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordBusy ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
        {passwordMessage && (
          <p className="mt-3 text-sm font-medium text-emerald-700">
            {passwordMessage}
          </p>
        )}
        {passwordError && (
          <p className="mt-3 text-sm font-medium text-rose-700">{passwordError}</p>
        )}
      </section>
    </div>
  );
}
