---
title: Card Content Schema
---

import SchemaTable from './SchemaTable.astro';

A Yoto card is a large JSON object which consists of a few components.

**cardId, title, and slug** - Identity fields that uniquely identify and name the card.

**metadata** - Descriptive information about the card including category, age range, author, cover image, description, languages, and status. This section helps users discover and understand the content.

**content** - The playback structure defining how the card plays, including chapters with tracks (audio files or streams), playback configuration, and activity type.

## Top-level card properties

<SchemaTable schema="baseCard" />



## Content 

<SchemaTable schema="content" />

## Metadata

<SchemaTable schema="metadata" />