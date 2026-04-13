import type { ContentSpotlightStatus, ContentSpotlightType } from '@prisma/client';
import type { ContentSpotlightBadgeCorner } from '@/lib/validation/contentSpotlightSchema';

/** Public-facing badge + popup payload for one story cover. */
export type StorySpotlightBadgeDTO = {
  spotlightId: string;
  slug: string;
  title: string;
  badgeUrl: string;
  badgeAlt: string;
  badgeCorner: ContentSpotlightBadgeCorner;
  showPopup: boolean;
  popupTitle: string;
  popupBody: string;
  shortBlurb: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

/** Info bar on story series page. */
export type StorySpotlightInfoBarDTO = {
  spotlightId: string;
  title: string;
  infoBarText: string;
  shortBlurb: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export type SpotlightRailStoryDTO = {
  storyId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  sortOrder: number;
  isFeatured: boolean;
};

export type SpotlightRailDTO = {
  spotlightId: string;
  slug: string;
  title: string;
  shortBlurb: string;
  type: ContentSpotlightType;
  priority: number;
  stories: SpotlightRailStoryDTO[];
};

export type CalendarMonthFilter = {
  status?: ContentSpotlightStatus[];
  types?: ContentSpotlightType[];
  activeOnly?: boolean;
  scheduledOnly?: boolean;
  expiredOnly?: boolean;
  awareness?: boolean;
  holiday?: boolean;
  homepageFeatured?: boolean;
  libraryFeatured?: boolean;
};

export type CalendarDayCellDTO = {
  day: number;
  /** Count of spotlighted stories active that day (unique stories across spotlights). */
  storyCount: number;
  /** Spotlights overlapping this calendar day. */
  spotlightIds: string[];
};

export type CalendarMonthSpotlightSummaryDTO = {
  id: string;
  internalName: string;
  title: string;
  slug: string;
  type: ContentSpotlightType;
  status: ContentSpotlightStatus;
  startAt: string;
  endAt: string;
  thumbnailCoverUrl: string | null;
  storyCount: number;
};

export type CalendarMonthDTO = {
  year: number;
  month: number;
  cells: CalendarDayCellDTO[];
  spotlights: CalendarMonthSpotlightSummaryDTO[];
};
