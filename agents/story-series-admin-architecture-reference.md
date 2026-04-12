# Story series & admin architecture — reference

Reusable context for designing **admin tools** (story-series editor, Story Studio generation, CRM). Grounded in the `story-app` codebase. Re-verify after major refactors; Prisma and routes are authoritative.

**Related:** [`story-sonnet-publish-runbook.md`](story-sonnet-publish-runbook.md) for publish/upload flows, R2 keys, `syncEpisodesForStory` gotchas, and **Story Studio → library** behavior (`push-to-library`, linked story, optional `librarySync` after generation steps).

---

## 1. How “story series” are modeled

There is **no separate `Series` table**. A series is:

- One **`Story`** row with `isSeries: true` (and `seriesTitle`, tagline, etc.).
- Multiple **`Episode`** rows with `storyId` pointing at that story.

User engagement (likes, saves, comments, ratings) is keyed by **`storySlug`**, not numeric id — be careful if slugs change.

**Story Studio:** a draft may optionally link to a live catalog row via **`StoryStudioDraft.linkedStoryId`**. Pushing/syncing from Story Studio updates that story’s episodes (including **`audioStorageKey`** and **`transcriptLines`**) through the same admin upsert path as manual saves — see the runbook FAQ.

---

## 2. Data model (Prisma)

Full definitions: [`prisma/schema.prisma`](prisma/schema.prisma).

### `Story` (high level)

- **Identity / listing:** `slug` (unique), `seriesTitle`, `title`, `subtitle`, `summary`, `fullDescription`
- **Discovery:** `ageGroup`, `ageRange`, `durationLabel`, `durationMinutes`, `durationBucket`, `genre`, `mood`, `topics` (JSON), `characterTags` (JSON), `universe`, `readingLevel`, `seriesTagline`
- **Media:** `coverUrl` (public URL), `accent`
- **Card overrides:** `cardTitleOverride`, `cardDescriptionOverride`, `badgeLabelOverride`
- **Ranking / SEO:** `popularityScore`, `sortPriority`, `metaTitle`, `metaDescription`
- **Publishing:** `publishedAt`, `isFeatured`, `isPublished`, `isPremium`, `isSeries`
- **Relations:** `episodes`, `studioDrafts` (Story Studio drafts linked to this story)

### `Episode`

- **Keys:** `storyId`, `episodeNumber` (unique per story), optional `slug` (unique per story)
- **Content:** `title`, `label`, `description`
- **Audio:** `audioUrl` (legacy/public), **`audioStorageKey`** (private R2 key, no leading slash)
- **Timing:** `duration`, `durationSeconds` (often from audio metadata)
- **Flags:** `isPublished`, `isPremium`, `isFreePreview`
- **Transcript:** **`transcriptLines`** (JSON array of `{ id: string | number; text: string }`) for scrolling transcript in the player / admin; optional on admin PATCH; Story Studio push can populate from script text

### Customer / admin CRM

- **`Profile`** (1:1 with `User`): subscription fields (`subscriptionStatus`, `subscriptionPlan`, `stripeCustomerId`), **`creditBalance`**, engagement/risk flags (`totalEngagementCount`, `riskLevel`, `isVip`, `isFlagged`, …), compliance-oriented fields, internal `internalTags` (JSON)
- **`CustomerCreditLedger`**, **`CustomerAdminNote`**, **`CustomerAuditLog`**, **`CustomerPurchase`** — admin tooling for credits, notes, audit trail, purchases
- **`AdminInboxEvent`**, **`AdminNotificationSeen`** — lightweight admin notifications (e.g. signup / subscription events)

### Story Studio

