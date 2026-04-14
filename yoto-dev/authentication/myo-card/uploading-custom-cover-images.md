---
title: Uploading custom cover images
---

import { Image } from "astro:assets";
import { Code } from "@astrojs/starlight/components";
import coverArt from "./cover-image.jpg";
import uploadCode from "./upload-cover-image.js?raw";

You can upload custom cover images to make your MYO cards visually distinctive and personalized.

The cover image upload process works as follows:

1. Send your image file to the Yoto API
2. Receive back a media URL
3. Use the URL in your playlist metadata

In this example, we'll be uploading this custom cover image and use it in a playlist.

<Image
  src={coverArt}
  alt="Custom cover art"
  width="300"
  height="auto"
  format="jpeg"
/>

## Upload your cover image

```javascript
import { readFileSync } from "node:fs";
const imageBuffer = readFileSync("./cover-image.jpg");

const imageFile = new Blob([imageBuffer]);

const url = new URL("https://api.yotoplay.com/media/coverImage/user/me/upload");
url.searchParams.set("autoconvert", "true");
url.searchParams.set("coverType", "default");

const uploadResponse = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "image/jpeg",
  },
  body: imageFile,
});

const uploadResult = await uploadResponse.json();
```

Once uploaded successfully, you'll receive a response containing:

```javascript
{
  "coverImage": {
    "mediaId": "uiM3MMWgQkG_zdd_EYHd93Z2OQSH5Hn069wDGdWANMc",
    "mediaUrl": "https://card-content.aws.fooropa.com/1bErAD2CBDPwN88jdjBO7aVSR1OGL5DOq05fyz6PioCs~/pub/uiM3MMWgQkG_zdd_EYHd93Z2OQSH5Hn069wDGdWANMc"
  }
}
```

### Upload parameters

You can customize the upload behavior with these query parameters:

- **`autoconvert`** (boolean): When set to `true` (recommended), Yoto will automatically resize and process your image to the appropriate cover image dimensions. If set to `false`, your image must already be in the correct format.
- **`imageUrl`** (string): Alternatively, you can provide a URL to an image instead of uploading a file.

## Using your uploaded cover image

We'll be using the `mediaUrl` from the upload response. We'll add this to the `cover` object in our playlist metadata as the `imageL` property.

```javascript
// Using the mediaUrl from the upload response
const { mediaUrl } = uploadResult.coverImage;

const content = {
  title: "My Custom Playlist",
  metadata: {
    cover: {
      imageL: mediaUrl, // Your custom cover image
    },
    description: "A playlist with custom cover art",
  },
  content: {
    chapters: [
      {
        key: "01",
        title: "Chapter 1",
        overlayLabel: "1",
        tracks: [
          {
            key: "01",
            title: "Track 1",
            trackUrl: "https://example.com/audio.mp3",
            type: "stream",
            format: "mp3",
          },
        ],
      },
    ],
  },
};
```

Your custom cover image will now be displayed as the card artwork in the Yoto app and on compatible players!

Here's an example of a complete workflow:

<Code lang="js" code={uploadCode} />