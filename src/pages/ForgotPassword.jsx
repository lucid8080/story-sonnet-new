import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ForgotPassword() {
  const { requestPasswordReset, error } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    setSuccessMessage('');
    const { error: submitError } = await requestPasswordReset(email);
    setSubmitting(false);

    if (submitError) {
      setLocalError(submitError);
      return;
    }

    setSuccessMessage('If an account exists for that email, a reset link is on its way.');
  };

  const displayError = localError || error;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-md px-5 py-10 sm:px-0">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200 ring-1 ring-slate-100">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">
            We&apos;ll send a secure link so you can choose a new password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                placeholder="you@example.com"
              />
            </div>

            {displayError && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-100">
                {displayError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 shadow-md shadow-slate-400/40 hover:bg-black disabled:opacity-60"
            >
              {submitting ? 'Sending link…' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-rose-600 hover:text-rose-700">
              Back to login
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

