# Story Sonnet — Admin uploads tool (agent handoff)

Hand this document to **story-sonnet-agent** (or any automation) so uploads stay aligned with `story-app`.

- **Publishing pipeline (keys, save, publish, gotchas):** [`story-sonnet-publish-runbook.md`](story-sonnet-publish-runbook.md)
- **Full route map, Story Studio, CRM, transcripts:** [`story-series-admin-architecture-reference.md`](story-series-admin-architecture-reference.md)

## Purpose

Upload **cover images** (public R2 URL) and **episode audio** (private bucket; returns a **storage key** to paste into story admin). The browser uses **`/admin/uploads`**; the **integration surface** for raw file drops is **`POST /api/upload`** with **`multipart/form-data`**.

## Authentication

- **`POST /api/upload`** and **`GET /api/admin/covers`** call **`auth()`** and require **`session.user.role === 'admin'`**.
- **403** if not admin.
- There is **no** separate API key in-repo: automation must run in a context that has an **admin session** (e.g. browser session after login), unless you add a dedicated mechanism later.

## Cover discovery: `GET /api/admin/covers`

Use this when you need an **existing** public cover URL for **`Story.coverUrl`** without uploading a new file (same behavior as **Browse covers in R2** in `/admin/stories`; see runbook §1).

**Query parameters**

| Parameter | Notes |
|-----------|--------|
| `prefix` | Optional. Must expand to a prefix under **`covers/`** (default listing: **`covers/`**). Invalid or non-`covers/` prefixes → **400**. |
| `maxKeys` | Optional. Page size **1–500**, default **300**. |
| `continuationToken` | Optional. Pass back **`nextContinuationToken`** from the previous response to list the next page. |

**Success (200):** JSON with **`items`**: `{ key, url }[]` for image objects, **`prefix`**, and optional **`nextContinuationToken`** for pagination.

**Errors:** **403** (not admin), **400** (missing bucket config), **503** / **500** (credentials or list failures — see response body).

## Story Studio vs `POST /api/upload`

**Story Studio** narration and theme steps typically write objects **server-side** during generation (`POST /api/admin/story-studio/generate/[step]`, orchestration in `src/lib/story-studio/orchestration/run-step.ts`). Draft assets live on **`StoryStudioGeneratedAsset`** until you **push to library** or run steps that sync to the linked story; then **`Episode.audioStorageKey`** (and related fields) update through the same admin upsert path as manual saves. See the runbook **Agent FAQ** (Story Studio / `librarySync`).

Agents that **only** bulk-upload files from disk should use **`POST /api/upload`**. Agents that **generate** audio should follow the runbook and architecture reference — do not assume every byte goes through multipart `POST /api/upload`.

## Transcripts (FYI)

**`Episode.transcriptLines`** are set via **`PATCH /api/admin/stories/[id]`** (admin payload) or Story Studio push/sync — **not** via `POST /api/upload`.

## Request: `POST /api/upload`

**Content-Type:** `multipart/form-data`

| Field | Required | Notes |
|--------|----------|--------|
| `file` | Yes | The file body. |
| `assetKind` | No | `cover` (default) or `audio`. |
| `bucket` | No | **Bucket name only** (no `/`, no path). Overrides env default: covers → `R2_BUCKET` / `S3_BUCKET`; audio → `R2_PRIVATE_BUCKET` or fallback `R2_BUCKET`. |
| `storySlug` | No | If set, keys include that story segment. Must match story slug rules (see below). **Also changes leaf filename behavior** (see “How object keys are built”). |
| `audioSubPath` | No | **Only for `assetKind=audio`.** Extra path segments under the slug, e.g. `music` or `music/extra`. **Requires `storySlug`** if non-empty. Ignored for covers. |

## How object keys are built

**Sanitization:** The upload pipeline first derives a **safe base name** from the original filename: characters outside `[a-zA-Z0-9._-]` become `_` (`sanitizeUploadFileName` in `src/lib/media-upload-keys.ts`).

**When `storySlug` is omitted (empty):** the object **leaf** is exactly that **sanitized base name** (no extra token). Re-uploading the **same** filename → **same** key → **overwrites** the object (`PutObject`).

