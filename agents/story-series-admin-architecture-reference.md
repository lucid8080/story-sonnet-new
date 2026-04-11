# Story series & admin architecture — reference

Reusable context for designing **admin tools** (e.g. full story-series builder, LLM/TTS/music pipelines). Grounded in the `story-app` codebase. Re-verify after major refactors; Prisma and routes are authoritative.

**Related:** [`story-sonnet-publish-runbook.md`](story-sonnet-publish-runbook.md) for publish/upload flows and env vars.

---

## 1. How “story series” are modeled

There is **no separate `Series` table**. A series is:

- One **`Story`** row with `isSeries: true` (and `seriesTitle`, tagline, etc.).
- Multiple **`Episode`** rows with `storyId` pointing at that story.

User engagement (likes, saves, comments, ratings) is keyed by **`storySlug`**, not numeric id — be careful if slugs change.

---

## 2. Data model (Prisma)

### `Story` (high level)

- **Identity / listing:** `slug` (unique), `seriesTitle`, `title`, `subtitle`, `summary`, `fullDescription`
- **Discovery:** `ageGroup`, `ageRange`, `durationLabel`, `durationMinutes`, `durationBucket`, `genre`, `mood`, `topics` (JSON), `characterTags` (JSON), `universe`, `readingLevel`, `seriesTagline`
- **Media:** `coverUrl` (public URL), `accent`
- **Card overrides:** `cardTitleOverride`, `cardDescriptionOverride`, `badgeLabelOverride`
- **Ranking / SEO:** `popularityScore`, `sortPriority`, `metaTitle`, `metaDescription`
- **Publishing:** `publishedAt`, `isFeatured`, `isPublished`, `isPremium`, `isSeries`

Full definition: `prisma/schema.prisma` → `model Story`.

### `Episode`

- **Keys:** `storyId`, `episodeNumber` (unique per story), optional `slug` (unique per story)
- **Content:** `title`, `label`, `description` (used as summary in some admin flows)
- **Audio:** `audioUrl` (legacy/public), **`audioStorageKey`** (private R2 key, no leading slash)
- **Timing:** `duration`, `durationSeconds` (often from audio metadata)
- **Flags:** `isPublished`, `isPremium`, `isFreePreview`

Full definition: `prisma/schema.prisma` → `model Episode`.

---

## 3. Admin API shape (Zod)

Canonical request/response validation:

- **`src/lib/validation/storySchema.ts`**
  - `adminStoryUpsertSchema` — story + nested `episodes`
  - `adminEpisodeSchema` — per-episode fields

**Story required fields (typical save):** `slug`, `title`, `seriesTitle`, `summary`, `ageRange`, `isSeries`.

**Episode required:** `id` (non-empty client id for sync), `episodeNumber`, `title`.

Enums for `ageRange`, `genre`, `mood`, `durationBucket` come from `src/constants/storyFilters.ts`.

---

## 4. Site / route map

| Area | Path / module |
|------|----------------|
| Home / library | `src/app/page.tsx`, `src/app/library/page.tsx` |
| Story player page | `src/app/story/[slug]/page.tsx`, `src/components/story/StoryPageClient.tsx` |
| Admin shell | `src/app/admin/layout.tsx` (requires `session.user.role === 'admin'`) |
| Story editor | `src/app/admin/stories/page.tsx` |
| Uploads | `src/app/admin/uploads/page.tsx` |
| Create draft story | `POST` `src/app/api/admin/stories/route.ts` |
| Save story + episodes | `PATCH` `src/app/api/admin/stories/[id]/route.ts` |
| Upload media | `POST` `src/app/api/upload/route.ts` |
| Episode playback | `GET` `src/app/api/audio/play/route.ts` |
| Theme playback | `GET` `src/app/api/theme-audio/play/route.ts` |

---

## 5. Tech stack

From `package.json`:

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth v5 + Prisma adapter |
| Object storage | AWS SDK S3-compatible (R2/S3): `@aws-sdk/client-s3`, presigner |
| Validation | Zod |
| Payments | Stripe (if used in product) |
| Other | `music-metadata` (duration), `lucide-react`, LiveKit deps may exist for other features |

