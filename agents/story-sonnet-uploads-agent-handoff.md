# Story Sonnet — Admin uploads tool (agent handoff)

Hand this document to **story-sonnet-agent** (or any automation) so uploads stay aligned with `story-app`. For the full publishing pipeline, see [`story-sonnet-publish-runbook.md`](story-sonnet-publish-runbook.md).

## Purpose

Upload **cover images** (public R2 URL) and **episode audio** (private bucket; returns a **storage key** to paste into story admin). The browser uses **`/admin/uploads`**; the **integration surface** is **`POST /api/upload`** with **`multipart/form-data`**.

## Authentication

- The route calls **`auth()`** and requires **`session.user.role === 'admin'`**.
- **403** if not admin.
- There is **no** separate API key in-repo: automation must run in a context that has an **admin session** (e.g. browser session after login), unless you add a dedicated mechanism later.

## Request: `POST /api/upload`

**Content-Type:** `multipart/form-data`

| Field | Required | Notes |
|--------|----------|--------|
| `file` | Yes | The file body. |
| `assetKind` | No | `cover` (default) or `audio`. |
| `bucket` | No | **Bucket name only** (no `/`, no path). Overrides env default: covers → `R2_BUCKET` / `S3_BUCKET`; audio → `R2_PRIVATE_BUCKET` or fallback `R2_BUCKET`. |
| `storySlug` | No | If set, keys include that story segment. Must match story slug rules (see below). |
| `audioSubPath` | No | **Only for `assetKind=audio`.** Extra path segments under the slug, e.g. `music` or `music/extra`. **Requires `storySlug`** if non-empty. Ignored for covers. |

## How object keys are built

The **leaf name** is always the **sanitized original filename** (characters outside `[a-zA-Z0-9._-]` become `_`). There is **no timestamp** in the key.

**Story slug format** (same as admin story slugs): lowercase letters, numbers, hyphens only — e.g. `the-adventures-of-zubie-and-robo-rex`.

**Audio subpath:** split on `/`; each segment must satisfy the **same** slug-style rules.

### Cover keys

- Without `storySlug`: `covers/<sanitized-filename>`
- With `storySlug`: `covers/<storySlug>/<sanitized-filename>`

### Audio keys

- Without `storySlug` (and no subpath): `audio/<sanitized-filename>`
- With `storySlug`, no subpath: `audio/<storySlug>/<sanitized-filename>`
- With `storySlug` + `audioSubPath` e.g. `music`: `audio/<storySlug>/music/<sanitized-filename>`
- With `audioSubPath` but **no** `storySlug`: **400** — audio subfolder requires a story slug.

**Overwrite:** Uploading again to the **same** key **replaces** the object (normal S3/R2 `PutObject`).

## Successful responses

**Cover (`assetKind=cover`):**

```json
{
  "assetKind": "cover",
  "fileUrl": "https://…",
  "storagePath": "covers/…"
}
```

Use **`fileUrl`** for the story **cover** field in admin.

**Audio (`assetKind=audio`):**

```json
{
  "assetKind": "audio",
  "storageKey": "audio/…",
  "fileUrl": null,
  "message": "…"
}
```

Use **`storageKey`** for the episode **“Private audio key”** (`Episode.audioStorageKey`). Playback still goes through **`GET /api/audio/play`** (presigned URL); the client does not use raw R2 URLs for private MP3s.

## Error responses

- **400** — Missing file/bucket, invalid slug/subpath, or validation from key builder (e.g. key too long).
- **403** — Not admin.
- **500** — Upload/storage failure (message may echo provider text).

## Agent checklist

1. Use **meaningful filenames** (e.g. `episode-02.mp3`, `cover.webp`) — keys are derived from names.
2. Set **`storySlug`** to match the story’s slug in the DB when you want `covers/<slug>/…` or `audio/<slug>/…`.
3. For music vs episode audio, use **`audioSubPath`** (e.g. `music`) **with** `storySlug`.
4. Do **not** put bucket + path in **`bucket`** — only the **bucket name**.
5. After upload, **copy `fileUrl` or `storageKey` into `/admin/stories`** and save; uploads do not link Prisma rows to stories automatically (`Upload` rows are audit-only).

## Code references

| What | Path |
|------|------|
| HTTP route | `src/app/api/upload/route.ts` |
| Key rules | `src/lib/media-upload-keys.ts` |
| Slug pattern | `src/lib/slug.ts` |
| Admin UI | `src/app/admin/uploads/page.tsx` |
| Full publishing | `agents/story-sonnet-publish-runbook.md` |
