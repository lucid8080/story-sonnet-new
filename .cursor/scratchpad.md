## Background and Motivation
The project has updated cover artwork for "Juniper and the Lantern Library" and "Nori and the Pocket Meadow". The goal is to ensure the app displays these new PNG covers wherever those stories appear (library listings, detail pages, carousels, etc.) while keeping the asset pipeline tidy and consistent.

## Key Challenges and Analysis
- Identify where cover assets are stored and how they are referenced (e.g. per-story folders, a manifest, or hard-coded imports).
- Confirm the exact filenames and locations of the new PNG covers (the user mentioned they are called "cover" and are PNGs, likely per-book directories).
- Avoid breaking existing story cards or layouts that assume certain aspect ratios or resolutions.
- Ensure any runtime or build tooling (Next.js/React/Vite, etc.) can correctly bundle the new PNG assets.

## High-level Task Breakdown
1. **Discover asset structure**
   - Inspect story-related components and config to see how covers are wired (e.g. `cover: "/assets/juniper/cover.png"`).
   - Locate or define the expected folders for "Juniper and the Lantern Library" and "Nori and the Pocket Meadow".
2. **Confirm and place new cover PNGs**
   - Ensure the new `cover.png` files for both stories are present in the correct asset folders within the project.
   - If they are not yet copied into the repo, decide on canonical paths and document the expected filenames/locations.
3. **Wire updated covers into the app**
   - Update any story metadata/config to point to the PNG `cover` files for Juniper and Nori.
   - Verify that all views using these stories (lists/cards/detail pages) pull from the same source of truth.
4. **Visual verification and regression check**
   - Run the dev server and verify that the updated covers render correctly in all relevant screens.
   - Check for layout issues (cropping, stretching, incorrect aspect ratios).
5. **Documentation and cleanup**
   - Note the final asset locations and naming conventions in comments or project docs to simplify future cover updates.
6. **Story Library card rounding (UI tweak)**
   - Reduce the Story Library card corner radius by updating the Tailwind `rounded-[2rem]` classes in `story-app/src/App.jsx`.

## Project Status Board
- Discover asset structure: completed
- Confirm and place new cover PNGs: pending
- Wire updated covers into the app: in progress
- Visual verification and regression check: pending
- Documentation and cleanup: pending
- Story Library card rounding: in progress
- Story Library show more bottom of card (taller tiles): completed

## Executor's Feedback or Assistance Requests
- Need confirmation (or pointers) on where the new `cover.png` files currently live on disk, or whether they still need to be copied into the project tree.
- `npm run build` succeeded; `npm run lint` still reports a pre-existing `react-refresh/only-export-components` error in `src/context/AuthContext.jsx`.
- Story Library tiles updated from `aspect-[4/5]` to `aspect-[3/4]` to reveal more of the cover bottom.

## Lessons
- Keep story cover assets following a strict, documented naming convention (e.g. per-story folder with `cover.png`) to simplify future swaps.
