export enum Platform {
  PC = 'PC',
  PS5 = 'PS5',
  XBOX = 'Xbox Series X',
  SWITCH = 'Switch'
}

export enum GameGenre {
  RPG = 'RPG',
  FPS = 'FPS',
  STRATEGY = 'Strategy',
  SURVIVAL = 'Survival',
  MOBA = 'MOBA',
  PUZZLE = 'Puzzle'
}

export interface User {
  id: string;
  alias: string;
  avatarUrl: string;
  platforms: Platform[];
  availableUntil?: string; // ISO date string
  isReady: boolean;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  genre: GameGenre;
  platforms: Platform[];
  votes: number;
  tags: string[];
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
  hostId: string;
  members: User[];
  gameQueue: Game[];
  chatHistory: Message[];
  activeGameId?: string;
}

export type ViewState = 'HOME' | 'LOBBY' | 'LIBRARY' | 'PROFILE';
