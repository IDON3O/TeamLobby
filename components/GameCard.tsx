import React, { useState } from 'react';
import { Game } from '../types';
import { 
  ThumbsUp, Gamepad2, Monitor, Tv, Box, ImageOff, Maximize2
} from 'lucide-react';

interface GameCardProps {
  game: Game;
  currentUserId: string;
  onVote: (id: string) => void;
  onOpenDetails: (game: Game) => void;
  isVotingEnabled: boolean;
}

const PlatformIcon = ({ p }: { p: string }) => {
  if (p.includes('PC')) return <Monitor size={12} className="mr-1" />;
  if (p.includes('Xbox')) return <Box size={12} className="mr-1" />;
  if (p.includes('PS')) return <Tv size={12} className="mr-1" />;
  if (p.includes('Switch')) return <Gamepad2 size={12} className="mr-1" />;
  return null;
};

const GameCard: React.FC<GameCardProps> = ({ game, currentUserId, onVote, onOpenDetails, isVotingEnabled }) => {
  const [imgError, setImgError] = useState(false);
  
  const votes = game.votedBy ? game.votedBy.length : 0;
  const hasVoted = game.votedBy ? game.votedBy.includes(currentUserId) : false;

  return (
    <div 
      onClick={() => onOpenDetails(game)}
      className={`group relative bg-surface border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col h-full w-full select-none cursor-pointer hover:translate-y-[-4px] ${hasVoted ? 'border-primary shadow-primary/10' : 'border-gray-800 hover:border-gray-700'}`}
    >
      {/* Botón de expansión visual (indicador) */}
      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-2 rounded-xl backdrop-blur-md border border-white/10">
        <Maximize2 size={14} className="text-white" />
      </div>

      {/* Header Imagen */}
      <div className="relative h-44 w-full overflow-hidden shrink-0 bg-gray-900 flex items-center justify-center">
        {game.imageUrl && !imgError ? (
            <img 
              src={game.imageUrl} 
              alt={game.title} 
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
        ) : (
            <div className="flex flex-col items-center justify-center text-gray-700">
                {imgError ? <ImageOff size={24} className="mb-1"/> : <Gamepad2 size={32} className="mb-1" strokeWidth={1.5} />}
                <span className="text-[8px] uppercase font-black tracking-widest">{imgError ? "Link Error" : "No Cover"}</span>
            </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-base font-black text-white leading-tight truncate drop-shadow-md">{game.title}</h3>
          <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 drop-shadow-md">{game.genre}</p>
        </div>
      </div>

      {/* Contenido Minimalista */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="flex flex-wrap gap-1.5">
          {game.platforms.slice(0, 3).map((p) => (
            <div key={p} className="flex items-center text-[9px] font-black bg-black/50 border border-gray-800 px-2 py-1 rounded-lg text-gray-500">
              <PlatformIcon p={p} /> {p}
            </div>
          ))}
          {game.platforms.length > 3 && <span className="text-[9px] font-black text-gray-600">+{game.platforms.length - 3}</span>}
        </div>

        <div className="flex justify-end items-center mt-4">
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Evitar abrir detalles al votar
              onVote(game.id);
            }}
            disabled={!isVotingEnabled}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-90 ${
              hasVoted 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white border border-gray-800'
            }`}
          >
            <ThumbsUp size={16} className={hasVoted ? 'fill-current' : ''} />
            <span>{votes}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;