- **`StoryStudioPreset`** — named preset, **`slug`**, **`defaults`** (JSON)
- **`StoryStudioDraft`** — **`title`**, **`slug`**, **`mode`**, optional **`presetId`**, **`request`** / **`brief`** / **`scriptPackage`** (JSON), optional **`linkedStoryId`**, optional **`createdByUserId`**
- **`StoryStudioDraftEpisode`** — per-draft episode: **`sortOrder`**, **`title`**, **`scriptText`**, **`summary`**, **`estimatedDurationSeconds`**, **`notes`** (JSON)
- **`StoryStudioGeneratedAsset`** — **`kind`**, optional **`storageKey`** / **`publicUrl`**, **`vendor`**, **`vendorArtifactId`**, **`metadata`**; ties to draft and optional draft episode
- **`StoryStudioGenerationJob`** — **`step`**, **`status`**, timing, **`payload`** / **`resultRef`** / **`errorMessage`**

### Engagement (catalog)

- **`StorySeriesLike`**, **`UserSavedStory`**, **`StorySeriesComment`**, **`StorySeriesRating`** — keyed by user + **`storySlug`** (see §1)

---

## 3. Admin API shape (Zod)

**Story library (manual admin editor)**

- [`src/lib/validation/storySchema.ts`](src/lib/validation/storySchema.ts)
  - **`adminStoryUpsertSchema`** — story + nested `episodes`
  - **`adminEpisodeSchema`** — per-episode fields (includes optional **`transcriptLines`**)

**Story required fields (typical save):** `slug`, `title`, `seriesTitle`, `summary`, `ageRange`, `isSeries`.

**Episode required:** `id` (non-empty client id for sync), `episodeNumber`, `title`.

Enums for `ageRange`, `genre`, `mood`, `durationBucket` come from [`src/constants/storyFilters.ts`](src/constants/storyFilters.ts).

**Story Studio (generation UI)**

- [`src/lib/story-studio/schemas/request-schema.ts`](src/lib/story-studio/schemas/request-schema.ts) — generation request shapes (e.g. preset, voice overrides)

**Customer admin**

- [`src/lib/validation/customerSchemas.ts`](src/lib/validation/customerSchemas.ts) — admin mutations for customer CRM where applicable

---

## 4. Site / route map

Paths are URL paths; modules are `src/app/...` unless noted.

### Public & marketing pages

- **`/`** — [`src/app/page.tsx`](src/app/page.tsx)
- **`/library`** — [`src/app/library/page.tsx`](src/app/library/page.tsx)
- **`/story/[slug]`** — [`src/app/story/[slug]/page.tsx`](src/app/story/[slug]/page.tsx) (client: [`src/components/story/StoryPageClient.tsx`](src/components/story/StoryPageClient.tsx))
- **`/pricing`**, **`/how-it-works`**, **`/faq`**, **`/contact`**, **`/accessibility`**, **`/privacy`**, **`/terms`** — respective `page.tsx` under [`src/app/`](src/app/)
- **`/login`**, **`/signup`**, **`/forgot-password`** — auth pages under [`src/app/`](src/app/)

### Account & billing

- **`/account`** — [`src/app/account/page.tsx`](src/app/account/page.tsx)
- **`/billing/success`**, **`/billing/cancel`** — [`src/app/billing/...`](src/app/billing/)

### Auth & Stripe (API)

- **`/api/auth/[...nextauth]`** — [`src/app/api/auth/[...nextauth]/route.ts`](src/app/api/auth/[...nextauth]/route.ts)
- **`/api/register`** — [`src/app/api/register/route.ts`](src/app/api/register/route.ts)
- **`/api/account/avatar`**, **`/api/account/password`** — [`src/app/api/account/...`](src/app/api/account/)
- **`/api/create-checkout-session`**, **`/api/create-customer-portal`**
- **`/api/stripe/checkout`**, **`/api/stripe/webhook`**, **`/api/stripe/portal`** — [`src/app/api/stripe/...`](src/app/api/stripe/)

### Story engagement & library (API)

