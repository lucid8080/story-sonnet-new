/** Same-origin silent placeholder used when signed URL or file is unavailable. */
export function sameOriginPlaceholderAudioUrl(): string {
  return new URL('/api/audio/placeholder', window.location.origin).href;
}

export function mediaErrorMessage(el: HTMLAudioElement | null): string {
  const code = el?.error?.code;
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return 'Audio format or source not supported';
  }
  if (code === MediaError.MEDIA_ERR_NETWORK) {
    return 'Network error loading audio';
  }
  if (code === MediaError.MEDIA_ERR_DECODE) {
    return 'Could not decode audio';
  }
  return 'Could not load audio file';
}

/** Wait until the element can play (or timeout) to avoid play() races right after src updates. */
export function waitForAudioReady(
  el: HTMLAudioElement,
  timeoutMs: number
): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('error', onReady);
      resolve();
    }, timeoutMs);
    function onReady() {
      window.clearTimeout(timer);
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('error', onReady);
      resolve();
    }
    el.addEventListener('canplay', onReady, { once: true });
    el.addEventListener('error', onReady, { once: true });
  });
}
