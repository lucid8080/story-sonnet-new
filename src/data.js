const ASSETS_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ASSETS_BASE_URL) || '';

function assetPath(relativePath) {
  if (!ASSETS_BASE_URL) return relativePath;
  const base = ASSETS_BASE_URL.replace(/\/+$/, '');
  const rel = relativePath.replace(/^\/+/, '');
  return `${base}/${rel}`;
}

export const stories = [


  {
    slug: 'the-ube-folk-of-amihan-hollow',
    seriesTitle: 'The Ube Folk of Amihan Hollow',
    title: 'The Glow Root Relay',
    ageGroup: '5–8',
    durationLabel: '17 min',
    summary:
      'A magical harvest-and-sports adventure series about the original little purple people of Amihan Hollow, who grow moon-bright ube, protect their fields, and play joyful rival games with Taro Village.',
    cover: assetPath('/covers/the-ube-folk-of-amihan-hollow/cover.png'),
    accent: '#7c3aed',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Glow Root Relay',
        duration: '16:57',
        audioSrc: assetPath('/audio/the-ube-folk-of-amihan-hollow/episode-1.mp3'),
        description:
          'On the day of the big relay against Taro Village, Mina and the Ube Folk must protect their moon-bright harvest from root thieves without losing the warmth of the festival.',
      },
    ],
  },

  {
    slug: 'the-adventures-of-zubie-and-robo-rex',
    seriesTitle: 'The Adventures of Zubie and Robo-Rex',
    title: 'The Broken Toy That Fixed Itself',
    ageGroup: '4–7',
    durationLabel: '11 min',
    summary:
      'A cozy family adventure series where Zubie and his robot dinosaur best friend turn small everyday problems into warm mysteries full of heart.',
    cover: assetPath('/covers/the-adventures-of-zubie-and-robo-rex/cover.webp'),
    accent: '#3b82f6',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Broken Toy That Fixed Itself',
        duration: '10:37 (est.)',
        audioSrc: assetPath('/audio/the-adventures-of-zubie-and-robo-rex/episode-1.mp3'),
        description:
          'When Robo-Rex suddenly goes quiet at bedtime, Zubie follows a trail of tiny clues and discovers that the real magic in his house looks a lot like love.',
      },
    ],
  },

  {
    slug: 'nori-and-the-pocket-meadow',
    seriesTitle: 'Nori and the Pocket Meadow',
    title: 'The Crickets Who Misplaced Their Evening Song',
    ageGroup: '5–8',
    durationLabel: '15 min',
    summary:
      'A twilight meadow adventure series where Nori helps tiny creatures and shy evening magic find their rhythm again.',
    cover: assetPath('/covers/nori-and-the-pocket-meadow/cover.png'),
    accent: '#84cc16',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Crickets Who Misplaced Their Evening Song',
        duration: '14:53',
        audioSrc: assetPath('/audio/nori-and-the-pocket-meadow/episode-1.mp3'),
        description:
          'Nori helps a tiny cricket orchestra rebuild the missing middle of their twilight song so the stars can return in calm, glowing order.',
      },
    ],
  },
  {
    slug: 'juniper-and-the-lantern-library',
    seriesTitle: 'Juniper and the Lantern Library',
    title: 'The Shelf That Needed a Song',
    ageGroup: '5–8',
    durationLabel: '10 min',
    summary:
      'A cozy magical library-cart adventure series where Juniper helps a sighing music shelf remember how to listen again.',
    cover: assetPath('/covers/juniper-and-the-lantern-library/cover.png'),
    accent: '#f59e0b',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Shelf That Needed a Song',
        duration: '10:14',
        audioSrc: assetPath('/audio/juniper-and-the-lantern-library/episode-1.mp3'),
        description:
          'Juniper and Miss Marabel gather three listening sounds to help a drooping shelf of song books settle back into harmony.',
      },
    ],
  },
  {
    slug: 'the-secret-map-of-the-7641-islands',
    seriesTitle: 'Lila & Mateo - The 7,641 Islands Adventures',
    title: 'The Secret Map of the 7,641 Islands',
    ageGroup: '6–8',
    durationLabel: '5 min',
    summary:
      'A sea-swept treasure adventure with a mysterious map, bright island clues, and plenty of wonder.',
    cover: assetPath('/covers/the-secret-map-of-the-7641-islands/cover.webp'),
    accent: '#0ea5e9',
    isPremium: true,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Secret Map of the 7,641 Islands',
        duration: '5:23',
        audioSrc: assetPath('/audio/the-secret-map-of-the-7641-islands/episode-1.mp3'),
        description: 'Lila and Mateo discover a map that shimmers with island secrets.',
      },
    ],
  },
  {
    slug: 'pip-and-the-moonlight-mailbox',
    seriesTitle: "Pip's Moonlight Adventures",
    title: 'The Letter for the Bravest Good Helper',
    ageGroup: '4–6',
    durationLabel: '5 min',
    summary:
      'A cozy moonlit delivery adventure about kindness, tiny bravery, and magical nighttime letters.',
    cover: assetPath('/covers/pip-and-the-moonlight-mailbox/cover.webp'),
    accent: '#8b5cf6',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Letter for the Bravest Good Helper',
        duration: '10:11',
        audioSrc: assetPath('/audio/pip-and-the-moonlight-mailbox/episode-1.mp3'),
        description:
          'Pip follows a moonlit mission to deliver three magical notes before sunrise.',
      },
      {
        id: 2,
        label: 'Episode 2',
        title: "The Puddle That Wouldn't Hold Still",
        duration: '13:08',
        audioSrc: assetPath('/audio/pip-and-the-moonlight-mailbox/episode-2.mp3'),
        description:
          'Pip helps a worried puddle and its nervous reflection find a quiet moment before sunrise.',
      },
    ],
  },

  {
    slug: 'blocky-explores-mine-world',
    seriesTitle: 'Blocky Explores Mine World',
    title: 'Blocky Builds a Fort',
    ageGroup: '5–8',
    durationLabel: '10 min',
    summary:
      'A lively block-world adventure series about building, exploring, teamwork, and funny near-disasters.',
    cover: assetPath('/covers/blocky-explores-mine-world/cover.webp'),
    accent: '#22c55e',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'Blocky Builds a Fort',
        duration: '10:33',
        audioSrc: assetPath('/audio/blocky-explores-mine-world/episode-1.mp3'),
        description:
          'Blocky and friends discover that tiny blocks, big ideas, and cube-storms do not always mix neatly.',
      },
      {
        id: 2,
        label: 'Episode 2',
        title: "Blocky Finds a Shortcut That Wouldn't Stay Short",
        duration: '10:43',
        audioSrc: assetPath('/audio/blocky-explores-mine-world/episode-2.mp3'),
        description:
          'Blocky rushes toward Glowberry Grove and learns that some shortcuts only work when friends slow down and help each other.',
      },
    ],
  },
  {
    slug: 'keepers-of-turtleshell-city',
    seriesTitle: 'The Keepers of Turtleshell City',
    title: 'The Bell Beneath the Lantern Streets',
    ageGroup: '5–8',
    durationLabel: '15:13',
    summary:
      'A wonder-filled adventure series about the cozy maintenance crew who care for a walking turtle-city and keep its streets, engines, gardens, and giant gentle heart in balance.',
    cover: assetPath('/covers/keepers-of-turtleshell-city/cover.webp'),
    accent: '#14b8a6',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Bell Beneath the Lantern Streets',
        duration: '15:13',
        audioSrc: assetPath('/audio/keepers-of-turtleshell-city/episode-1.mp3'),
        description:
          'When a hush falls through the pipes and a hidden bell begins to ring inside the turtle-city, the maintenance crew must follow the sound to help their great walking home rest safely.',
      },
    ],
  },

  {
    slug: 'luna-and-the-starlight-garden',
    seriesTitle: 'Luna and the Starlight Garden',
    title: 'The Seeds That Hummed Goodnight',
    ageGroup: '3–5',
    durationLabel: '4 min',
    summary:
      'A gentle night garden visit where Luna learns that sleepy flowers glow brighter when everyone breathes slowly together.',
    cover: assetPath('/covers/luna-and-the-starlight-garden/cover.webp'),
    accent: '#a78bfa',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Seeds That Hummed Goodnight',
        duration: '4:12',
        audioSrc: assetPath('/audio/the-secret-map-of-the-7641-islands/episode-1.mp3'),
        description:
          'Luna follows tiny silver seeds that only open when the house is quiet enough for dreams.',
      },
    ],
  },

  {
    slug: 'detective-chipmunks-first-case',
    seriesTitle: 'Detective Chipmunk',
    title: 'The Case of the Missing Acorn Crown',
    ageGroup: '6–8',
    durationLabel: '8 min',
    summary:
      'A woodland whodunit with clues, suspects, and a very serious chipmunk who takes notes on everything.',
    cover: assetPath('/covers/detective-chipmunks-first-case/cover.webp'),
    accent: '#b45309',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Case of the Missing Acorn Crown',
        duration: '8:05',
        audioSrc: assetPath('/audio/the-secret-map-of-the-7641-islands/episode-1.mp3'),
        description:
          'Detective Nutmeg interviews three squirrels and one very suspicious pile of leaves.',
      },
    ],
  },

  {
    slug: 'teds-counting-train',
    seriesTitle: "Ted's Number Line Express",
    title: 'Ten Friendly Cars and a Quiet Tunnel',
    ageGroup: '3–5',
    durationLabel: '6 min',
    summary:
      'A calm counting ride with Ted the engine—perfect for little listeners who like patterns and gentle repetition.',
    cover: assetPath('/covers/teds-counting-train/cover.webp'),
    accent: '#ef4444',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'Ten Friendly Cars and a Quiet Tunnel',
        duration: '6:02',
        audioSrc: assetPath('/audio/the-secret-map-of-the-7641-islands/episode-1.mp3'),
        description:
          'Ted counts cars, tunnels, and sleepy sheep outside the window until the station arrives.',
      },
    ],
  },

  {
    slug: 'maya-and-the-laughing-cloud',
    seriesTitle: 'Maya and the Laughing Cloud',
    title: 'The Giggle Storm',
    ageGroup: '6–8',
    durationLabel: '7 min',
    summary:
      'When a storm cloud catches the giggles, Maya helps it rain happy little surprises instead of grumbles.',
    cover: assetPath('/covers/maya-and-the-laughing-cloud/cover.webp'),
    accent: '#38bdf8',
    isPremium: false,
    episodes: [
      {
        id: 1,
        label: 'Episode 1',
        title: 'The Giggle Storm',
        duration: '7:18',
        audioSrc: assetPath('/audio/the-secret-map-of-the-7641-islands/episode-1.mp3'),
        description:
          'Maya trades frowns for funny faces until the sky remembers how to smile.',
      },
    ],
  },

];

export function getStoryBySlug(slug) {
  return stories.find((story) => story.slug === slug);
}
