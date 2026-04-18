import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** @type {Array<{ slug: string; name: string; description: string; defaults: Record<string, unknown> }>} */
const PRESETS = [
  {
    slug: 'goldfish-superhero',
    name: 'Goldfish Superhero',
    description: 'Tiny hero, big heart — gentle humor and brave little choices.',
    defaults: {
      studioAgeBand: '5-7',
      storyType: 'funny',
      format: 'standalone',
      targetLengthRange: '4-5',
      tone: 'whimsical',
      lesson: 'confidence',
      characterType: 'animal',
      setting: 'ocean',
      narrationStyle: 'playful',
      voiceEnergy: 'lively',
      tagDensity: 'medium',
      genreHint: 'funny',
      moodHint: 'uplifting',
      flavor:
        'A small goldfish believes it can help friends in the tank and the whole wide world. Keep stakes cozy and victories emotional, not violent.',
      coverArtDirection:
        'Bright underwater kids poster, heroic goldfish with a tiny cape, soft bubbles, no text',
      musicDirection:
        'Upbeat playful orchestral with gentle ukulele, child-safe, no lyrics or very simple wordless choir',
    },
  },
  {
    slug: 'sleepy-space-bunny',
    name: 'Sleepy Space Bunny',
    description: 'Soft sci-fi bedtime with slow rhythm and cozy stars.',
    defaults: {
      studioAgeBand: '3-5',
      storyType: 'bedtime',
      format: 'standalone',
      targetLengthRange: '4-5',
      tone: 'soothing',
      lesson: 'bedtime-calm',
      characterType: 'animal',
      setting: 'space',
      narrationStyle: 'sleepy-bedtime',
      voiceEnergy: 'calm',
      tagDensity: 'light',
      genreHint: 'bedtime',
      moodHint: 'bedtime',
      flavor:
        'A bunny on a quiet moon mission that is really about yawning, soft beeps, and drifting to sleep.',
      coverArtDirection:
        'Pastel space nursery art, bunny in a small round helmet, stars and moon, dreamy',
      musicDirection:
        'Ambient lullaby pads, very slow tempo, no sudden dynamics',
    },
  },
  {
    slug: 'detective-chipmunk',
    name: 'Detective Chipmunk',
    description: 'Low-stakes mystery with kindness and clever noticing.',
    defaults: {
      studioAgeBand: '5-7',
      storyType: 'mystery',
      format: 'mini-series',
      targetLengthRange: '4-5',
      episodeCount: 3,
      tone: 'curious',
      lesson: 'teamwork',
      characterType: 'animal',
      setting: 'forest',
      narrationStyle: 'warm',
      voiceEnergy: 'expressive',
      tagDensity: 'medium',
      genreHint: 'mystery',
      moodHint: 'learning-time',
      flavor:
        'Missing acorns, mixed-up clues, and a friend who needs help — solved with questions, not scares.',
      coverArtDirection:
        'Forest detective storybook cover, chipmunk with magnifying leaf, warm daylight',
      musicDirection:
        'Light pizzicato mystery theme, friendly not spooky',
    },
  },
  {
    slug: 'brave-little-train',
    name: 'Brave Little Train',
    description: 'Journey story about trying when something feels hard.',
    defaults: {
      studioAgeBand: '3-5',
      storyType: 'adventure',
      format: 'standalone',
      targetLengthRange: '4-5',
      tone: 'heartfelt',
      lesson: 'trying-new-things',
      characterType: 'vehicle',
      setting: 'city',
      narrationStyle: 'warm',
      voiceEnergy: 'expressive',
      tagDensity: 'medium',
      genreHint: 'adventure',
      moodHint: 'uplifting',
      flavor:
        'A small train is nervous about a new route; friends along the track cheer with sounds and signals.',
      coverArtDirection:
        'Colorful illustrated train, friendly face on engine, rolling hills optional',
      musicDirection:
        'Gentle chugging rhythm in music, major key, hopeful bridge',
    },
  },
  {
    slug: 'laughing-cloud',
    name: 'Laughing Cloud',
    description: 'Silly sky-high fun with safe slapstick in the air.',
    defaults: {
      studioAgeBand: '3-5',
      storyType: 'silly-chaos',
      format: 'standalone',
      targetLengthRange: '4-5',
      tone: 'funny',
      lesson: 'sharing',
      characterType: 'magical-creature',
      setting: 'dream-world',
      narrationStyle: 'playful',
      voiceEnergy: 'lively',
      tagDensity: 'expressive',
      genreHint: 'funny',
      moodHint: 'uplifting',
      flavor:
        'A cloud that laughs too hard and accidentally rains on a picnic — makes it right with a rainbow plan.',
      coverArtDirection:
        'Fluffy cartoon cloud with a smile, rainbow hints, bright sky',
      musicDirection:
        'Bouncy comedy underscore, light percussion',
    },
  },
  {
    slug: 'robot-best-friend',
    name: 'Robot Best Friend',
    description: 'Friendship and feelings with a gentle robot co-star.',
    defaults: {
      studioAgeBand: '6-8',
      storyType: 'friendship',
      format: 'standalone',
      targetLengthRange: '4-5',
      tone: 'heartfelt',
      lesson: 'kindness',
      characterType: 'robot',
      setting: 'school',
      narrationStyle: 'warm',
      voiceEnergy: 'calm',
      tagDensity: 'medium',
      genreHint: 'friendship',
      moodHint: 'calm-quiet',
      flavor:
        'A kid teaches a robot about jokes, apologies, and listening. No dystopia, no abandonment fear.',
      coverArtDirection:
        'Friendly round robot and child walking together, schoolyard soft focus',
      musicDirection:
        'Warm synth pads with acoustic guitar, hopeful',
    },
  },
  {
    slug: 'bedtime-dragon',
    name: 'Bedtime Dragon',
    description: 'Cozy dragon who guards dreams, not people.',
    defaults: {
      studioAgeBand: '3-5',
      storyType: 'bedtime',
      format: 'standalone',
      targetLengthRange: '4-5',
      tone: 'cozy',
      lesson: 'bedtime-calm',
      characterType: 'magical-creature',
      setting: 'castle',
      narrationStyle: 'sleepy-bedtime',
      voiceEnergy: 'calm',
      tagDensity: 'light',
      genreHint: 'fantasy',
      moodHint: 'bedtime',
      flavor:
        'A dragon who is shy about snoring and learns to breathe slow rainbow breaths for sleepy villages.',
      coverArtDirection:
        'Soft illustrated dragon curled around a toy castle, moonlight, no scary teeth',
      musicDirection:
        'Harp and soft strings, very gradual fade',
    },
  },
];