**When `storySlug` is set:** the server applies **`makeUniqueSafeFileName`**: a **short random token** is inserted before the extension (e.g. `cover-abc123def456.webp`). Each upload gets a **new** key under `covers/<slug>/…` or `audio/<slug>/…`, so repeat uploads **do not** overwrite prior objects by filename alone — intentional collision avoidance.

There is **no wall-clock timestamp** in the key; the token is random UUID material when `storySlug` is present.

**Story slug format** (same as admin story slugs): lowercase letters, numbers, hyphens only — e.g. `the-adventures-of-zubie-and-robo-rex`.

**Audio subpath:** split on `/`; each segment must satisfy the **same** slug-style rules.

### Cover keys

- Without `storySlug`: `covers/<sanitized-filename>`
- With `storySlug`: `covers/<storySlug>/<leaf>` where `<leaf>` is **`makeUniqueSafeFileName(sanitized base)`** (random token before the extension; see `src/lib/media-upload-keys.ts`)

### Audio keys

- Without `storySlug` (and no subpath): `audio/<sanitized-filename>`
- With `storySlug`, no subpath: `audio/<storySlug>/<leaf>` (same `<leaf>` rule as covers)
- With `storySlug` + `audioSubPath` e.g. `music`: `audio/<storySlug>/music/<leaf>`
- With `audioSubPath` but **no** `storySlug`: **400** — audio subfolder requires a story slug.

**Overwrite summary:** Stable overwrite behavior applies when **`storySlug` is omitted** and you reuse the same sanitized filename. When **`storySlug` is set**, expect a **new** leaf name each request unless you control keys outside this API.

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
  "durationSeconds": 123,
  "fileUrl": null,
  "message": "…"
}
```

- **`storageKey`** → episode **“Private audio key”** (`Episode.audioStorageKey`). Playback still goes through **`GET /api/audio/play`** (presigned URL); the client does not use raw R2 URLs for private MP3s.
- **`durationSeconds`:** `number | null` — seconds from audio metadata when parseable; use to fill admin duration fields or downstream scripts; **`null`** if metadata is missing or unreadable.

## Error responses

- **400** — Missing file/bucket, invalid slug/subpath, or validation from key builder (e.g. key too long).
- **403** — Not admin.
- **500** — Upload/storage failure (message may echo provider text).

## Agent checklist

1. Use **meaningful filenames** (e.g. `episode-02.mp3`, `cover.webp`) — they feed the sanitized base name (and human audit in `Upload` rows).
2. Set **`storySlug`** when you want keys under `covers/<slug>/…` or `audio/<slug>/…`; remember the server **appends a random token** to the leaf when `storySlug` is set — do not assume the raw filename appears verbatim in the key.
3. For **stable overwrite** of the same object key (e.g. replace `audio/theme.mp3` in place), omit **`storySlug`** (and subpath) so the leaf stays a fixed sanitized name — or delete/replace objects out of band in R2.
4. For music vs episode audio under a story, use **`audioSubPath`** (e.g. `music`) **with** `storySlug`.
5. Do **not** put bucket + path in **`bucket`** — only the **bucket name**.
6. After **`POST /api/upload`**, copy **`fileUrl`** or **`storageKey`** into **`/admin/stories`** and save; uploads do not link Prisma rows to stories automatically (`Upload` rows are audit-only).
7. Use **`GET /api/admin/covers`** with **`continuationToken`** when listing more than one page of cover objects.
8. Read **`durationSeconds`** from the audio upload JSON when automating duration fields; handle **`null`**.

## Code references

| What | Path |
|------|------|
| HTTP upload route | `src/app/api/upload/route.ts` |
| Cover list route | `src/app/api/admin/covers/route.ts` |
| Key rules | `src/lib/media-upload-keys.ts` |
| Slug pattern | `src/lib/slug.ts` |
| Admin UI | `src/app/admin/uploads/page.tsx` |
| Full publishing | `agents/story-sonnet-publish-runbook.md` |
| Site / admin map | `agents/story-series-admin-architecture-reference.md` |
