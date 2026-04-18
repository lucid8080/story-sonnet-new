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

**Story Studio: I narrated an episode but `/admin/stories` does not show the private audio key.**  
TTS uploads MP3s and stores keys on the draft (`StoryStudioGeneratedAsset`). The library **`Episode.audioStorageKey`** is updated when the draft is pushed/synced to the linked story. Use **Push to story library** once to create the **`Story`** and set **`linkedStoryId`**; after that, **`POST /api/admin/story-studio/generate/tts`** (and a full **`package`** run that includes audio) automatically runs the same **`draftToAdminUpsertInput` → `upsertStoryFromAdmin`** path so episode keys appear under Story Library without a second manual push. The JSON response may include **`librarySync`**: **`{ ok: true }`**, **`{ ok: true, skipped: true }`** when there is no linked story yet, or **`{ ok: false, message }`** if the sync step failed (narration file may still exist in storage).

**How do I pick an existing cover image from R2 without pasting a URL by hand?**  
In **`/admin/stories`** → open a story → **Basic info** → **Browse covers in R2**. That loads a thumbnail grid from **`GET /api/admin/covers`** (admin-only, `ListObjectsV2` on the public bucket under `covers/…`, paginated). Pick a tile to set **`coverUrl`**; scope can be **all covers** or **this story’s folder** when the slug is valid. Same R2/S3 credentials and public base URL expectations as **`POST /api/upload`** (see `src/lib/s3.ts`).

**Cover images: WebP display vs original on R2**  
**`POST /api/upload`** (cover, blog image, spotlight badge) stores the **original** bytes at the requested key and a compressed **`_display.webp`** sidecar next to it (same basename + `_display.webp`). The JSON **`fileUrl`** is always the **display WebP** URL to paste into **`Story.coverUrl`** / blog fields so the site does not rely on Vercel Image Optimization. **`originalFileUrl`** / **`originalStoragePath`** point at the untouched upload. **`Upload`** audit rows may include two lines (original + display). Story Studio generated covers follow the same pattern; see **`metadata.originalPublicUrl`** on **`StoryStudioGeneratedAsset`**. Local static fallbacks: run **`npm run optimize:public-images`** to generate **`{base}_display.webp`** from PNG/JPEG under **`public/`**, then reference those paths (e.g. in **`src/data.js`**). Optional backfill for old DB rows: fetch each **`coverUrl`** from R2, re-upload **`_display.webp`**, **`UPDATE`** to the new URL (idempotent if the key already ends with **`_display.webp`**).

**What is Content Calendar / spotlights?**  
Admin lives at **`/admin/content-calendar`**: month view, **Spotlights** (holiday / awareness / seasonal collections), **Badge assets** (reusable PNGs), and settings. Spotlights attach to **`Story`** rows, optional **PNG badge** on cover art (corner set per spotlight via **`badgeCorner`**: bottom-right / bottom-left / top-right / top-left; default bottom-right), optional **info bar** on **`/story/[slug]`**, and optional **featured rails** above the homepage and library grids. **Badge uploads** use the same **`POST /api/upload`** as covers, with **`assetKind=spotlight_badge`** (PNG-only, max 1MB); objects land under **`spotlight-badges/`** in the public bucket. Register a row via **`POST /api/admin/content-calendar/badge-assets`** after upload so spotlights can reference **`badgeAssetId`**. Public rendering uses **`src/lib/content-spotlight/resolve.ts`** (active + published + in-window; priority tie-break).

**Prisma Migrate on Neon shows P1002 (advisory lock timeout) — what do I do?**  
Set **`DIRECT_DATABASE_URL`** in `.env` to Neon’s **direct** (non-pooler) Postgres URL (host **without** `-pooler`). `prisma/schema.prisma` uses **`directUrl = env("DIRECT_DATABASE_URL")`** so **`migrate deploy` / `migrate dev`** use that connection while the app keeps using pooled **`DATABASE_URL`**. On local Postgres, set **`DIRECT_DATABASE_URL`** to the **same** string as **`DATABASE_URL`**. The repo’s **`npm run db:migrate`** runs **`scripts/prisma-env.mjs`**, which **falls back** to copying **`DATABASE_URL`** when **`DIRECT_DATABASE_URL`** is unset (enough for local Postgres; **Neon production should still set a real direct URL**). If P1002 persists, ensure no other migrate/studio/CI job is running and check Neon for stuck sessions.

**Migrate says P3009 (failed migration) — what do I do?**  
Prisma recorded **`20260413100000_content_calendar_spotlights`** as **failed** in **`_prisma_migrations`**, so **`migrate deploy`** will not run anything else until you fix that row.

1. In **Neon → SQL Editor** (branch **Primary**, DB **neondb**), run:

```sql
-- Did spotlight tables get created?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'content_spotlights'
) AS content_spotlights_exists;

SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name = '20260413100000_content_calendar_spotlights';
```

2. **If `content_spotlights_exists` is `false`** (nothing was created): mark the migration as rolled back, then deploy again:

```bash
npm run db:migrate:resolve:content-calendar-rolled-back
npm run db:migrate
```

