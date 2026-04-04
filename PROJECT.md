# Story Sonnet — Project Brain

This file is the living operating document for the Story Sonnet project.

Purpose:
- give Andre a single place to review the project direction
- give agents a shared source of truth
- keep the semi-automated story production workflow clear
- track product decisions, content rules, and next-step logic over time

Related reference docs:
- Story/character consistency guide: `STORY_BIBLE.md`

This file should be updated whenever important product, content, workflow, automation, or analytics decisions change.

---

## 1. Project Overview

## Request Interpretation Rule

- If Andre asks for a **new story**, default to creating a **new tile-worthy story/series entry**.
- Only create a new episode in an existing series when Andre explicitly asks for a **new episode** or clearly names the series/episode intent.


**Project name:** Story Sonnet  
**Repository root:** the `story-app` project folder (clone or working copy on your machine, e.g. `Desktop/story-app`). Paths in docs are relative to that root unless noted.

Story Sonnet is a kid-focused audio story site built around:
- story series
- cover-based browsing
- episode-based listening
- age-group tagging
- reusable semi-automated production workflows

The long-term goal is to make Story Sonnet a **semi-automated story publishing system** where agents can help with:
- story ideation
- story writing
- narration prep
- cover prompt creation
- audio generation
- site updates
- content iteration based on user behavior and site performance

---

## 2. Product Direction

### Core experience
Users should be able to:
- browse story series visually from the main page
- see age guidance for each series
- click into a story series page
- choose among available episodes
- play audio easily without hunting around the page
- use a working auto-scrolling transcript on story pages for shipped episodes

### UX direction currently in place
- homepage uses **story tiles**
- covers are presented in **4:5**
- homepage cards show:
  - cover
  - age group
  - series title
  - number of available episodes
- homepage cards do **not** show descriptive blurbs
- story detail pages show:
  - embedded player integrated into the cover area
  - story series details above the episode list
  - episode-specific names only inside the player and episode list

### Messaging / homepage copy
Current preferred homepage wording:
- **Worlds made for listening**
- **Organized for easy story browsing and listening**

---

## 3. Content Structure

### Series vs Episode rule
On the main browsing experience, prioritize the **series identity**.

Examples:
- use **Pip's Moonlight Adventures** as the main story/series title
- use **Lila & Mateo - The 7,641 Islands Adventures** as the main story/series title

Episode-specific names should appear only where appropriate:
- on the selected story page
- in the player area
- in the episode list

Do **not** make the homepage feel like a flat list of unrelated one-off stories when the content is really organized into series.

---

## 4. Visual Direction

### Cover art rules
Story Sonnet cover art should use a:
- modern whimsical children's-book style
- handcrafted storybook feel
- hand-painted textured digital illustration look
- gouache / watercolor / colored-pencil feel
- loose imperfect linework
- rounded simplified anatomy
- warm emotionally expressive characters
- muted but rich cozy palette
- decorative, poster-like composition

### Cover format rules
- preferred display ratio: **4:5**
- covers should be designed/exported with that ratio in mind
- goal: full-bleed display with minimal bad cropping
- if cropping is needed, per-story crop tuning may be added later

### Current cover workflow reality
- cover prompt generation is already structured
- Gemini image generation script has been wired/tested
- current Gemini image generation attempts are blocked by quota / 429 errors
- manual or alternate-provider generation may still be needed until quota is resolved

---

## 5. Audio Direction

### Audio rules
- audio should feel fun, warm, easy to follow, and kid-friendly
### Representation / character design direction
- Story Sonnet should aim for **ethnicity-neutral inclusiveness** across the library rather than defaulting to one narrow visual/cultural norm.
- Across stories, reflect a wide range of:
  - names
  - skin tones
  - facial features
  - hair textures and styles
  - attire / styling references
- Hair representation should naturally include styles such as:
  - braids
  - dreadlocks / locs
  - afros
  - cornrows
  - curls, coils, waves, straight styles, buns, wraps, and other varied looks
- Diversity should feel natural and story-first, not tokenized or forced.
- Avoid making ethnicity the "lesson" unless a story intentionally centers culture.
- The goal is broad, warm, everyday representation in characters, worldbuilding, naming, and cover art.

- do not speak episode numbers out loud in story audio unless explicitly requested
- voice should be documented per series / episode, not left implicit
- current established voices:
  - **Pip's Moonlight Adventures:** EN - Jane, Curious
  - **Blocky Explores Mine World:** EN - Paul, Neutral
  - **Juniper and the Lantern Library:** EN - Paul, Neutral

