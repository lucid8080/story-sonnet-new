import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-2xl font-black text-slate-900">Password reset</h1>
      <p className="mt-3 text-sm text-slate-600">
        Password reset by email is not wired in this stack yet. Contact support
        or sign in with Google if enabled.
      </p>
      <Link href="/login" className="mt-6 inline-block text-rose-600 hover:underline">
        Back to log in
      </Link>
    </div>
  );
}