async function seedSampleCampaigns() {
  const now = new Date();
  const starts = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ends = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const topBarName = 'seed-sonnet-top-bar';
  const existingBar = await prisma.campaign.findFirst({
    where: { internalName: topBarName },
  });
  if (!existingBar) {
    await prisma.campaign.create({
      data: {
        type: 'notification_bar',
        status: 'active',
        internalName: topBarName,
        priority: 10,
        startsAt: starts,
        endsAt: ends,
        timezone: 'UTC',
        publishedAt: now,
        placements: {
          create: [{ placement: 'global_top_bar' }],
        },
        notificationDetail: {
          create: {
            messagePrimary: 'Welcome to Story Sonnet — sample announcement bar (seed data).',
            messageSecondary: 'Dismissible; edit in Admin → Campaigns & Offers.',
            ctaLabel: 'See pricing',
            ctaUrl: '/pricing',
            dismissible: true,
            dismissPolicy: 'hours_24',
            bgVariant: 'brand',
            textVariant: 'light',
            audience: 'all',
          },
        },
      },
    });
    console.log('Seeded sample notification bar campaign.');
  }

  const promoName = 'seed-promo-draft';
  const existingPromo = await prisma.campaign.findFirst({
    where: { internalName: promoName },
  });
  if (!existingPromo) {
    await prisma.campaign.create({
      data: {
        type: 'promo_code',
        status: 'draft',
        internalName: promoName,
        priority: 0,
        startsAt: starts,
        endsAt: ends,
        timezone: 'UTC',
        placements: {
          create: [{ placement: 'pricing_banner' }],
        },
        promoDetail: {
          create: {
            codeRaw: 'WELCOME10',
            codeNormalized: 'welcome10',
            publicTitle: '10% off (sample)',
            description: 'Draft promo — activate in admin when ready.',
            discountType: 'percent',
            discountValue: 10,
            appliesToAllPlans: true,
            planKeysJson: [],
            durationMode: 'once',
            stackingRule: 'with_trial',
          },
        },
      },
    });
    console.log('Seeded sample draft promo campaign.');
  }

  const trialName = 'seed-trial-paused';
  const existingTrial = await prisma.campaign.findFirst({
    where: { internalName: trialName },
  });
  if (!existingTrial) {
    await prisma.campaign.create({
      data: {
        type: 'trial_offer',
        status: 'paused',
        internalName: trialName,
        priority: 5,
        startsAt: starts,
        endsAt: ends,
        timezone: 'UTC',
        placements: {
          create: [{ placement: 'pricing_banner' }, { placement: 'modal_trigger' }],
        },
        trialDetail: {
          create: {
            headline: '7-day trial (paused sample)',
            subheadline: 'Paused — unpause in admin to go live.',
            badgeText: 'TRIAL',
            ctaLabel: 'Claim offer',
            offerKind: 'fixed_duration',
            durationDays: 7,
            eligibilityJson: {
              newAccountsOnly: false,
              neverPaidOnly: true,
              excludeActiveSubscribers: true,
            },
            unlimitedRedemptions: true,
          },
        },
      },
    });
    console.log('Seeded sample paused trial campaign.');
  }
}

