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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