3. **If `content_spotlights_exists` is `true`** (tables are there): mark the migration as applied so Prisma’s history matches the DB:

```bash
npm run db:migrate:resolve:content-calendar-applied
```

4. If **`content_spotlights_exists` is `true` but something is half-broken** (e.g. enums missing), fix manually in SQL or restore from backup before using **`--applied`**.

More detail: [Prisma — production troubleshooting / resolve](https://www.prisma.io/docs/guides/migrate/production-troubleshooting).

---

## 1. POSTING SURFACE MAP

**Cover image**

- UI: `src/app/admin/uploads/page.tsx` → `fetch('/api/upload', { POST, FormData })`, default `assetKind` = cover; optional `storySlug` for `covers/<slug>/<sanitized-filename>`.
- API: `POST` `src/app/api/upload/route.ts` → `uploadOriginalPlusDisplayWebp` (`src/lib/images/dualPublicImageUpload.ts`) + `src/lib/s3.ts` `uploadPublicObject` (keys from `src/lib/media-upload-keys.ts`, e.g. `covers/<file>` or `covers/<slug>/<file>` — **sanitized filename only, no timestamp**; repeat upload **overwrites**). Response **`fileUrl`** is the **`_display.webp`** URL; original is **`originalFileUrl`**.
- Link to story: `src/components/admin/stories/StoryBasicsSection.tsx` (cover URL field, optional **Browse covers in R2** gallery) → save path below.
- Browse existing covers: `GET` `src/app/api/admin/covers/route.ts` → lists image objects under `covers/` (query `prefix`, `continuationToken`, `maxKeys`); responses use `publicUrlForObjectKey` in `src/lib/s3.ts` so URLs match upload output.

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
- Optional: `slug` (unique per story if set), `audioUrl`, `audioStorageKey`, `summary`, durations, `label`, `transcriptLines` (array of `{ id, text }` for the scrolling reader; Story Studio push sets this from script text).
- Publish: `isPublished` (default false). Premium: `isPremium`, `isFreePreview`.

**Upload / media**

- `Upload` model (Prisma): `fileName`, `fileType`, `fileUrl`, `storagePath`, optional `uploadedBy` — **audit only**; not FK’d to `Story`/`Episode`.
- Cover: persist **`Story.coverUrl`** = public **`fileUrl`** from upload response (WebP display URL; original is separate on R2).
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

---

## 7. STORY STUDIO (ADMIN GENERATION)

**UI:** `/admin/story-studio` — guided presets, LLM brief/script via OpenRouter, optional cover (image API), theme (Suno stub + ffmpeg intro trim), narration (ElevenLabs). **Push to library** once to create/link the library story; further narration syncs **`Episode.audioStorageKey`** automatically when the draft is already linked (`syncLinkedLibraryFromDraft` after TTS).

**Draft list:** `GET /api/admin/story-studio/drafts` returns **`linkedDrafts`** (drafts with a library story link, capped at 500) and **`recentDrafts`** (unlinked only, 100 most recently updated). The landing page shows both sections so linked work does not fall off the unlinked “recent” cap. **`DELETE /api/admin/story-studio/drafts/[id]`** removes the draft row by default. Optional JSON body **`{ "deleteLinkedStory": true }`** also deletes the linked **`Story`** (same behavior as **`DELETE /api/admin/stories/[id]`**): prefix-delete objects under **`covers/<slug>/`** and **`audio/<slug>/`** in R2/S3, then remove the DB row, then remove the draft.

**Deleting a library story:** **`DELETE /api/admin/stories/[id]`** (Story Library admin) deletes all objects under **`covers/<slug>/`** (default public bucket) and **`audio/<slug>/`** (private audio bucket) for that story’s slug, then deletes the **`Story`** row. Requires S3-compatible credentials with **`s3:ListBucket`** (prefix) and **`s3:DeleteObject`**. Does not delete Story Studio draft-only paths such as **`covers/studio-draft-<draftId>/…`**.

**Length limits:** Draft **`request.targetLengthRange`** is one of `2-3`, `3-4`, or `4-5` (minutes). Each generated episode **`scriptText`** is capped at **4950** characters. LLM brief/script **`estimatedRuntimeMinutes`** is validated to **≤ 5**.

**Persistence:** Postgres models `StoryStudioPreset`, `StoryStudioDraft`, `StoryStudioDraftEpisode`, `StoryStudioGeneratedAsset`, `StoryStudioGenerationJob`, and singleton **`StoryStudioSettings`** (global row) for optional **art style prompt overrides** JSON (`art_style_prompt_overrides_json`). Seed presets: `npm run db:seed`.

**Art style presets:** Built-in labels and default illustrator copy live in `src/lib/story-studio/art-style-options.ts`. Admins can customize per-chip prompt text from Story Studio (**Customize art style preset prompts**). **`GET` / `PATCH /api/admin/story-studio/settings`** loads or saves overrides; brief, script, cover, and add-episode generation merge overrides with those defaults.

**Draft slug (R2 paths):** When the **brief** or **script** step persists a generated title, **`StoryStudioDraft.slug`** is updated with `draftSlugFromTitle` (`src/lib/story-studio/draft-slug-from-title.ts`) so TTS and other keys can use `audio/<slug>/…` instead of staying on `untitled-draft`. **Cover image generation** stores public objects under **`covers/studio-draft-<draftId>/…`** (per-draft id) so multiple drafts that still share a placeholder slug do not overwrite the same file. Re-running **brief** or **script** resets the slug from that step’s title. **Unique leaf names:** generated covers and TTS episode files use **`makeUniqueSafeFileName`** (`src/lib/media-upload-keys.ts`) so each run gets a distinct object key; **`POST /api/upload`** does the same when **`storySlug`** is set. **Theme** steps keep fixed **`theme.mp3`** paths under `music/full_song` and `music/Intro_song` for **`themeAudioUrls.ts`** compatibility.

**Push / library sync:** `POST /api/admin/story-studio/push-to-library` builds `AdminStoryUpsertInput` (`draftToAdminUpsertInput`) and calls **`upsertStoryFromAdmin`** — same contract as **`PATCH /api/admin/stories/[id]`**. If the draft has no **`linkedStoryId`**, push creates the **`Story`** row and links it. When the draft is already linked, **`POST /api/admin/story-studio/generate/tts`** (and **`package`** with **`generateAudio`**) invokes the same mapping via **`syncLinkedLibraryFromDraft`** (`src/lib/story-studio/sync-linked-library-from-draft.ts`) so new narration keys land on **`Episode.audioStorageKey`** without requiring an extra push. Episode audio uses **`audioStorageKey`**; cover uses public **`coverUrl`**; theme objects follow **`src/lib/themeAudioUrls.ts`** when uploaded under `audio/<slug>/music/Intro_song/theme.mp3` and `.../full_song/theme.mp3`.

**Scrolling transcripts (Story Studio):** On each push, episode **`script_package.episodes[n].scriptText`** is converted to **`Episode.transcript_lines`** (JSON array of `{ id, text }` lines). Bracket expression tags such as **`[narrator warmly]`** are stripped; the story player prefers DB transcript lines over legacy static files in **`content/.../transcript-lines.json`**. Admin **`PATCH`** episodes without **`transcriptLines`** leaves existing DB transcript data unchanged.

**Backfill (existing linked drafts):** After deploy/migrate, run once against the target database: **`npm run backfill:episode-transcripts`** (requires **`DATABASE_URL`**). This reads each linked draft’s **`script_package`** and updates matching **`episodes`** rows by **`story_id`** + **`episode_number`**.

**Env (server-only):** see `.env.example` — `OPENROUTER_*`, `ELEVENLABS_*`, `SUNO_*`, and `STORY_STUDIO_IMAGE_API_KEY`, `STORY_STUDIO_IMAGE_MODEL`, `STORY_STUDIO_IMAGE_API_URL` (OpenRouter `/api/v1/chat/completions` for image-capable models), optional `FFMPEG_PATH` for intro trim.

---

## 8. CONTENT CALENDAR (SPOTLIGHTS)

**Neon migrations:** Set **`DIRECT_DATABASE_URL`** (see Agent FAQ) before **`npx prisma migrate deploy`** so migrations do not hit **P1002** on the pooler.

**Admin UI:** `/admin/content-calendar` — calendar month grid, spotlight CRUD (`/spotlights`, `/spotlights/new`, `/spotlights/[id]/edit`), badge asset library, placements explainer, preview links, JSON settings singleton (`content_calendar_settings`).

**Models (Prisma):** `ContentSpotlight` (includes **`badgeCorner`** / `ContentSpotlightBadgeCorner`), `ContentSpotlightStory`, `BadgeAsset`, `ContentCalendarSetting` — see `prisma/schema.prisma`.

**APIs (admin, `session.user.role === admin`):** `GET/POST /api/admin/content-calendar/spotlights`, `GET/PATCH/DELETE /api/admin/content-calendar/spotlights/[id]`, duplicate/pause/resume/publish subroutes, `GET /api/admin/content-calendar/month`, `GET /api/admin/content-calendar/stories/search`, `GET/POST /api/admin/content-calendar/badge-assets`, `GET/PATCH /api/admin/content-calendar/settings`.

**Badge PNG upload:** `POST /api/upload` with `FormData`: `file`, **`assetKind=spotlight_badge`**. Server validates PNG signature and size (≤ 1MB), stores under **`spotlight-badges/…`**. Then **`POST /api/admin/content-calendar/badge-assets`** with `{ name, publicUrl, storagePath, altText, … }` so spotlights can set **`badgeAssetId`**.

**Public resolution:** `src/lib/content-spotlight/resolve.ts` — homepage/library rails and per-story badge use **`publishedAt`**, status **`active`/`scheduled`**, effective date window (supports **`recurring_yearly`** via `src/lib/content-spotlight/window.ts` + spotlight **`timezone`**). One winning badge per cover: highest **`priority`**, then newest **`updatedAt`**.

**Seed:** `prisma/seed.mjs` creates sample spotlights when published stories exist (`npm run db:seed`).