### Important narration preference
**Do not say the age group out loud in the story audio.**

### Episode length preference
Andre approved keeping episodes around **~10+ minutes** when that works well.
This is currently acceptable for the Pip series and should be treated as the default unless changed later.

### Current audio workflow reality
- the primary TTS path is now the Mistral API via `scripts/generate-audio-mistral.py`
- Mistral currently uses `voxtral-mini-tts-2603` and requires either a saved `voice_id` or a short reference clip (`ref_audio`)
- the preferred long-term setup is one saved Mistral `voice_id` per Story Sonnet series voice
- Mistral reference audio must be kept under 60 seconds, so trim sample clips before generation
- the older Hugging Face Voxtral TTS demo remains available as fallback only
- returned audio can be saved into the project as MP3

---

## 6. Current Story Production Workflow

Each story series / episode should be organized cleanly.

### Per-story folder structure
Each story should have a folder under `content/<story-slug>/` and/or episode subfolders where needed.

Useful files include:
- `story.md` — master draft
- `tts-input-final.md` or `narration-script.txt` — final audio input
- `cover-art-prompt.md` / `cover-art-prompt-final.md` — image prompt pack
- `story.json` — metadata and status
- episode-specific folders where a series contains multiple episodes

### App asset locations
- cover images: `public/covers/`
- audio files: `public/audio/`

### Current semi-automated flow
1. come up with story/episode concept
2. get approval if needed
3. write story draft
4. create final TTS-ready narration script
5. create final cover prompt
6. wire metadata into app
7. generate or place cover image
8. generate audio
9. save audio as MP3
10. verify homepage + story page behavior

---

## 7. Current Implemented Series

### Pip's Moonlight Adventures
Status: active

Episodes currently added:
1. **The Letter for the Bravest Good Helper**
2. **The Puddle That Wouldn't Hold Still**

Notes:
- both episodes have real generated MP3s
- cover is currently in place on the site
- this is the main active test series for the workflow

### Lila & Mateo - The 7,641 Islands Adventures
Status: present in site

Notes:
- already exists in the project as a story series
- should continue to follow the series-first display model

### Juniper and the Lantern Library
Status: active

Episodes currently added:
1. **The Shelf That Needed a Song**

Notes:
- new library-cart series distinct from Pip, Blocky, and Lila & Mateo
- preferred narration voice is **EN - Paul, Neutral**
- manual cover art can be swapped in later via the existing cover watcher workflow

### Nori and the Pocket Meadow
Status: active

Episodes currently added:
1. **The Crickets Who Misplaced Their Evening Song**

Notes:
- cozy twilight meadow series built around Nori unfolding a hidden pocket meadow from a satchel
- preferred narration voice is **EN - Jane, Curious**
- current live cover is a local placeholder; final painted cover can replace it later without changing the series slug

---

## 8. Semi-Automation Goal

Story Sonnet should become a **semi-automated content system** rather than a manually stitched toy project.

That means agents should gradually handle more of the repeatable work:
- generating new story concepts
- drafting stories
- creating age tags
- creating cover prompts
- calling audio generation workflows
- updating story metadata
- adding new episodes to the site
- tracking which stories perform well
- making content decisions based on real user interaction

Human review can still remain in the loop for taste and final approval.

---

## Agent Role Split

- **Main agent (Starboi):** owns creative aspects by default — story concepts, editorial direction, voice/tone, product taste, and higher-level UX/product decisions.
- **Dedicated Story Sonnet agent:** owns heavier execution work — implementation, automation, asset handling, metadata maintenance, repetitive production work, and MP3 generation.
- Default heavy-task model for the Story Sonnet agent: **OpenRouter Nemotron 3 Super** (`nvidia/nemotron-3-super-120b-a12b:free`).
- Default MP3 production route for the Story Sonnet agent: **Mistral API** via `scripts/generate-audio-mistral.py`; use the Hugging Face Voxtral demo only as fallback when Mistral is unavailable.

## 9. Future Dedicated Agent Role

A **dedicated Story Sonnet agent** should eventually be assigned to this project.

That agent’s responsibilities should include:
- maintaining this PROJECT.md file
- tracking user interaction patterns
- monitoring story/series performance
- reviewing site changes and iteration opportunities
- helping decide which stories to make next
- improving UX based on actual usage
- helping agents prioritize the best content opportunities