- **`/api/stories/[slug]/like`**, **`/library`**, **`/comments`**, **`/comments/[id]`**, **`/rating`**, **`/engagement`** — under [`src/app/api/stories/[slug]/`](src/app/api/stories/[slug]/)

### Media & playback (API)

- **`/api/upload`** (admin) — [`src/app/api/upload/route.ts`](src/app/api/upload/route.ts)
- **`/api/audio/play`**, **`/api/audio/placeholder`** — [`src/app/api/audio/...`](src/app/api/audio/)
- **`/api/theme-audio/play`** — [`src/app/api/theme-audio/play/route.ts`](src/app/api/theme-audio/play/route.ts)

### Admin UI

- Shell: [`src/app/admin/layout.tsx`](src/app/admin/layout.tsx) — requires **`session.user.role === 'admin'`**; toasts via **sonner** ([`AdminTopNav`](src/components/admin/AdminTopNav.tsx) in layout header)
- **`/admin`** — dashboard [`src/app/admin/page.tsx`](src/app/admin/page.tsx)
- **`/admin/customers`**, **`/admin/customers/[customerId]`** — [`src/app/admin/customers/...`](src/app/admin/customers/)
- **`/admin/stories`**, **`/admin/uploads`**, **`/admin/story-studio`** — [`src/app/admin/stories/page.tsx`](src/app/admin/stories/page.tsx), [`uploads/page.tsx`](src/app/admin/uploads/page.tsx), [`story-studio/page.tsx`](src/app/admin/story-studio/page.tsx) ([`StoryStudioClient`](src/components/admin/story-studio/StoryStudioClient.tsx))

### Admin — stories & media (API)

- **`POST /api/admin/stories`** — [`src/app/api/admin/stories/route.ts`](src/app/api/admin/stories/route.ts)
- **`PATCH` / `DELETE /api/admin/stories/[id]`** — [`src/app/api/admin/stories/[id]/route.ts`](src/app/api/admin/stories/[id]/route.ts)
- **`POST /api/admin/stories/[id]/duplicate`** — [`src/app/api/admin/stories/[id]/duplicate/route.ts`](src/app/api/admin/stories/[id]/duplicate/route.ts)
- **`GET /api/admin/covers`** — browse public bucket `covers/…` — [`src/app/api/admin/covers/route.ts`](src/app/api/admin/covers/route.ts)

### Admin — Story Studio (API)

- **`/api/admin/story-studio/drafts`**, **`/api/admin/story-studio/drafts/[draftId]`** — [`src/app/api/admin/story-studio/drafts/...`](src/app/api/admin/story-studio/drafts/)
- **`/api/admin/story-studio/presets`** — [`src/app/api/admin/story-studio/presets/route.ts`](src/app/api/admin/story-studio/presets/route.ts)
- **`POST /api/admin/story-studio/generate/[step]`** — [`src/app/api/admin/story-studio/generate/[step]/route.ts`](src/app/api/admin/story-studio/generate/[step]/route.ts)  
  Allowed **`step`** values: **`brief`**, **`script`**, **`cover`**, **`theme_full`**, **`theme_intro`**, **`tts`**, **`package`** (e.g. runbook’s “`/generate/tts`” = **`tts`** step; **`draftEpisodeId`** only valid for **`tts`**)
- **`/api/admin/story-studio/generate/episode`** — [`src/app/api/admin/story-studio/generate/episode/route.ts`](src/app/api/admin/story-studio/generate/episode/route.ts)
- **`/api/admin/story-studio/push-to-library`** — [`src/app/api/admin/story-studio/push-to-library/route.ts`](src/app/api/admin/story-studio/push-to-library/route.ts)
- **`/api/admin/story-studio/audio-url`** — [`src/app/api/admin/story-studio/audio-url/route.ts`](src/app/api/admin/story-studio/audio-url/route.ts)
- **`/api/admin/story-studio/jobs/[jobId]`** — [`src/app/api/admin/story-studio/jobs/[jobId]/route.ts`](src/app/api/admin/story-studio/jobs/[jobId]/route.ts)

