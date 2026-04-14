---
title: Chapter shuffling
---

The Yoto players can randomises the order of **chapters** each time a card is played. Tracks within a chapter always play in their original sequence.

Shuffling only works on Yoto players, and it's not supported in the app.

## Configuring shuffle

This behaviour is configured via the `config.shuffle` property in your card content. It's an array of entries, where each entry defines which chapters to shuffle.

Each entry has three properties:

| Property | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| `start`  | 0-based index of the first chapter in the entry                  |
| `end`    | 0-based index of the last chapter in the entry (inclusive)       |
| `limit`  | Maximum number of chapters to keep in this entry after shuffling |

## Examples

### Shuffle all chapters

A card with 5 chapters where every chapter is shuffled:

```json
{
  "config": {
    "shuffle": [{ "start": 0, "end": 4, "limit": 5 }]
  }
}
```

### Fixed intro, shuffle the rest

A card with 10 chapters (indices 0–9) where chapter 0 always plays first and chapters 1–9 are shuffled:

```json
{
  "config": {
    "shuffle": [{ "start": 1, "end": 9, "limit": 9 }]
  }
}
```

Chapter 0 is outside the shuffle entry, so it stays in its original position.

### Pick a random subset

A card with 20 chapters where you want to play 5 random chapters each time:

```json
{
  "config": {
    "shuffle": [{ "start": 0, "end": 19, "limit": 5 }]
  }
}
```

All 20 chapters are shuffled, then cropped to 5. Each play session gets a different selection.

### Multiple independent entries

When there are multiple entries, they must not overlap. Each chapter index should appear in at most one entry. And entries must be ordered by their `start` index.

A card with 17 chapters where chapter 0 is a fixed intro, chapters 1–7 are morning stories (pick 2), chapters 8–9 are fixed interludes, and chapters 10–16 are bedtime stories (pick 2):

```json
{
  "config": {
    "shuffle": [
      { "start": 1, "end": 7, "limit": 2 },
      { "start": 10, "end": 16, "limit": 2 }
    ]
  }
}
```

Chapters 0, 8, and 9 are outside any shuffle entry and stay in place. Each entry shuffles and crops independently.

## Things to keep in mind

- `start`, `end`, and `limit` use **zero-based indices**
- Chapters outside any shuffle entry keep their original position
- With multiple entires, ordering matters and should follow ascending order from chapter 0 to N-1 in increasing order