import type {
  ContentSpotlightStatus,
  ContentSpotlightType,
  Prisma,
} from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import prisma from '@/lib/prisma';
import type {
  CalendarDayCellDTO,
  CalendarMonthDTO,
  CalendarMonthFilter,
  CalendarMonthSpotlightSummaryDTO,
} from '@/lib/content-spotlight/types';
import {
  getYearlyWindowForCalendarYear,
  rangesOverlap,
  safeTimeZone,
  utcBoundsForCalendarMonth,
  wallTimeToUtc,
  type SpotlightWindowFields,
} from '@/lib/content-spotlight/window';
import { isMissingContentSpotlightSchemaError } from '@/lib/content-spotlight/prismaSafeQuery';
import { isSpotlightPubliclyVisible } from '@/lib/content-spotlight/visibility';

function lastDayOfMonth(year: number, month: number): number {
  /** `month` is 1–12; JS Date month index is 0-based. */
  return new Date(year, month, 0).getDate();
}

function spotlightWindowFields(row: {
  startAt: Date;
  endAt: Date;
  recurrence: SpotlightWindowFields['recurrence'];
  timezone: string;
}): SpotlightWindowFields {
  return {
    startAt: row.startAt,
    endAt: row.endAt,
    recurrence: row.recurrence,
    timezone: row.timezone,
  };
}

function windowOverlapsUtcRange(
  spotlight: {
    startAt: Date;
    endAt: Date;
    recurrence: SpotlightWindowFields['recurrence'];
    timezone: string;
  },
  rangeStart: Date,
  rangeEndInclusive: Date
): boolean {
  const sw = spotlightWindowFields(spotlight);
  if (spotlight.recurrence === 'one_time') {
    return rangesOverlap(
      spotlight.startAt,
      spotlight.endAt,
      rangeStart,
      rangeEndInclusive
    );
  }
  const tz = safeTimeZone(spotlight.timezone);
  const y = Number(formatInTimeZone(rangeStart, tz, 'yyyy'));
  for (const yy of [y - 1, y, y + 1]) {
    const w = getYearlyWindowForCalendarYear(sw, yy);
    if (rangesOverlap(w.start, w.end, rangeStart, rangeEndInclusive)) {
      return true;
    }
  }
  return false;
}

const monthCalendarInclude = {
  stories: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      storyId: true,
      story: { select: { coverUrl: true, isPublished: true } },
    },
  },
  badgeAsset: { select: { publicUrl: true } },
} satisfies Prisma.ContentSpotlightInclude;

type CalendarMonthSpotlightRow = Prisma.ContentSpotlightGetPayload<{
  include: typeof monthCalendarInclude;
}>;

function matchesFilters(
  row: {
    status: ContentSpotlightStatus;
    type: ContentSpotlightType;
    featureOnHomepage: boolean;
    featureOnLibraryPage: boolean;
  },
  filters: CalendarMonthFilter
): boolean {
  if (filters.status?.length && !filters.status.includes(row.status)) {
    return false;
  }
  if (filters.types?.length && !filters.types.includes(row.type)) {
    return false;
  }
  if (filters.homepageFeatured && !row.featureOnHomepage) return false;
  if (filters.libraryFeatured && !row.featureOnLibraryPage) return false;
  if (filters.holiday && row.type !== 'holiday') return false;
  if (filters.awareness && row.type !== 'awareness_month') return false;
  if (filters.activeOnly && row.status !== 'active') return false;
  if (filters.scheduledOnly && row.status !== 'scheduled') return false;
  if (filters.expiredOnly && row.status !== 'expired') return false;
  return true;
}

export async function resolveCalendarMonth(params: {
  year: number;
  month: number;
  viewTimeZone: string;
  filters?: CalendarMonthFilter;
}): Promise<CalendarMonthDTO> {
  const { year, month, viewTimeZone } = params;
  const filters = params.filters ?? {};
  const { monthStartUtc, nextMonthStartUtc } = utcBoundsForCalendarMonth(
    year,
    month,
    viewTimeZone
  );
  const rangeEndInclusive = new Date(nextMonthStartUtc.getTime() - 1);

  let rows: CalendarMonthSpotlightRow[];
  try {
    rows = await prisma.contentSpotlight.findMany({
      where: {},
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: monthCalendarInclude,
    });
  } catch (e) {
    if (isMissingContentSpotlightSchemaError(e)) {
      rows = [];
    } else {
      throw e;
    }
  }

  const filtered = rows.filter((r) => matchesFilters(r, filters));

  const overlapping = filtered.filter((r) =>
    windowOverlapsUtcRange(r, monthStartUtc, rangeEndInclusive)
  );

  const lastDay = lastDayOfMonth(year, month);
  const cells: CalendarDayCellDTO[] = [];
  const tz = safeTimeZone(viewTimeZone);

  for (let day = 1; day <= lastDay; day++) {
    const noon = wallTimeToUtc(year, month, day, 12, 0, 0, tz);
    const spotlightIds: string[] = [];
    const storyIdSet = new Set<string>();

    for (const s of overlapping) {
      if (!isSpotlightPubliclyVisible(s, noon)) continue;
      spotlightIds.push(s.id);
      for (const st of s.stories) {
        if (!st.story.isPublished) continue;
        storyIdSet.add(st.storyId.toString());
      }
    }

    cells.push({
      day,
      storyCount: storyIdSet.size,
      spotlightIds,
    });
  }

  const summaries: CalendarMonthSpotlightSummaryDTO[] = overlapping.map(
    (s) => {
      const firstCover = s.stories[0]?.story.coverUrl ?? null;
      return {
        id: s.id,
        internalName: s.internalName,
        title: s.title,
        slug: s.slug,
        type: s.type,
        status: s.status,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        thumbnailCoverUrl: firstCover ?? s.badgeAsset?.publicUrl ?? null,
        storyCount: s.stories.length,
      };
    }
  );

  return {
    year,
    month,
    cells,
    spotlights: summaries,
  };
}
