---
title: How playlists work
---

A Yoto playlist is made up of chapters and tracks, and can be linked to a Make Your Own (MYO) card via the Yoto app or a Yoto player.

## Tracks

- Tracks within a chapter play in sequence
- Each track represents a single audio file and can have its own icon

The track object looks like this:

```json
{
  "key": "01",
  "title": "Song 1 track",
  "trackUrl": "yoto:#<sha256-hash>",
  "overlayLabel": "1",
  "duration": 420,
  "fileSize": 1536000,
  "channels": 2,
  "format": "mp3",
  "type": "audio"
}
```

### Schema

The full schema is as follows:

```js
const ambientSchema = z.object({
  defaultTrackDisplay: z.string().optional().nullable(),
});

export const trackSchema = z.object({
  title: z.string(),
  trackUrl: z.string(),
  key: z.string(),
  format: z.string(),
  uid: z.string().optional().nullable(),
  type: z.enum(["audio", "stream"]),
  display: z
    .object({
      icon16x16: z.string().nullable(),
    })
    .optional()
    .nullable(),
  overlayLabelOverride: z.string().nullable().optional(),
  overlayLabel: z.string(),
  duration: z.number(),
  fileSize: z.number(),
  channels: z.enum(["stereo", "mono"]).optional(),
});
```

## Chapters

- A playlist contains one or more chapters
- Each chapter has its own title and [icon](/icons/using-icons)
- Each chapter contains one or more tracks

### Schema

```js
export const chapterSchema = z.object({
  key: z.string(),
  title: z.string(),
  overlayLabel: z.string().optional(),
  overlayLabelOverride: z.string().nullable().optional(),
  tracks: z.array(trackSchema),
  defaultTrackDisplay: z.string().optional().nullable(),
  defaultTrackAmbient: z.string().optional().nullable(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  display: z.object({
    icon16x16: z.string().nullable(),
  }),
});
```

## Example Structures

Single Chapter, Multiple Tracks

```json
{
  "key": "01",
  "title": "My Album Chapter",
  "display": {
    "icon16x16": null
  },
  "tracks": [
    {
      "key": "01",
      "title": "Song 1 track",
      "overlayLabel": "1",
      "trackUrl": "yoto:#<sha256-hash>",
      "duration": 420,
      "fileSize": 1536000,
      "channels": 2,
      "format": "mp3",
      "type": "audio"
    }
  ]
}
```

Multiple Chapters, Multiple Tracks

```json
[
  {
    "key": "01",
    "title": "Morning Stories",
    "display": {
      "icon16x16": null
    },
    "tracks": [
      {
        "key": "01",
        "title": "Story 1",
        "overlayLabel": "1",
        "trackUrl": "yoto:#<sha256-hash>",
        "duration": 420,
        "fileSize": 1536000,
        "channels": 2,
        "format": "mp3",
        "type": "audio"
      },
      {
        "key": "02",
        "title": "Story 2",
        "overlayLabel": "2",
        "trackUrl": "yoto:#<sha256-hash>",
        "duration": 380,
        "fileSize": 1228800,
        "channels": 2,
        "format": "mp3",
        "type": "audio"
      }
    ]
  },
  {
    "key": "02",
    "title": "Bedtime Stories",
    "display": {
      "icon16x16": null
    },
    "tracks": [
      {
        "key": "01",
        "title": "Story 3",
        "overlayLabel": "3",
        "trackUrl": "yoto:#<sha256-hash>",
        "duration": 600,
        "fileSize": 2048000,
        "channels": 2,
        "format": "mp3",
        "type": "audio"
      },
      {
        "key": "02",
        "title": "Story 4",
        "overlayLabel": "4",
        "trackUrl": "yoto:#<sha256-hash>",
        "duration": 540,
        "fileSize": 1843200,
        "channels": 2,
        "format": "mp3",
        "type": "audio"
      }
    ]
  }
]
```