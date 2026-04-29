import { describe, expect, it } from 'vitest';
import {
  draftStudioHrefForOrder,
  getProductionAudioStatus,
  mapEpisodePlaybackError,
} from '@/components/account/CustomStoryOrderCard';

describe('draftStudioHrefForOrder', () => {
  it('builds draft studio URL from order id', () => {
    expect(draftStudioHrefForOrder('ord_123')).toBe('/custom-stories/ord_123/studio');
  });
});

describe('getProductionAudioStatus', () => {
  it('flags incomplete production when episode audio is missing', () => {
    expect(getProductionAudioStatus(4, 2)).toEqual({
      missingAudioEpisodes: 2,
      productionIncomplete: true,
    });
  });

  it('marks production complete when all episode audio is available', () => {
    expect(getProductionAudioStatus(3, 3)).toEqual({
      missingAudioEpisodes: 0,
      productionIncomplete: false,
    });
  });
});

describe('mapEpisodePlaybackError', () => {
  it('returns friendly guidance for missing audio errors', () => {
    expect(mapEpisodePlaybackError('No audio for this episode')).toContain(
      'audio is not ready yet'
    );
  });

  it('falls back to generic playback message', () => {
    expect(mapEpisodePlaybackError('')).toBe(
      'Unable to fetch audio for this episode.'
    );
  });
});
