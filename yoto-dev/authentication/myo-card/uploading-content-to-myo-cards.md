---
title: Uploading content to MYO cards
---

import { Code } from "@astrojs/starlight/components";
import uploadCode from "./upload.js?raw";

## 1. Request Upload URL

First, get request a secure URL via the `/uploadUrl` endpoint. This is a temporary URL on our servers where you'll upload the audio file. This URL is secure and specific to this upload:

```javascript
const uploadUrlResponse = await fetch(
  "https://api.yotoplay.com/media/transcode/audio/uploadUrl",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  }
);

const {
  upload: { uploadUrl: audioUploadUrl, uploadId },
} = await uploadUrlResponse.json();

if (!audioUploadUrl) {
  throw new Error("Failed to get upload URL");
}
```

The response gives us an `upload` object with the following properties:

- `uploadUrl`: The URL where we'll upload our audio file
- `uploadId`: A unique identifier we'll use to check the transcoding status of the audio file.

## 2. Upload your audio file to the URL

Now you can upload you actual audio file to the URL we received with a `PUT` request:

```javascript
await fetch(audioUploadUrl, {
  method: "PUT",
  body: new Blob([audioFile], {
    type: audioFile.type,
    ContentDisposition: audioFile.name,
  }),
  headers: {
    "Content-Type": audioFile.type,
  },
});
```

Make sure to set the `Content-Type` header to match the type of your audio file.

## 3. Wait for transcoding

After upload, Yoto needs to transcode the audio to make it compatible with our Yoto players. We need to keep polling the API until the process is complete:

```javascript
let transcodedAudio = null;
let attempts = 0;
const maxAttempts = 30;

while (attempts < maxAttempts) {
  const transcodeResponse = await fetch(
    `https://api.yotoplay.com/media/upload/${uploadId}/transcoded?loudnorm=false`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (transcodeResponse.ok) {
    const data = await transcodeResponse.json();

    if (data.transcode.transcodedSha256) {
      transcodedAudio = data.transcode;
      break;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  attempts++;
}

if (!transcodedAudio) {
  throw new Error("Transcoding timed out");
}
```

We know that the transcoding is complete when we receive a `transcodedSha256` in the response. This is a hash of the transcoded audio file. We'll use this value to put our audio file in a track.

## 4. Create Playlist Content

We add our audio file to a track, using our transcoded value, and insert that track into a chapter. This creates a new playlist with your audio content.

```javascript
// Get media info from the transcoded audio
const mediaInfo = transcodedAudio.transcodedInfo;
const chapterTitle = mediaInfo?.metadata?.title || title;

const chapters = [
  {
    key: "01",
    title: chapterTitle,
    overlayLabel: "1",
    tracks: [
      {
        key: "01",
        title: chapterTitle,
        trackUrl: `yoto:#${transcodedAudio.transcodedSha256}`,
        duration: mediaInfo?.duration,
        fileSize: mediaInfo?.fileSize,
        channels: mediaInfo?.channels,
        format: mediaInfo?.format,
        type: "audio",
        overlayLabel: "1",
        display: {
          icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
        },
      },
    ],
    display: {
      icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
    },
  },
];

// Create the complete content object for a new playlist
const content = {
  title: title,
  content: {
    chapters,
  },
  metadata: {
    media: {
      duration: mediaInfo?.duration,
      fileSize: mediaInfo?.fileSize,
      readableFileSize:
        Math.round((mediaInfo?.fileSize / 1024 / 1024) * 10) / 10,
    },
  },
};

const createResponse = await fetch("https://api.yotoplay.com/content", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(content),
});

if (!createResponse.ok) {
  const errorText = await createResponse.text();
  throw new Error(`Failed to create playlist: ${errorText}`);
}

const result = await createResponse.json();
```

The process is complete when this final request returns successfully. Your audio should now appear in your library as a new playlist. You can now link this playlist to a Make Your Own (MYO) card via your Yoto player or the Yoto app.

Here's the complete code:

<Code lang="js" code={uploadCode} />