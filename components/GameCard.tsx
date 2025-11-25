import React from 'react';
import { Game } from '../types';
import { ThumbsUp, Trash2, Gamepad2, Monitor, Tv, Box } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onVote: (id: string) => void;
  onRemove?: (id: string) => void;
  isVotingEnabled: boolean;
  hasVoted?: boolean;
}

const PlatformIcon = ({ p }: { p: string }) => {
  if (p.includes('PC')) return <Monitor size={12} className="mr-1" />;
  if (p.includes('Xbox')) return <Box size={12} className="mr-1" />;
  if (p.includes('PS')) return <Tv size={12} className="mr-1" />;
  if (p.includes('Switch')) return <Gamepad2 size={12} className="mr-1" />;
  return null;
};

const GameCard: React.FC<GameCardProps> = ({ game, onVote, onRemove, isVotingEnabled, hasVoted }) => {
  return (
    <div className="group relative bg-surface border border-gray-800 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-primary/10 flex flex-col h-full select-none">
      {/* Image Header */}
      <div className="relative h-36 w-full overflow-hidden shrink-0">
        <img 
          src={game.imageUrl} 
          alt={game.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-90" />
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-base font-bold text-white leading-tight truncate">{game.title}</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">{game.genre}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
            <p className="text-xs text-gray-400 line-clamp-2 mb-3 h-8 leading-relaxed">
            {game.description}
            </p>

            <div className="flex flex-wrap gap-1 mb-3">
            {game.platforms.map((p) => (
                <div key={p} className="flex items-center text-[9px] font-medium bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                <PlatformIcon p={p} /> {p}
                </div>
            ))}
            </div>
        </div>

        {/* Actions - Only show if voting/removing is enabled (Lobby View) */}
        {(isVotingEnabled || onRemove) && (
            <div className="flex justify-between items-center mt-2 border-t border-gray-800 pt-3">
            <div className="flex items-center gap-2">
                {onRemove && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(game.id); }}
                    className="text-gray-600 hover:text-danger hover:bg-danger/10 p-2 rounded transition-colors touch-manipulation"
                    title="Remove game"
                >
                    <Trash2 size={16} />
                </button>
                )}
            </div>
            
            {isVotingEnabled && (
                <button 
                    onClick={() => onVote(game.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 touch-manipulation ${
                    hasVoted 
                        ? 'bg-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    <ThumbsUp size={16} className={hasVoted ? 'fill-current' : ''} />
                    <span>{game.votes}</span>
                </button>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default GameCard;