### Admin — customers & notifications (API)

- **`/api/admin/customers`** (list), **`/export`**, **`/bulk`**
- **`/api/admin/customers/[id]`** (detail patch), **`/credits`**, **`/notes`**, **`/audit`**, **`/activity`**, **`/saved`**, **`/purchases`**, **`/status`**, **`/actions`**
- **`/api/admin/notifications`** — [`src/app/api/admin/notifications/route.ts`](src/app/api/admin/notifications/route.ts)

---

## 5. Tech stack

From [`package.json`](package.json) (pin exact versions there):

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma
- **Auth:** NextAuth v5 + Prisma adapter
- **Object storage:** AWS SDK S3-compatible (R2/S3): `@aws-sdk/client-s3`, presigner
- **Validation:** **Zod 4.x**
- **Payments:** Stripe
- **Testing:** Vitest (`npm run test:unit`)
- **UI:** `lucide-react`, **sonner** (admin toasts)
- **Audio metadata:** `music-metadata`
- **Dependencies present:** `livekit-client` / `livekit-server-sdk` are listed in `package.json`; no current references under `src/` — confirm before assuming live features

---

## 6. Media conventions (critical for automation)

### Episode audio

- Prefer private storage: set **`Episode.audioStorageKey`** to the object key returned from upload (e.g. `audio/<slug>/episode-01.mp3`).
- Clients do **not** use raw keys; playback goes through **`/api/audio/play`** (signed URLs). See **`storyToPlayerPayload`** in [`src/lib/stories.ts`](src/lib/stories.ts).

### Cover images

- After upload, store the public **`fileUrl`** on **`Story.coverUrl`**.
- Admin **Browse covers in R2** uses **`GET /api/admin/covers`** (see runbook §1).

### Theme music (intro / full)

- **Not** stored as columns on `Story`. Paths are **conventional**, resolved in [`src/lib/themeAudioUrls.ts`](src/lib/themeAudioUrls.ts).
- Typical private keys (first candidate wins in probing order):
  - Intro: `audio/<slug>/music/Intro_song/theme.mp3` or `audio/<slug>/Intro_song/theme.mp3`
  - Full: `audio/<slug>/music/full_song/theme.mp3` or `audio/<slug>/full_song/theme.mp3`
- Playback: **`/api/theme-audio/play?slug=...&kind=intro|full`** when files live in private bucket.

Any pipeline that generates theme music should upload to paths compatible with this logic (or you must extend `themeAudioUrls.ts`).

### Transcripts

- Persist scrolling lines on **`Episode.transcriptLines`** (JSON). Admin PATCH accepts **`transcriptLines`** on each episode via **`adminEpisodeSchema`**; omit to leave the DB value unchanged.
- Story Studio can set transcripts when pushing/syncing to the linked story. Optional backfill: **`npm run backfill:episode-transcripts`** ([`scripts/backfill-episode-transcripts-from-studio.ts`](scripts/backfill-episode-transcripts-from-studio.ts)).

### Episode ordering

- **`syncEpisodesForStory`** ties **`episodeNumber` to the order of the `episodes` array** in the PATCH payload — reordering the array renumbers episodes. See runbook gotchas.

---

## 7. Runtime vs editorial content

- **PostgreSQL (`Story`, `Episode`, Story Studio tables, etc.)** is the **runtime source of truth** for the live site (listing, saves, player, admin).
- The **`content/`** tree may hold scripts/markdown for production; it is **not** what Next uses for catalog CRUD by default. Confirm current usage before building workflows that assume `content/` sync. Catalog merge from **`src/data.js`** for legacy audio is documented in the runbook.

---

## 8. Story Studio status & remaining gaps

**Implemented in schema and app**

