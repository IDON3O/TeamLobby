import { Game, GameGenre, Platform, User } from './types';

export const MOCK_GAMES: Game[] = [
  {
    id: 'g1',
    title: 'Deep Rock Galactic',
    description: 'Danger. Darkness. Dwarves. A 1-4 player co-op FPS featuring badass space Dwarves.',
    imageUrl: 'https://picsum.photos/400/225?random=1',
    genre: GameGenre.FPS,
    platforms: [Platform.PC, Platform.XBOX, Platform.PS5],
    votedBy: [],
    tags: ['Co-op', 'Sci-fi', 'Destruction']
  },
  {
    id: 'g2',
    title: 'It Takes Two',
    description: 'Embark on the craziest journey of your life in this genre-bending platform adventure created purely for co-op.',
    imageUrl: 'https://picsum.photos/400/225?random=2',
    genre: GameGenre.PUZZLE,
    platforms: [Platform.PC, Platform.PS5, Platform.XBOX, Platform.SWITCH],
    votedBy: [],
    tags: ['Story Rich', 'Puzzle', 'Split Screen']
  },
  {
    id: 'g3',
    title: 'Valheim',
    description: 'A brutal exploration and survival game for 1-10 players, set in a procedurally-generated purgatory.',
    imageUrl: 'https://picsum.photos/400/225?random=3',
    genre: GameGenre.SURVIVAL,
    platforms: [Platform.PC, Platform.XBOX],
    votedBy: [],
    tags: ['Survival', 'Open World', 'Viking']
  },
  {
    id: 'g4',
    title: 'Baldur\'s Gate 3',
    description: 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal.',
    imageUrl: 'https://picsum.photos/400/225?random=4',
    genre: GameGenre.RPG,
    platforms: [Platform.PC, Platform.PS5, Platform.XBOX],
    votedBy: [],
    tags: ['RPG', 'Story', 'D&D']
  },
  {
    id: 'g5',
    title: 'Overcooked! 2',
    description: 'Overcooked returns with a brand-new helping of chaotic cooking action!',
    imageUrl: 'https://picsum.photos/400/225?random=5',
    genre: GameGenre.STRATEGY,
    platforms: [Platform.PC, Platform.PS5, Platform.XBOX, Platform.SWITCH],
    votedBy: [],
    tags: ['Chaos', 'Family', 'Funny']
  }
];

export const INITIAL_USER: User = {
  id: 'u1',
  alias: 'PlayerOne',
  avatarUrl: 'https://picsum.photos/64/64?random=100',
  platforms: [Platform.PC],
  isReady: false,
  isGuest: true
};