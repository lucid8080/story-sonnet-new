## Media migration to Cloudflare R2

This project does not maintain a backend or database; media references are defined statically in `src/data.js`.
To “migrate” media to R2, you only need to align file paths in the bucket with the paths used in that file.

### 1. Check current paths

Open `src/data.js` and note the paths used with `assetPath()`:

- Covers:
  - `/covers/nori-and-the-pocket-meadow/cover.png`
  - `/covers/juniper-and-the-lantern-library/cover.png`
  - `/covers/the-secret-map-of-the-7641-islands/cover.webp`
  - `/covers/pip-and-the-moonlight-mailbox/cover.webp`
  - `/covers/blocky-explores-mine-world/cover.webp`
- Audio:
  - `/audio/nori-and-the-pocket-meadow/episode-1.mp3`
  - `/audio/juniper-and-the-lantern-library/episode-1.mp3`
  - `/audio/the-secret-map-of-the-7641-islands/episode-1.mp3`
  - `/audio/pip-and-the-moonlight-mailbox/episode-1.mp3`
  - `/audio/pip-and-the-moonlight-mailbox/episode-2.mp3`
  - `/audio/blocky-explores-mine-world/episode-1.mp3`
  - `/audio/blocky-explores-mine-world/episode-2.mp3`

### 2. Upload local files to matching R2 keys

1. Collect your existing MP3s and cover images on disk.
2. In the R2 bucket you created (see `R2_SETUP.md`), create folders and upload files so that their object keys match the paths above, without the leading slash. For example:

   - `covers/nori-and-the-pocket-meadow/cover.png`
   - `audio/pip-and-the-moonlight-mailbox/episode-2.mp3`

3. After upload, each object should be accessible at:

   - `https://<your-assets-domain>/covers/...`
   - `https://<your-assets-domain>/audio/...`

### 3. Optional: adjust paths if your existing structure differs

If your current local folder structure does not match the paths above, you have two options:

- **Option A (recommended)**: Rename and arrange files in R2 to match the existing paths in `src/data.js`.
- **Option B**: Update the paths in `src/data.js` to match how you name objects in R2, for example:

  ```js
  cover: assetPath('/covers/nori-and-the-pocket-meadow/main-cover.png');
  ```

Whichever option you choose, keep paths consistent so the app can build correct URLs to R2.

### 4. Premium audio (paywalled) vs public covers

- **Covers** stay on a **public** R2 bucket (or public prefix) and are referenced by `coverUrl` / `NEXT_PUBLIC_ASSETS_BASE_URL` as before.
- **MP3s** for subscription content should live in a **private** bucket (`R2_PRIVATE_BUCKET`). Set each episode’s **Private audio key** in admin (e.g. `audio/blocky-explores-mine-world/episode-1.mp3`) to match the object key in that bucket. Playback uses `/api/audio/play` and short-lived presigned GET URLs.
- **Legacy** episodes may still use **Audio URL** only (public). The play API returns that URL after the same entitlement checks, but the URL is not embedded in the initial page payload for database-backed stories.
- Upload flow: Admin **Uploads** → choose **Audio (private)**; paste returned `storageKey` into the episode’s **Private audio key** field.
- Run `npx prisma migrate deploy` (or `migrate dev`) so `episodes.audio_storage_key` and `episodes.is_free_preview` exist.
- For **free samples** on a premium series, enable **Free preview (no subscription)** on the episode in admin.

### 5. Series theme audio (intro + full track)

Optional theme music uses **fixed paths** per series slug. Upload to your **public** assets host (`NEXT_PUBLIC_ASSETS_BASE_URL` / `public/audio/...` locally)—not only a private episode bucket—so the app can `HEAD`/`GET` them like covers.

The app tries, in order:

1. Under a `music/` folder (common when organizing series assets):  
   - `audio/<slug>/music/Intro_song/theme.mp3`  
   - `audio/<slug>/music/full_song/theme.mp3`
2. **Legacy** flat layout (still supported):  
   - `audio/<slug>/Intro_song/theme.mp3`  
   - `audio/<slug>/full_song/theme.mp3`

Examples (preferred):

- `audio/keepers-of-turtleshell-city/music/Intro_song/theme.mp3`
- `audio/keepers-of-turtleshell-city/music/full_song/theme.mp3`

Folder names are case-sensitive on some hosts (`Intro_song`, `full_song`). The story page probes these URLs on the server; the intro toggle and full-track bar only appear when the corresponding file returns successfully (for example HTTP 200 on `HEAD`).

Theme files are treated as **public** URLs (same pattern as cover images). Episode audio may still be private R2 + signed playback as described above.

**Local dev:** If you keep theme MP3s under `public/audio/...` only, the app detects them on disk even when a server `HEAD` to `localhost` fails (for example wrong port in `NEXT_PUBLIC_SITE_URL`). With `NEXT_PUBLIC_ASSETS_BASE_URL` set, development playback uses same-origin `/audio/...` for those files so they still play without uploading to R2.

**Private bucket (R2_PRIVATE_BUCKET):** If theme files live only in the same private bucket as episode audio (no public read), use the same key layout as above (e.g. `audio/<slug>/music/Intro_song/theme.mp3`). The server uses `HeadObject` during the story page probe and playback URLs come from `GET /api/theme-audio/play` (presigned GET), same entitlement rules as the first episode.
