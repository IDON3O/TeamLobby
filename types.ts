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
  email?: string; 
  avatarUrl: string;
  platforms: Platform[];
  availableUntil?: string; 
  isReady: boolean;
  isGuest?: boolean; 
  isAdmin?: boolean; 
  isBanned?: boolean; // Nuevo: Para bloquear acceso
  isMuted?: boolean;  // Nuevo: Para bloquear chat
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
  link?: string; // Nuevo: Enlace a Steam/Tienda
  proposedBy?: string; // Nuevo: ID del usuario que lo propuso
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
  name?: string; // Nuevo: Nombre legible de la sala
  isPrivate?: boolean; // Nuevo: Sala con contraseña
  password?: string; // Nuevo: Contraseña simple
  hostId: string;
  members: User[];
  gameQueue: Game[];
  chatHistory: Message[];
  activeGameId?: string;
  createdAt: number; // Nuevo: Para ordenar historial
}

export interface RoomSummary {
  code: string;
  name: string;
  lastVisited: number;
  hostAlias: string;
}

export type ViewState = 'HOME' | 'LOBBY' | 'LIBRARY' | 'PROFILE' | 'ADMIN';