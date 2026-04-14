---
title: Streaming tracks
---

import { Code } from "@astrojs/starlight/components";
import streamingCode from "./streaming.js?raw";

A playlist can contain "streaming" tracks, where the audio is streamed from a URL when the track is played.

This is useful if you want to create dynamic content that changes all the time, like weather updates.

## How to create a streaming track

The key difference is in the track object, which needs the following:

- the `trackUrl` property should be set to the URL that hosts the audio
- the `type` property should be set to `stream`
- the `format` property should be set to the format of the stream, for example `mp3` or `aac`

Here is an example of how to create a streaming playlist:

<Code lang="js" code={streamingCode} />