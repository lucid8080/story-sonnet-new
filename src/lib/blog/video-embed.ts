export type VideoProvider = 'youtube' | 'vimeo';

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
};

/** Extract YouTube or Vimeo id from a share / watch URL. */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  const url = raw.trim();
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0];
    return id ? { provider: 'youtube', id } : null;
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com'
  ) {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id ? { provider: 'youtube', id } : null;
    }
    const embedMatch = /^\/embed\/([^/?#]+)/.exec(parsed.pathname);
    if (embedMatch) return { provider: 'youtube', id: embedMatch[1] };
    const shortsMatch = /^\/shorts\/([^/?#]+)/.exec(parsed.pathname);
    if (shortsMatch) return { provider: 'youtube', id: shortsMatch[1] };
    return null;
  }

  if (host === 'vimeo.com') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0];
    return id && /^\d+$/.test(id) ? { provider: 'vimeo', id } : null;
  }

  if (host === 'player.vimeo.com') {
    const match = /^\/video\/(\d+)/.exec(parsed.pathname);
    return match ? { provider: 'vimeo', id: match[1] } : null;
  }

  return null;
}

function iframeSrc(provider: VideoProvider, id: string): string {
  if (provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  }
  return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
}

export function videoEmbedHtml(video: ParsedVideo): string {
  const src = iframeSrc(video.provider, video.id);
  const title =
    video.provider === 'youtube' ? 'YouTube video' : 'Vimeo video';
  return (
    `<div class="video-embed not-prose relative my-8 aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 shadow-sm" data-video-provider="${video.provider}" data-video-id="${video.id}">` +
    `<iframe class="absolute inset-0 h-full w-full border-0" src="${src}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>` +
    `</div>`
  );
}

const PARA_SOLE_VIDEO_LINK =
  /<p>(\s*)<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>(\s*)<\/p>/gi;

const VIDEO_ANCHOR =
  /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;

const PLAIN_VIDEO_URL_IN_PARA =
  /<p>([^<]*)(https?:\/\/[^\s<"']+)([^<]*)<\/p>/gi;

/** Turn pasted YouTube/Vimeo links into responsive iframe embeds. Idempotent. */
export function embedVideoLinksInBlogHtml(html: string): string {
  if (
    !html ||
    (!html.includes('youtube') &&
      !html.includes('youtu.be') &&
      !html.includes('vimeo'))
  ) {
    return html;
  }
  let out = html.replace(PARA_SOLE_VIDEO_LINK, (full, _pre, href) => {
    const video = parseVideoUrl(href);
    return video ? videoEmbedHtml(video) : full;
  });

  out = out.replace(PLAIN_VIDEO_URL_IN_PARA, (full, before, url, after) => {
    const video = parseVideoUrl(url);
    if (!video) return full;
    const rest = `${before ?? ''}${after ?? ''}`.trim();
    if (rest.length > 0) return full;
    return videoEmbedHtml(video);
  });

  out = out.replace(VIDEO_ANCHOR, (full, href) => {
    const video = parseVideoUrl(href);
    return video ? videoEmbedHtml(video) : full;
  });

  return out;
}
