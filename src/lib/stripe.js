// Frontend helpers for talking to the Stripe backend.
// The backend endpoints are expected to live under /api on your deployed site
// (you can adjust the paths to match your hosting platform).

const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return res.json();
}

export async function startCheckout() {
  // The backend will create a Stripe Checkout session and return a URL.
  const { url } = await postJson('/api/create-checkout-session', {
    returnUrlSuccess: `${siteUrl}/billing/success`,
    returnUrlCancel: `${siteUrl}/billing/cancel`,
  });

  if (url) {
    window.location.href = url;
  }
}

export async function openCustomerPortal() {
  const { url } = await postJson('/api/create-customer-portal', {
    returnUrl: `${siteUrl}/account`,
  });

  if (url) {
    window.location.href = url;
  }
}

