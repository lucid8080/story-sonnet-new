import React from 'react';
import { LogIn, Apple } from 'lucide-react';

export default function AuthButtons({ onGoogle, onApple, loadingProvider }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onGoogle}
        disabled={loadingProvider === 'google'}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        <LogIn className="h-5 w-5 text-rose-500" />
        <span>{loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
      </button>
      <button
        type="button"
        onClick={onApple}
        disabled={loadingProvider === 'apple'}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 shadow-sm hover:bg-black disabled:opacity-60"
      >
        <Apple className="h-5 w-5" />
        <span>{loadingProvider === 'apple' ? 'Connecting...' : 'Continue with Apple'}</span>
      </button>
    </div>
  );
}