- **Presets** (`StoryStudioPreset`), **drafts** with JSON **`request` / `brief` / `scriptPackage`**, **draft episodes**, **generated assets** (storage keys, public URLs, vendor metadata), and **generation jobs** with step/status.
- **Server orchestration** for steps **`brief`**, **`script`**, **`cover`**, **`theme_full`**, **`theme_intro`**, **`tts`**, **`package`** via [`src/lib/story-studio/orchestration/run-step.ts`](src/lib/story-studio/orchestration/run-step.ts).
- **OpenRouter** (LLM) and **ElevenLabs** (TTS) integrations in [`src/lib/story-studio/openrouter.ts`](src/lib/story-studio/openrouter.ts) and [`src/lib/story-studio/vendors/elevenlabs.ts`](src/lib/story-studio/vendors/elevenlabs.ts) (see §9 for env vars).

**Typical extension points**

- **Third-party music (e.g. Suno)** or **ffmpeg** trimming in CI/workers — not required by core DB; upload to keys compatible with **`themeAudioUrls.ts`** (or extend that module).
- **Heavier job infrastructure** (dedicated workers, webhooks, multi-region) if generation volume grows — current design uses DB jobs + admin polling patterns suitable for moderate load.
- **Image generation vendors** beyond what Story Studio’s **`cover`** step already orchestrates (if any); covers still land on **`Story.coverUrl`** or draft assets per implementation.

New capabilities should still **feed into** the existing **`adminStoryUpsertSchema`** path for catalog truth (draft → push / sync → published flags).

---

## 9. External integrations

| Integration | Role in repo | Configuration (server-only) |
|---------------|--------------|-------------------------------|
| **OpenRouter** | Chat completions for brief/script (and related steps) | **`OPENROUTER_API_KEY`** (required); **`OPENROUTER_MODEL`** (optional, default `anthropic/claude-3.5-sonnet`); uses **`NEXT_PUBLIC_SITE_URL`** as `HTTP-Referer` when set |
| **ElevenLabs** | TTS to buffers → upload as generated assets / episode audio | **`ELEVENLABS_API_KEY`**, **`ELEVENLABS_VOICE_ID`** (required for TTS); optional **`ELEVENLABS_MODEL_ID`** (default `eleven_multilingual_v2`) |
| **S3-compatible storage** | Covers, private audio, Story Studio uploads | See runbook / [`src/lib/s3.ts`](src/lib/s3.ts) |
| **Stripe** | Checkout, portal, webhooks | Stripe env as in product config |

**Security:** Never expose vendor keys to the client. Long-running steps should remain **admin-authenticated** routes; prefer **idempotent** job records and clear **error surfaces** in the UI.

---

## 10. Quick checklist for ChatGPT / agent prompts

When describing this app to an LLM, include:

1. One **`Story`** = one catalog item; series = **`isSeries`** + **`Episode[]`**; engagement by **`storySlug`**.
2. Private audio = **`audioStorageKey`**; playback = signed **`/api/audio/play`**.
3. Theme audio = **path conventions** in **`themeAudioUrls.ts`**, not DB columns.
4. Transcripts = **`Episode.transcriptLines`**; optional on admin PATCH; Story Studio / backfill can populate.
5. Validation = **`storySchema.ts`** (+ Story Studio **`request-schema.ts`**); persistence = **`prisma/schema.prisma`**.
6. Story Studio = drafts / presets / jobs / assets; generation **`POST /api/admin/story-studio/generate/[step]`** with steps **`brief` | `script` | `cover` | `theme_full` | `theme_intro` | `tts` | `package`**; library merge via **`push-to-library`** and linked story — see **§4** and the runbook.
7. Customer admin = **`Profile`** + ledger / notes / audit / purchases APIs under **`/api/admin/customers`**.
8. Ops detail = **`agents/story-sonnet-publish-runbook.md`**.

---

*Last updated: 2026-04-12 — story-app admin, Story Studio, and CRM.*
