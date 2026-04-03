'use client';

async function postJson(path: string, body: object) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}

export type CheckoutInterval = 'month' | 'year';

export async function startCheckout(options?: { interval?: CheckoutInterval }) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const interval =
    options?.interval === 'year' ? 'year' : 'month';
  const { url } = await postJson('/api/stripe/checkout', {
    returnUrlSuccess: `${base}/billing/success`,
    returnUrlCancel: `${base}/billing/cancel`,
    interval,
  });
  if (url) window.location.href = url;
}

export async function openCustomerPortal() {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const { url } = await postJson('/api/stripe/portal', {
    returnUrl: `${base}/account`,
  });
  if (url) window.location.href = url;
}
