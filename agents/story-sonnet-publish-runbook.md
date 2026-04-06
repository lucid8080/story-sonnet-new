# Story Sonnet — publish & media runbook

Handoff for posting new Story Sonnet media/content. Aligned with the `story-app` codebase (e.g. [lucid8080/story-sonnet-new](https://github.com/lucid8080/story-sonnet-new)); re-verify after pull if remote diverged.

---

## Agent FAQ (quick reference)

**How do I add or upload audio episodes?**  
Still **`/admin/uploads`**: choose **audio**, optionally set **story slug** and **audio subfolder** (e.g. `music`), upload → `POST /api/upload` returns **`storageKey`**. Keys use the **sanitized filename only** (no timestamp), e.g. `audio/<slug>/episode-01.mp3` or `audio/<slug>/music/theme.mp3`. Re-uploading the same path **overwrites** the object. Paste **`storageKey`** into the episode **“Private audio key”** in **`/admin/stories`**, **Save**, then set **`isPublished`** on the story and each episode that should be public. The browser flow goes through the admin UI; the API is the integration point (agents send the same `FormData` fields).

**Is audio uploaded directly to S3/R2, or only via admin?**  
Normal path is **admin UI → server → S3-compatible API** (`@aws-sdk/client-s3`, `PutObject` in `src/lib/s3.ts`). Covers get a public **`fileUrl`**; private episode files get a **key** stored as **`Episode.audioStorageKey`**. Optional **`Upload`** rows are audit metadata only. Playback uses **signed URLs** from **`/api/audio/play`**, not raw keys on the client.

**Where is episode metadata stored — `content/` markdown or the database?**  
**PostgreSQL via Prisma** (`Story`, `Episode`) is the **runtime source of truth** for the site. The **`content/`** tree holds editorial/production markdown (scripts, TTS inputs); it is not what Next.js uses for listing or saving episodes. Legacy/catalog audio can still merge from **`src/data.js`** when **`audioStorageKey`** is empty (`mergeCatalogPublicAudioIntoDbApp`).

---

## 1. POSTING SURFACE MAP

**Cover image**

- UI: `src/app/admin/uploads/page.tsx` → `fetch('/api/upload', { POST, FormData })`, default `assetKind` = cover; optional `storySlug` for `covers/<slug>/<sanitized-filename>`.
- API: `POST` `src/app/api/upload/route.ts` → `uploadPublicObject` in `src/lib/s3.ts` (keys from `src/lib/media-upload-keys.ts`, e.g. `covers/<file>` or `covers/<slug>/<file>` — **sanitized filename only, no timestamp**; repeat upload **overwrites**).
- Link to story: `src/components/admin/stories/StoryBasicsSection.tsx` (cover URL field) → save path below.

**Audio file**

- Same uploads page + `FormData` field `assetKind=audio`; optional `storySlug`, optional `audioSubPath` (e.g. `music` or `music/extra`) — requires slug when subpath is set.
- Same `src/app/api/upload/route.ts` → `uploadPrivateAudioObject` (e.g. `audio/<file>`, `audio/<slug>/<file>`, or `audio/<slug>/music/<file>`).
- Link to episode: `src/components/admin/stories/StoryEpisodesSection.tsx` (“Private audio key” / `audioUrl`).

**Create / edit story + episodes**

- UI: `src/app/admin/stories/page.tsx` → `StorySeriesAdminClient` → `StoryEditor`.
- New draft: `StorySeriesAdminClient.handleAddStory` → `POST /api/admin/stories` → `createDraftStory` in `src/lib/stories.ts`.
- Save: `StoryEditor.onSave` → `formToAdminUpsertPayload` (`src/lib/admin/story-mappers.ts`) → `PATCH /api/admin/stories/[id]/route.ts` → `adminStoryUpsertSchema.safeParse` → `upsertStoryFromAdmin` + `syncEpisodesForStory` in `src/lib/stories.ts`.
- Duplicate / delete: `POST` / `DELETE` same `[id]` tree + `src/app/api/admin/stories/[id]/duplicate/route.ts`.

**Live on site**

- Listing / story page: `fetchStories()` / `fetchStoryBySlug()` in `src/lib/stories.ts` (default `visibility: 'public'` — published story + published episodes only). Admin uses `fetchStories({ visibility: 'all' })` in `src/app/admin/stories/page.tsx`.
- Playback: `src/app/api/audio/play/route.ts`; signed private audio via `presignPrivateAudioGetUrl` in `src/lib/s3.ts`. Theme: `src/app/api/theme-audio/play/route.ts`.
- Player wiring: `storyToPlayerPayload` in `src/lib/stories.ts` + `src/app/story/[slug]/page.tsx` → `StoryPageClient`.

---

## 2. REQUIRED DATA

**Story (admin PATCH body, `adminStoryUpsertSchema`)**

- Required: `slug` (regex lowercase slug), `title`, `seriesTitle`, `summary`, `ageRange` (enum from filters), `isSeries`.
- Publish: `isPublished` (default false in schema). Optional: `publishedAt`.
- Media: `coverUrl` optional string (public URL after upload).
- Ordering / discovery: `sortPriority`, `popularityScore` (defaults exist).
- Episodes: `episodes` array (can default empty).

**Episode (`adminEpisodeSchema`, each row in `episodes`)**

- Required: `id` (non-empty string), `episodeNumber` (int ≥ 1), `title`.
- Optional: `slug` (unique per story if set), `audioUrl`, `audioStorageKey`, `summary`, durations, `label`.
- Publish: `isPublished` (default false). Premium: `isPremium`, `isFreePreview`.

**Upload / media**

- `Upload` model (Prisma): `fileName`, `fileType`, `fileUrl`, `storagePath`, optional `uploadedBy` — **audit only**; not FK’d to `Story`/`Episode`.
- Cover: persist **`Story.coverUrl`** = public `fileUrl` from upload response.
- Audio: persist **`Episode.audioStorageKey`** = `storageKey` from upload response (private bucket). `audioUrl` is alternate public/legacy path.

**Public playback**

- Story and episode **`isPublished` true**; subscription rules in `src/lib/audioEntitlement.ts` + `canPlayEpisode` usage in `src/app/api/audio/play/route.ts`.
- DB-backed episodes: client uses **`/api/audio/play`** (signed URL), not raw `audioStorageKey` on the client (`storyToPlayerPayload`).

---

## 3. REAL WRITE FLOW

1. **Admin** (`src/app/admin/layout.tsx`): `auth()` → `session.user.role === 'admin'` or redirect.
2. **Upload**: `POST src/app/api/upload/route.ts` — `auth()`, admin role, `FormData` → S3/R2 put → optional `prisma.upload.create` → JSON (`fileUrl` or `storageKey`).
3. **Story save**: `PATCH src/app/api/admin/stories/[id]/route.ts` — `auth()`, admin role, `adminStoryUpsertSchema`, `upsertStoryFromAdmin(existingKey, input)`.
4. **DB**: Prisma transaction — `story.update`/`create` + `syncEpisodesForStory` (create/update/delete episodes by numeric `ep.id` presence).
5. **Storage**: No story PATCH to R2; files already uploaded; DB stores URL/key strings.
6. **Public read**: `fetchStories` / `fetchStoryBySlug` (public visibility) → `src/app/page.tsx`, `src/app/library/page.tsx`, `src/app/story/[slug]/page.tsx`. Playback hits `GET src/app/api/audio/play/route.ts`.

**Validation**: Zod in `src/lib/validation/storySchema.ts` on PATCH; upload route checks file + bucket + admin + optional slug/subpath (`src/lib/media-upload-keys.ts`).

---

## 4. SMALLEST WORKING PROCEDURE

1. Log in as user with **`profiles.role = 'admin'`**. Ensure **`DATABASE_URL`** and R2/S3 env vars (`src/lib/s3.ts` / `.env.example`).
2. **Cover**: `/admin/uploads` → optionally set **story slug** → choose file (meaningful name; same path overwrites) → copy **`fileUrl`** → `/admin/stories` → story → cover field → **Save** (`StoryEditor` → `PATCH .../api/admin/stories/<patchKey>`).
3. **Audio**: uploads → set kind **audio** → optional **story slug** / **audio subfolder** → copy **`storageKey`** → episode row **Private audio key** → **Save** (same PATCH).
4. **Publish**: Discovery / episodes UI → turn **`isPublished`** on for story and each episode that should play → **Save**.
5. Confirm: open `/story/<slug>` as anonymous (or non-admin); audio should load via **`/api/audio/play`**.

---

## 5. GOTCHAS

- **`syncEpisodesForStory`**: final `episodeNumber` is **1-based index in the `episodes` array**, not the client’s `episodeNumber` field — reorder array = reorder DB episodes.
- **Cover vs audio**: cover = **public URL** on `Story.coverUrl`; private MP3 = **`audioStorageKey`** only (plus optional public `audioUrl`).
- **`mergeCatalogPublicAudioIntoDbApp`** (`src/lib/stories.ts`): if `audioStorageKey` is empty, catalog audio from `src/data.js` can fill `audioSrc` for matching slugs — can mask missing private uploads.
- **Visibility**: default **`fetchStories` / `fetchStoryBySlug` = `public`** — drafts hidden from site; admin page passes **`visibility: 'all'`**.
- **Auth**: upload and admin story routes require **`session.user.role === 'admin'`** (not only layout).
- **Cache**: no `revalidatePath`/`revalidateTag` in repo; **`router.refresh()`** on admin after save only.
- **New story not in `src/data.js`**: `POST /api/admin/stories` for draft; first saves use numeric **`patchKey`** from response; **`upsertStoryFromAdmin`** rejects unknown non-catalog keys until a valid draft/catalog key exists.
- **`next/image`**: remote cover hosts must be allowed in `next.config.ts` (`remotePatterns`).
- **Upload keys**: object paths use the **sanitized upload filename** only (no timestamp). Same bucket key + filename → **overwrite**. **Bucket override** field must be the bucket **name** only (no `/`). Optional **`storySlug`** / **`audioSubPath`** form fields shape keys under `covers/…` and `audio/…`.

---

## 6. TOP 10 FILES

1. `src/lib/stories.ts` — `fetchStories`, `fetchStoryBySlug`, `upsertStoryFromAdmin`, `syncEpisodesForStory`, `storyToPlayerPayload`
2. `prisma/schema.prisma` — `Story`, `Episode`, `Upload`, `Profile`
3. `src/lib/validation/storySchema.ts` — `adminStoryUpsertSchema`, `adminEpisodeSchema`
4. `src/app/api/admin/stories/[id]/route.ts` — PATCH/DELETE
5. `src/app/api/upload/route.ts` — POST upload
6. `src/lib/s3.ts` — upload + presign
7. `src/lib/admin/story-mappers.ts` — `formToAdminUpsertPayload`
8. `src/components/admin/stories/StoryEditor.tsx` — save / PATCH wiring
9. `src/app/api/audio/play/route.ts` — publish + entitlement + presign
10. `src/app/admin/uploads/page.tsx` — `assetKind`, bucket UX
