
export enum Platform {
  PC = 'PC',
  PS5 = 'PS5',
  XBOX = 'Xbox Series X',
  SWITCH = 'Switch'
}

export enum GameGenre {
  ACTION = 'Action',
  ADVENTURE = 'Adventure',
  RPG = 'RPG',
  SHOOTER = 'Shooter',
  STRATEGY = 'Strategy',
  SIMULATION = 'Simulation',
  SPORTS = 'Sports',
  RACING = 'Racing',
  PLATFORMER = 'Platformer',
  FIGHTING = 'Fighting',
  HORROR = 'Horror',
  SURVIVAL = 'Survival',
  PUZZLE = 'Puzzle',
  SANDBOX = 'Sandbox',
  ROGUELIKE = 'Roguelike',
  INDIE = 'Indie',
  MULTIPLAYER = 'Multiplayer',
  CASUAL = 'Casual'
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  genre: GameGenre;
  platforms: Platform[];
  votedBy: string[]; 
  tags: string[];
  link?: string;
  proposedBy?: string;
  status: 'pending' | 'approved';
  comments?: Comment[];
}

export interface User {
  id: string;
  alias: string;
  nickname?: string;
  email?: string; 
  avatarUrl: string;
  platforms: Platform[];
  isReady: boolean;
  isGuest?: boolean; 
  isAdmin?: boolean; 
  isBanned?: boolean;
  isMuted?: boolean;
  score?: number;
  allowGlobalLibrary?: boolean; 
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface Room {
  code: string;
  name?: string;
  isPrivate?: boolean;
  password?: string;
  hostId: string;
  members: User[];
  gameQueue: Game[];
  chatHistory: Message[];
  createdAt: number;
}

export interface RoomSummary {
  code: string;
  name: string;
  lastVisited: number;
  hostAlias: string;
  savedPassword?: string;
}

export type ViewState = 'LOBBY' | 'LIBRARY' | 'ADMIN' | 'PROFILE' | 'READY';
