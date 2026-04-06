# Story Sonnet Workflow

## Goal
Create repeatable kid-friendly audio stories with:
- age group metadata
- 4:5 cover art
- MP3 audio
- story tile on the main library page
- story detail page with episode list

## Per-Story File Pack
Each new story should get a folder under `content/<story-slug>/` with:
- `story.md` — master story draft
- `narration-script.txt` — audio-friendly clean read version
- `cover-art-prompt.md` — Nano Banana prompt
- `story.json` — metadata + status

## App Requirements
- Every story must include an `ageGroup`
- Main `/` page shows story tiles
- Each tile links to `/story/<slug>`
- Cover images should be displayed in **4:5**
- Story page supports one or more episodes
- Every shipped episode must include a working auto-scrolling transcript
- Transcript files must be created and wired into `src/transcripts.js` so the transcript toggle actually works
- Final audio files should be stored as MP3 under `public/audio/`
- Final cover images should be stored under `public/covers/`

## Cover Art Style
Use a modern whimsical children's-book look with:
- hand-painted textured digital illustration
- gouache / watercolor / colored-pencil feel
- loose imperfect linework
- rounded simplified anatomy
- cozy muted-but-rich palette
- visible grain and brush texture
- warm, emotionally expressive characters
- decorative, poster-like composition

## Recommended Creation Sequence
1. Come up with concept
2. Get approval
3. Write `story.md`
4. Create `narration-script.txt`
5. Create `cover-art-prompt.md`
6. Add `story.json`
7. Add story entry to `src/data.js`
8. Generate 4:5 cover image (or a clean temporary placeholder if final art is not ready)
9. Generate TTS audio as MP3 with the primary Mistral path
10. Drop cover + MP3 into `public/`
11. Verify the story tile and page in browser

## Story Design Rules
- Target 4–8 year olds unless specified otherwise
- Keep representation broad and inclusive across the library
- Use a variety of names, looks, hair textures/styles, and attire cues
- Reflect many kinds of children naturally, including styles like braids, locs/dreadlocks, afros, cornrows, curls, and other varied looks when appropriate
- Avoid defaulting every protagonist to the same cultural or visual mold
- Keep tone fun, cozy, imaginative, and safe
- Prefer roughly 10 minutes of listening time when the story supports it naturally
- Use clear titles and strong visual hooks
- Avoid scary stakes, cruelty, or heavy sadness
- Prefer kindness, curiosity, teamwork, courage, and wonder


## Voice / Narration Consistency Rules
- Document the chosen voice in the series metadata and the episode files.
- Save a final `narration-script.txt` with every episode.
- Do not say the age group out loud.
- Do not say episode numbers out loud unless explicitly requested.
