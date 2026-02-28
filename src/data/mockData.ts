export type Visibility = 'specific_friends' | 'all_friends';
export type FindType = 'article' | 'product' | 'place' | 'video' | 'music' | 'recipe' | 'other';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
}

export interface Find {
  id: string;
  authorId: string;
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  type: FindType;
  visibility: Visibility;
  specificFriendIds?: string[];
  groupIds?: string[];
  sectionId?: string;
  likes: string[];
  saved: string[];
  comments: Comment[];
  createdAt: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  ownerId: string;
  coverImageUrl?: string;
  emoji: string;
}

export interface Section {
  id: string;
  userId: string;
  name: string;
  visibility: Visibility;
  specificFriendIds?: string[];
}

export interface Invite {
  id: string;
  fromUserId: string;
  toUserId?: string;
  inviteCode?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export const currentUserId = 'u1';

export const users: User[] = [
  {
    id: 'u1',
    username: 'priya_s',
    displayName: 'Priya Sharma',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=priya',
    bio: 'Collector of cozy things & odd links.',
  },
  {
    id: 'u2',
    username: 'arjun_m',
    displayName: 'Arjun Mehta',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=arjun',
    bio: 'Maps, trails, and local eats.',
  },
  {
    id: 'u3',
    username: 'neha_v',
    displayName: 'Neha Verma',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=neha',
    bio: 'Books, type, and slow mornings.',
  },
  {
    id: 'u4',
    username: 'rohan_k',
    displayName: 'Rohan Kapoor',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=rohan',
    bio: 'Sustainable tech & urban farms.',
  },
];

export const friendIds = ['u2', 'u3', 'u4'];

export const circles: Circle[] = [
  {
    id: 'c1',
    name: 'The Usual Crew',
    description: 'All three of us — everything goes here.',
    memberIds: ['u1', 'u2', 'u3', 'u4'],
    ownerId: 'u1',
    emoji: '👥',
    coverImageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=60',
  },
  {
    id: 'c2',
    name: 'Priya & Arjun',
    description: 'Just the two of us.',
    memberIds: ['u1', 'u2'],
    ownerId: 'u1',
    emoji: '🗺️',
    coverImageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=60',
  },
  {
    id: 'c3',
    name: 'Priya & Neha',
    description: 'Books, recipes, slow things.',
    memberIds: ['u1', 'u3'],
    ownerId: 'u1',
    emoji: '📚',
    coverImageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=60',
  },
];

// Hobby-based sections for Priya (u1)
export const sections: Section[] = [
  { id: 's1', userId: 'u1', name: 'Films', visibility: 'all_friends' },
  { id: 's2', userId: 'u1', name: 'TV Shows', visibility: 'all_friends' },
  { id: 's3', userId: 'u1', name: 'Restaurants', visibility: 'all_friends' },
  { id: 's4', userId: 'u1', name: 'Books', visibility: 'all_friends' },
  { id: 's5', userId: 'u1', name: 'Recipes', visibility: 'all_friends' },
  { id: 's6', userId: 'u1', name: 'Articles', visibility: 'all_friends' },
  { id: 's7', userId: 'u1', name: 'YouTube', visibility: 'all_friends' },
  { id: 's8', userId: 'u1', name: 'News', visibility: 'all_friends' },
  { id: 's9', userId: 'u1', name: 'Secret Stash', visibility: 'specific_friends', specificFriendIds: ['u3'] },
];

export const finds: Find[] = [
  // ─── Friends' finds ──────────────────────────────────────────
  {
    id: 'f1',
    authorId: 'u2',
    title: 'The Perfect ANC Headphones Under $100',
    description: 'Tried six pairs over two months — this one surprised me. Punchy bass, 40hr battery, and the ANC actually works on planes.',
    url: 'https://example.com/headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=60',
    type: 'product',
    visibility: 'all_friends',
    groupIds: ['c1'],
    likes: ['u1', 'u3'],
    saved: ['u1'],
    comments: [
      { id: 'cm1', authorId: 'u1', text: 'Which model exactly?', createdAt: new Date('2025-01-14T10:00:00') },
      { id: 'cm2', authorId: 'u2', text: 'Anker Q45 — linked above!', createdAt: new Date('2025-01-14T10:30:00') },
    ],
    createdAt: new Date('2025-01-14T09:00:00'),
  },
  {
    id: 'f2',
    authorId: 'u3',
    title: '"The Ministry for the Future" — slow burn, essential read',
    description: "Kim Stanley Robinson at his most urgent. Dense but rewarding. Especially the first chapter — one of the best I've read.",
    url: 'https://example.com/ministry-future',
    imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&q=60',
    type: 'article',
    visibility: 'all_friends',
    groupIds: ['c3'],
    likes: ['u1', 'u2'],
    saved: [],
    comments: [],
    createdAt: new Date('2025-01-13T15:00:00'),
  },
  {
    id: 'f3',
    authorId: 'u4',
    title: 'Rooftop Garden in Detroit — Community Eats',
    description: 'Visited this last summer. 2-acre rooftop farm growing 50+ varieties. Tours on weekends, fresh produce stand below.',
    url: 'https://example.com/detroit-garden',
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=60',
    type: 'place',
    visibility: 'all_friends',
    groupIds: ['c1'],
    likes: ['u1', 'u3'],
    saved: ['u2', 'u1'],
    comments: [
      { id: 'cm3', authorId: 'u2', text: 'Adding this to my Detroit trip list!', createdAt: new Date('2025-01-12T11:00:00') },
    ],
    createdAt: new Date('2025-01-12T09:30:00'),
  },
  {
    id: 'f6',
    authorId: 'u2',
    title: 'Lisbon Hidden Neighbourhood: Mouraria at Dusk',
    description: 'Skip the touristy parts. Head to Mouraria around 6pm — Fado spilling out of windows, old tiled buildings, killer pasteis.',
    url: 'https://example.com/lisbon-mouraria',
    imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=60',
    type: 'place',
    visibility: 'all_friends',
    groupIds: ['c2'],
    likes: ['u1', 'u3'],
    saved: ['u1'],
    comments: [],
    createdAt: new Date('2025-01-09T12:00:00'),
  },
  {
    id: 'f7',
    authorId: 'u3',
    title: 'ObsidianMD + Dataview Plugin = Brain OS',
    description: 'Sharing my reading tracker setup. Pull quotes, ratings, and summaries across notes automatically. Template in the link.',
    url: 'https://example.com/obsidian-setup',
    imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=60',
    type: 'article',
    visibility: 'all_friends',
    groupIds: ['c1'],
    likes: ['u1', 'u4'],
    saved: ['u1', 'u4'],
    comments: [],
    createdAt: new Date('2025-01-08T10:00:00'),
  },

  // ─── Priya's finds ──────────────────────────────────────────
  {
    id: 'f5',
    authorId: 'u1',
    title: 'Cast Iron Skillet Cornbread — No-Fuss Recipe',
    description: 'Crispy bottom, tender crumb. Takes 25 minutes. I make this every Sunday now. The secret: preheat your pan.',
    url: 'https://example.com/cornbread',
    imageUrl: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=600&q=60',
    type: 'recipe',
    visibility: 'all_friends',
    sectionId: 's5',
    groupIds: ['c3'],
    likes: ['u2', 'u3', 'u4'],
    saved: ['u3'],
    comments: [
      { id: 'cm4', authorId: 'u3', text: 'Making this weekend!', createdAt: new Date('2025-01-10T18:00:00') },
    ],
    createdAt: new Date('2025-01-10T14:00:00'),
  },
  {
    id: 'f8',
    authorId: 'u1',
    title: 'Riso-printed zine: "Infrastructure"',
    description: 'Small indie press making zines about power grids, water systems, and the hidden architectures of cities. Really beautiful.',
    url: 'https://example.com/riso-zine',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=60',
    type: 'product',
    visibility: 'specific_friends',
    specificFriendIds: ['u3'],
    sectionId: 's9',
    likes: ['u3'],
    saved: [],
    comments: [],
    createdAt: new Date('2025-01-07T16:00:00'),
  },
  {
    id: 'f9',
    authorId: 'u1',
    title: 'Dune: Part Two — Cinema at its Biggest',
    description: "Villeneuve did it again. The sandworm riding scene alone is worth a cinema ticket. Don't watch this on a laptop, please.",
    url: 'https://example.com/dune-part-two',
    imageUrl: 'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=600&q=60',
    type: 'video',
    visibility: 'all_friends',
    sectionId: 's1',
    likes: ['u2'],
    saved: ['u2'],
    comments: [],
    createdAt: new Date('2025-01-06T20:00:00'),
  },
  {
    id: 'f10',
    authorId: 'u1',
    title: 'Shogun (FX) — Historical Drama Done Properly',
    description: "Best TV of last year, no argument. Subtitled, slow-paced, and completely gripping. Hiroyuki Sanada is extraordinary.",
    url: 'https://example.com/shogun-fx',
    imageUrl: 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=600&q=60',
    type: 'video',
    visibility: 'all_friends',
    sectionId: 's2',
    likes: ['u3', 'u4'],
    saved: [],
    comments: [
      { id: 'cm5', authorId: 'u3', text: 'Finally watched it, obsessed.', createdAt: new Date('2025-01-05T21:00:00') },
    ],
    createdAt: new Date('2025-01-05T19:00:00'),
  },
  {
    id: 'f11',
    authorId: 'u1',
    title: 'Dishoom — Covent Garden (the Bacon Naan)',
    description: "The breakfast menu alone justifies the queue. Get there 20 min before they open. The bacon naan with cream cheese is not negotiable.",
    url: 'https://example.com/dishoom',
    imageUrl: 'https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=600&q=60',
    type: 'place',
    visibility: 'all_friends',
    sectionId: 's3',
    likes: ['u2', 'u4'],
    saved: ['u2'],
    comments: [],
    createdAt: new Date('2025-01-04T12:00:00'),
  },
  {
    id: 'f12',
    authorId: 'u1',
    title: '"Demon Copperhead" — Barbara Kingsolver',
    description: "Pulitzer-winning retelling of David Copperfield set in Appalachian opioid crisis. Devastating, gorgeous, impossible to put down.",
    url: 'https://example.com/demon-copperhead',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=60',
    type: 'article',
    visibility: 'all_friends',
    sectionId: 's4',
    likes: ['u3'],
    saved: ['u3'],
    comments: [],
    createdAt: new Date('2025-01-03T17:00:00'),
  },
  {
    id: 'f13',
    authorId: 'u1',
    title: 'The Case Against Optimising Everything',
    description: "Brilliant essay on how the obsession with efficiency is quietly making life worse. Saved it 3 months ago, still thinking about it.",
    url: 'https://example.com/against-optimising',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=60',
    type: 'article',
    visibility: 'all_friends',
    sectionId: 's6',
    likes: ['u2', 'u3'],
    saved: [],
    comments: [],
    createdAt: new Date('2025-01-02T10:00:00'),
  },
  {
    id: 'f14',
    authorId: 'u1',
    title: 'Tom Scott — "This Video Has X Views"',
    description: "A video that counts its own view count in real time. Technically ridiculous, creatively brilliant. Peak YouTube.",
    url: 'https://example.com/tom-scott-views',
    imageUrl: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&q=60',
    type: 'video',
    visibility: 'all_friends',
    sectionId: 's7',
    likes: ['u2'],
    saved: [],
    comments: [],
    createdAt: new Date('2025-01-01T15:00:00'),
  },
];

export const invites: Invite[] = [
  {
    id: 'i1',
    fromUserId: 'u4',
    toUserId: 'u1',
    status: 'pending',
    createdAt: new Date('2025-01-14T08:00:00'),
  },
];

export const JOKES_OF_THE_DAY = [
  "Sharing a meme here? Bold. We have a report button and zero hesitation. 🚨",
  "This is not your WhatsApp family group. Baba ji ka thullu does not belong here. 🙅",
  "Your 'Good Morning!' flower GIF is beautiful. Keep it in your DMs where it belongs. 🌸",
  "If you found it on Instagram Reels at 2am, it's probably not a 'find'. It's a symptom. 💀",
  "Originality is free. Forwarded messages are not welcome. We checked.",
  "Pinterest boards called — they want their stolen content back. Post your own discoveries! 📌",
  "If your find has a watermark from another app, that's not a find. That's evidence. 🔍",
  "We know you have taste. Prove it. No reposted content, no cap. 🎯",
  "This site runs on genuine curiosity, not group chat recycling. You've been warned. ⚡",
  "A 'find' is something YOU found. Not something Sharma ji forwarded at 6am. 🙏",
  "No Minions. No 'Jai Mata Di' forwards. No exceptions. Not even ironically. 🙃",
  "Screenshots of other people's Instagram posts are not finds. They are crimes. Against taste.",
];