**Not in repo by default:** OpenRouter, ElevenLabs, Suno, or image-generation SDKs — add as server-side integrations with secrets in `.env` (never expose to the client).

---

## 6. Media conventions (critical for automation)

### Episode audio

- Prefer private storage: set **`Episode.audioStorageKey`** to the object key returned from upload (e.g. `audio/<slug>/episode-01.mp3`).
- Clients do **not** use raw keys; playback goes through **`/api/audio/play`** (signed URLs). See `storyToPlayerPayload` in `src/lib/stories.ts`.

### Cover images

- After upload, store the public **`fileUrl`** on **`Story.coverUrl`**.

### Theme music (intro / full)

- **Not** stored as columns on `Story`. Paths are **conventional**, resolved in `src/lib/themeAudioUrls.ts`.
- Typical private keys (first candidate wins in probing order):
  - Intro: `audio/<slug>/music/Intro_song/theme.mp3` or `audio/<slug>/Intro_song/theme.mp3`
  - Full: `audio/<slug>/music/full_song/theme.mp3` or `audio/<slug>/full_song/theme.mp3`
- Playback: **`/api/theme-audio/play?slug=...&kind=intro|full`** when files live in private bucket.

Any pipeline that generates theme music should upload to paths compatible with this logic (or you must extend `themeAudioUrls.ts`).

### Episode ordering

- **`syncEpisodesForStory`** ties **`episodeNumber` to the order of the `episodes` array** in the PATCH payload — reordering the array renumbers episodes. See runbook gotchas.

---

## 7. Runtime vs editorial content

- **PostgreSQL (`Story`, `Episode`)** is the **runtime source of truth** for the live site (listing, saves, player).
- The **`content/`** tree may hold scripts/markdown for production; it is **not** what Next uses for catalog CRUD by default. Confirm current usage before building workflows that assume `content/` sync.

---

## 8. Gaps for a “Story Studio” / generation tool

The current schema does **not** include:

- LLM script drafts or versions
- ElevenLabs / Suno / image job IDs
- First-class **presets** (e.g. “Goldfish Superhero”) — you may add tables (`Preset`, `GenerationJob`, `StoryDraft`) or config files

Design those extensions so they **feed into** the existing `adminStoryUpsertSchema` flow (create draft story → upload assets → PATCH with keys/URLs → publish).

---

## 9. External integrations (conceptual mapping)

| Goal | Typical approach |
|------|------------------|
| **OpenRouter / LLM** | Server route: preset + target **minutes** + episode count → script text; optionally chunk per episode. |
| **Target duration** | LLM input; align **`Story.durationMinutes`** / **`durationBucket`** and per-episode **`durationSeconds`** after audio exists. |
| **ElevenLabs** | Server TTS → upload MP3 → set **`audioStorageKey`**; duration via existing metadata parsing patterns. |
| **Image generation** | Generate → upload (same as cover flow) → **`coverUrl`**. |
| **Suno + intro trim** | Generate full track → trim (e.g. ffmpeg in worker) → upload to **theme intro path** under `audio/<slug>/...` per `themeAudioUrls.ts`. |
| **Presets** | DB or versioned JSON: defaults for tone, age, genre, structure, character seeds; plus user “simple idea” string. |

**Security:** All vendor API keys stay **server-only**; long jobs may need **queues**, **idempotency**, and **admin polling** or webhooks.

---

## 10. Quick checklist for ChatGPT / agent prompts

When describing this app to an LLM, include:

1. One **`Story`** = one catalog item; series = `isSeries` + **`Episode[]`**.
2. Private audio = **`audioStorageKey`**; playback = signed **`/api/audio/play`**.
3. Theme audio = **path conventions** in `themeAudioUrls.ts`, not DB columns.
4. Validation = **`storySchema.ts`**; persistence = **`prisma/schema.prisma`**.
5. Ops detail = **`agents/story-sonnet-publish-runbook.md`**.

---

*Last curated for story-app admin / Story Studio planning.*