### Data that the future agent should care about
Examples:
- which story tiles get clicked most
- which series get repeat listens
- which episodes get completed vs abandoned
- which age groups are most popular
- which cover styles attract more clicks
- which story themes perform best
- traffic by source / page / series
- user retention patterns
- favorite voice / pacing patterns if measurable

### Decision goal
The agent should help answer:
- what story should we make next?
- which series deserves another episode?
- what age range is underserved?
- which covers are underperforming?
- what layout or UX changes improve listening?

---

## 10. Metrics to Add Later

When analytics are added, useful metrics may include:
- story tile CTR
- story page visits
- episode play starts
- episode completion rate
- repeat listens
- average listen time
- most-played series
- most-played episode
- age-group popularity
- bounce rate on story pages
- scroll depth on story pages
- cover-image performance by style/theme

This should eventually feed back into editorial decisions.

---

## 11. Editorial Rules for Future Stories

Default direction unless Andre changes it:
- create stories for kids roughly in the 4–8 range
- keep them imaginative, safe, and fun to listen to
- avoid heavy darkness, cruelty, or genuinely scary content
- prioritize wonder, kindness, curiosity, courage, teamwork, and emotional warmth
- write stories that sound good when spoken aloud
- build stories that can grow into repeatable series, not just isolated one-offs

---

## Dev Model Preference

- Dedicated Story Sonnet agent should use **OpenRouter Nemotron 3 Super** (`nvidia/nemotron-3-super-120b-a12b:free`) for dev work by default unless Andre changes it.

## Asset Organization Rules

- Store covers in per-series folders under `public/covers/<story-slug>/`
- Store audio in per-series folders under `public/audio/<story-slug>/`
- Prefer cover images in **.webp** where quality remains good enough
- Name episode audio files consistently, e.g. `episode-1.mp3`, `episode-2.mp3`
- Avoid dumping story assets directly into `public/` root

## Optimization Ideas

Implemented workflow helpers:
- cover watcher can auto-convert dropped cover images into live `cover.webp` files inside per-story cover folders


Practical next optimizations:
- generate all future covers directly as **WebP** to reduce storage and transfer size
- add lazy loading for homepage cover images if the library grows larger
- create a manifest-driven loader so story metadata can live outside hardcoded JS over time
- generate a small thumbnail version of each cover for the homepage grid if image sizes grow too large
- consider normalizing MP3 loudness later for a more consistent listening experience across episodes
- add a one-command production script per series for cover/audio placement and metadata updates

## 12. Current Known Constraints

### Image generation constraint
- Gemini image generation path exists, but current usage is blocked by quota / 429 limits

### Audio generation constraint
- Mistral is now the primary TTS path and currently works with short reference clips
- long-term voice consistency is still best served by creating one saved Mistral `voice_id` per recurring series voice
- the Hugging Face Voxtral demo remains fallback-only and its reliability may vary over time

### UI constraint
- cover fill vs crop is a balancing act; best solution is to create covers intentionally for the display format

---

## 13. Update Rules For Agents

Whenever important decisions are made, update this file.

Always update when:
- homepage UX changes
- story page UX changes
- cover style rules change
- voice/audio rules change
- episode length preferences change
- automation scripts are added or replaced
- new analytics priorities are introduced
- the dedicated Story Sonnet agent gets defined
- there is a new rule for choosing future stories

Keep this file concise enough to stay readable, but detailed enough that a fresh agent can understand the project quickly.

---

## 14. Immediate Next Steps

Recommended near-term work:
1. continue expanding Pip as the main test series
2. create one-command automation wrappers for story audio generation
3. improve cover-generation reliability (Gemini quota or alternative provider)
4. define the dedicated Story Sonnet agent
5. add analytics / tracking so agents can make better story decisions
6. begin using interaction data to decide what to produce next

---

## 15. Status Snapshot

**Project type:** semi-automated kid audio story site  
**Main active series:** Pip's Moonlight Adventures  
**Cover workflow:** prompt-ready, generation partially automated, quota-blocked on Gemini  
**Audio workflow:** primary Mistral API path working; Voxtral demo kept as fallback  
**Site status:** live locally/LAN with story tiles and per-series episode pages  
**Future direction:** dedicated project agent + data-informed content iteration

---

_Last updated: 2026-03-30_


### Blocky Explores Mine World
Status: active

Episodes currently added:
1. **Blocky Builds a Fort with 1 by 1 Blocks**
2. **Blocky Finds a Shortcut That Wouldn't Stay Short**

Notes:
- Episode 2 establishes EN - Paul, Neutral as the preferred Blocky narration voice
- do not speak age groups or episode numbers in audio
