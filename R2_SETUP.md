## Cloudflare R2 setup for audio & cover art

This app expects MP3s and cover images to be hosted on Cloudflare R2 (or any static HTTP origin) behind a CDN.

### 1. Create an R2 bucket and public domain

1. In the Cloudflare dashboard, go to **R2 → Buckets → Create bucket**.
2. Name it something like `story-sonnet-assets` and pick a region close to your users.
3. Under the bucket, create a **Public access** / **Custom domain**:
   - Attach a subdomain (for example `assets.your-domain.com`) to the bucket.
   - After DNS is active, you should be able to hit:  
     `https://assets.your-domain.com/` in a browser.

You will upload files to paths under this bucket, for example:

- `audio/nori-and-the-pocket-meadow/episode-1.mp3`
- `covers/nori-and-the-pocket-meadow/cover.png`

### 2. Configure environment variable

In your local `.env` (not committed), add:

```bash
NEXT_PUBLIC_ASSETS_BASE_URL=https://assets.your-domain.com
```

Notes:

- Do **not** include a trailing slash.
- In development, you can point this at any HTTP server that serves the same folder structure (even your local dev server).

### 3. Upload initial media to R2

From your current project:

- Audio files should live in R2 at paths matching the `audioSrc` entries in `src/data.js`, for example:
  - `audio/nori-and-the-pocket-meadow/episode-1.mp3`
  - `audio/juniper-and-the-lantern-library/episode-1.mp3`
- Cover files should live at:
  - `covers/nori-and-the-pocket-meadow/cover.png`
  - `covers/juniper-and-the-lantern-library/cover.png`
  - `covers/the-secret-map-of-the-7641-islands/cover.webp`
  - `covers/pip-and-the-moonlight-mailbox/cover.webp`
  - `covers/blocky-explores-mine-world/cover.webp`

You can upload via:

- Cloudflare dashboard → R2 → your bucket → **Upload**.
- Or any S3-compatible client pointed at the R2 endpoint.

### 4. How the app builds URLs

The frontend will build URLs like:

```text
${NEXT_PUBLIC_ASSETS_BASE_URL}/audio/…      # for MP3 (legacy public paths)
${NEXT_PUBLIC_ASSETS_BASE_URL}/covers/…     # for cover art
```

So once:

- The env var is set, and
- Files are uploaded to matching paths in the bucket,

your site will stream MP3s and load cover art directly from Cloudflare R2.

### 5. CORS for browser audio uploads (required on production)

Admin **Upload MP3** uses a **presigned PUT** from the browser straight to the **private** audio bucket (`R2_PRIVATE_BUCKET`, or `R2_BUCKET` if unset). That bypasses Vercel’s **4.5MB** function body limit (HTTP **413**).

On the **private** bucket (Cloudflare → R2 → bucket → **Settings** → **CORS policy**), allow your site origins. Example:

```json
[
  {
    "AllowedOrigins": [
      "https://story-sonnet-new.vercel.app",
      "https://YOUR-CUSTOM-DOMAIN.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Without this, the UI may show **Direct R2 upload failed (403)** (or a browser CORS error) after the 413 fix is deployed.

Presign API: `POST /api/admin/audio/presign` (admin session) → `{ uploadUrl, storageKey, contentType }`. Client PUTs the file bytes to `uploadUrl` with that `Content-Type`.

