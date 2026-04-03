## Story Sonnet – Supabase & Stripe Setup

> **Note (2026):** The app in this repo now targets **Next.js + Prisma + NextAuth + Stripe + S3-compatible storage**. Use [`.env.example`](.env.example), run `npx prisma db push`, and configure Neon (or any Postgres). The sections below describe the **legacy Supabase** layout for reference only.

### 1. Supabase project & auth

- Create a new Supabase project.
- In Supabase **Settings → API**, copy:
  - `Project URL` → `VITE_SUPABASE_URL` and `SUPABASE_URL`
  - `anon public` key → `VITE_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only, never expose to browser).
- In **Authentication → Providers**:
  - Enable **Email** auth.
  - Enable **Google** and configure client ID/secret.
  - Optionally enable **Apple** and configure the provider; the UI is already scaffolded.

### 2. Database schema & RLS

- Install the Supabase CLI and link it to your project (see Supabase docs).
- From the repo root, apply migrations:

```bash
supabase db push
```

- This will create:
  - `profiles` (linked to `auth.users`)
  - `stories`
  - `episodes`
  - `uploads`
  - RLS policies so:
    - Users can read/update their own profile.
    - Public/auth users can read free, published stories/episodes.
    - Subscribed users (profile `subscription_status = 'active'`) can read premium, published content.
    - Admins (`role = 'admin'` on `profiles`) can manage stories/episodes/uploads.
- In the Supabase dashboard, manually mark your own profile as `role = 'admin'` to access `/admin`.

### 3. Storage buckets

In Supabase **Storage → Buckets**, create:

- `covers` – for cover/story images (public bucket).
- `audio` – for MP3 episode audio (public or signed; code assumes public URLs).

Make sure bucket policies allow public `read` and admin `write`. The admin uploads page will write metadata into the `uploads` table and use the bucket public URLs.

### 4. Stripe configuration

- Create a Stripe account (or use test mode).
- In Stripe **Developers → API keys**:
  - Copy your **Secret key** → `STRIPE_SECRET_KEY`.
- In Stripe **Products**:
  - Create a subscription product and a monthly price at **$10/month**.
  - Copy the **Price ID** → `VITE_STRIPE_PRICE_ID`.
- Set `VITE_SITE_URL` to your app base URL:
  - Local dev: `http://localhost:5173`
  - Production: your deployed frontend URL.

### 5. Stripe webhook

- Deploy the backend handlers in `backend/stripe` and `backend/upload.js` to your Node/serverless host
  (for example, Vercel/Netlify/Render). Configure routes:
  - `POST /api/create-checkout-session` → `backend/stripe/create-checkout-session.js`
  - `POST /api/create-customer-portal` → `backend/stripe/create-customer-portal.js`
  - `POST /api/stripe-webhook` (raw body) → `backend/stripe/stripe-webhook.js`
  - `POST /api/upload` → `backend/upload.js`
- In the Stripe dashboard **Developers → Webhooks**:
  - Add an endpoint pointing to your `/api/stripe-webhook` URL.
  - Subscribe to:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
  - Copy the Signing secret → `STRIPE_WEBHOOK_SECRET`.

The webhook will keep `profiles.subscription_status` in sync so the app can gate premium content.

### 6. Environment variables

- Copy `.env.example` to `.env` (for backend) and ensure Vite sees the `VITE_` variables (for frontend).
- For local dev, you can load backend env with a tool like `dotenv` or your hosting provider’s env UI.

### 7. Running locally

- Install dependencies in `story-app`:

```bash
cd story-app
npm install
npm run dev
```

- Run your backend (Node or serverless emulator) so that `/api/*` routes work.
- Verify:
  - `/login`, `/signup`, `/forgot-password`, `/account` work with Supabase auth.
  - `/pricing` creates a Stripe Checkout session and returns to `/billing/success` or `/billing/cancel`.
  - `/admin` is only accessible for profiles with `role = 'admin'`.
  - `/admin/uploads` can upload to the `covers` and `audio` buckets and show recent uploads.
  - Free stories still play normally; premium stories/episodes show a locked overlay and CTA to `/pricing` when not subscribed.