async function seedContentSpotlights() {
  const stories = await prisma.story.findMany({
    where: { isPublished: true },
    orderBy: { sortPriority: 'desc' },
    take: 6,
    select: { id: true, slug: true },
  });
  if (stories.length === 0) {
    console.log('Skip content spotlight seed: no published stories.');
    return;
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ).replace(/\/+$/, '');
  const placeholderBadgeUrl = `${baseUrl}/branding/logo_display.webp`;

  const existing = await prisma.badgeAsset.findFirst({
    where: { name: 'seed-spotlight-badge' },
  });
  let badgeId = existing?.id;
  if (!badgeId) {
    const b = await prisma.badgeAsset.create({
      data: {
        name: 'seed-spotlight-badge',
        publicUrl: placeholderBadgeUrl,
        storagePath: 'seed/spotlight-badge-placeholder',
        altText: 'Sample spotlight badge',
        mimeType: 'image/png',
      },
    });
    badgeId = b.id;
    console.log('Seeded placeholder BadgeAsset for spotlights.');
  }

  const pickIds = stories.map((s) => s.id);
  const windowStart = new Date('2026-01-01T00:00:00.000Z');
  const windowEnd = new Date('2026-12-31T23:59:59.000Z');
  const now = new Date();

  const seeds = [
    {
      slug: 'daffodil-month-2026',
      internalName: 'seed-daffodil-month',
      title: 'Featured for Daffodil Month',
      type: 'awareness_month',
      shortBlurb:
        'Bright, hopeful stories for spring — gentle listening for families.',
      popupTitle: 'Daffodil Month',
      popupBody:
        'April is Daffodil Month. Enjoy a cozy playlist of uplifting audio stories together.',
      infoBarText:
        'April spotlight: warm stories picked for Daffodil Month. Tap the badge to learn more.',
      featureOnHomepage: true,
      featureOnLibraryPage: true,
    },
    {
      slug: 'earth-day-story-picks',
      internalName: 'seed-earth-day',
      title: 'Earth Day Story Picks',
      type: 'seasonal',
      shortBlurb: 'Celebrate nature with gentle adventures and outdoor wonder.',
      popupTitle: 'Earth Day',
      popupBody:
        'Earth Day is a chance to explore kindness toward our planet through calm, kid-friendly fiction.',
      infoBarText: 'Earth Day picks: nature-friendly listening for curious kids.',
      featureOnHomepage: true,
      featureOnLibraryPage: false,
    },
    {
      slug: 'halloween-favorites',
      internalName: 'seed-halloween',
      title: 'Halloween Favorites',
      type: 'holiday',
      shortBlurb: 'Friendly-not-frightful tales for spooky season.',
      popupTitle: 'Halloween',
      popupBody:
        'Not-too-spooky stories made for young listeners — cozy chills, no nightmares.',
      infoBarText: 'Halloween shelf: silly-spooky stories for little listeners.',
      featureOnHomepage: false,
      featureOnLibraryPage: true,
    },
    {
      slug: 'winter-wonder-stories',
      internalName: 'seed-winter-wonder',
      title: 'Winter Wonder Stories',
      type: 'seasonal',
      shortBlurb: 'Snowy scenes, warm hearts, and cozy audio for cold nights.',
      popupTitle: 'Winter picks',
      popupBody:
        'Curated winter listening: gentle pacing, cozy settings, and feel-good endings.',
      infoBarText: 'Winter wonder: our coziest seasonal listening line-up.',
      featureOnHomepage: true,
      featureOnLibraryPage: true,
    },
  ];

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    const exists = await prisma.contentSpotlight.findUnique({
      where: { slug: s.slug },
    });
    if (exists) continue;

    const n = Math.min(3, pickIds.length);
    const start = i % Math.max(1, pickIds.length - n + 1);
    const slice = pickIds.slice(start, start + n);
    await prisma.contentSpotlight.create({
      data: {
        internalName: s.internalName,
        title: s.title,
        slug: s.slug,
        type: s.type,
        shortBlurb: s.shortBlurb,
        longDescription: null,
        popupTitle: s.popupTitle,
        popupBody: s.popupBody,
        infoBarText: s.infoBarText,
        ctaLabel: 'Learn more',
        ctaUrl: `${baseUrl}/accessibility`,
        startAt: windowStart,
        endAt: windowEnd,
        timezone: 'UTC',
        recurrence: 'one_time',
        status: 'active',
        publishedAt: now,
        showBadge: true,
        showPopup: true,
        showInfoBar: true,
        featureOnHomepage: s.featureOnHomepage,
        featureOnLibraryPage: s.featureOnLibraryPage,
        priority: 100 - i,
        badgeAssetId: badgeId,
        stories: {
          create: slice.map((storyId, j) => ({
            storyId,
            sortOrder: j,
            isFeatured: j === 0,
          })),
        },
      },
    });
    console.log(`Seeded spotlight: ${s.slug}`);
  }
}

async function main() {
  for (const p of PRESETS) {
    await prisma.storyStudioPreset.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        defaults: p.defaults,
      },
      update: {
        name: p.name,
        description: p.description,
        defaults: p.defaults,
      },
    });
  }
  console.log(`Seeded ${PRESETS.length} Story Studio presets.`);

  await seedSampleCampaigns();
  await seedContentSpotlights();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
