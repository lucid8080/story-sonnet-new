import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import AuthButtons from '../components/auth/AuthButtons.jsx';

export default function Signup() {
  const { signUpWithEmail, signInWithProvider, error } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [providerLoading, setProviderLoading] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    setSuccessMessage('');
    const { error: submitError } = await signUpWithEmail({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
    });
    setSubmitting(false);

    if (submitError) {
      setLocalError(submitError);
      return;
    }

    setSuccessMessage('Check your email to confirm your account, then you can log in.');
    // Optional: redirect after short delay
    setTimeout(() => {
      navigate(from, { replace: true });
    }, 1500);
  };

  const handleGoogle = async () => {
    setProviderLoading('google');
    await signInWithProvider('google');
    setProviderLoading(null);
  };

  const handleApple = async () => {
    setProviderLoading('apple');
    await signInWithProvider('apple');
    setProviderLoading(null);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50">
      <div className="mx-auto max-w-md px-5 py-10 sm:px-0">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200 ring-1 ring-slate-100">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Save your place, keep favorites, and unlock premium stories when you subscribe.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Full name
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                placeholder="Story-loving grownup"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                placeholder="At least 6 characters"
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
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <AuthButtons
            onGoogle={handleGoogle}
            onApple={handleApple}
            loadingProvider={providerLoading}
          />

          <p className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-rose-600 hover:text-rose-700">
              Log in
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

