
import React, { useState } from 'react';
import { Game, Comment } from '../types';
import { 
  ThumbsUp, Trash2, Gamepad2, Monitor, Tv, Box, ExternalLink, ImageOff, 
  MessageSquare, Send, Clock, CheckCircle
} from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface GameCardProps {
  game: Game;
  currentUserId: string;
  onVote: (id: string) => void;
  onRemove?: (id: string) => void;
  onAddComment?: (gameId: string, text: string) => void;
  isVotingEnabled: boolean;
  canRemove: boolean;
}

const PlatformIcon = ({ p }: { p: string }) => {
  if (p.includes('PC')) return <Monitor size={12} className="mr-1" />;
  if (p.includes('Xbox')) return <Box size={12} className="mr-1" />;
  if (p.includes('PS')) return <Tv size={12} className="mr-1" />;
  if (p.includes('Switch')) return <Gamepad2 size={12} className="mr-1" />;
  return null;
};

const GameCard: React.FC<GameCardProps> = ({ game, currentUserId, onVote, onRemove, onAddComment, isVotingEnabled, canRemove }) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const votes = game.votedBy ? game.votedBy.length : 0;
  const hasVoted = game.votedBy ? game.votedBy.includes(currentUserId) : false;
  // Fix: cast to Comment[] to avoid 'unknown' type in map
  const comments = (game.comments ? (Array.isArray(game.comments) ? game.comments : Object.values(game.comments)) : []) as Comment[];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment) return;
    onAddComment(game.id, newComment);
    setNewComment('');
  };

  return (
    <div className={`group relative bg-surface border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col h-full select-none ${hasVoted ? 'border-primary shadow-primary/10' : 'border-gray-800 hover:border-gray-700'}`}>
      
      {/* Badge de Estado */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {game.status === 'pending' ? (
          <div className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
            <Clock size={10}/> PENDING
          </div>
        ) : (
          <div className="bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
            <CheckCircle size={10}/> APPROVED
          </div>
        )}
      </div>

      {/* Header Imagen */}
      <div className="relative h-40 md:h-44 w-full overflow-hidden shrink-0 bg-gray-900 flex items-center justify-center">
        {game.imageUrl && !imgError ? (
            <img 
            src={game.imageUrl} 
            alt={game.title} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
        ) : (
            <div className="flex flex-col items-center justify-center text-gray-700">
                {imgError ? <ImageOff size={32} className="mb-2"/> : <Gamepad2 size={48} className="mb-2" strokeWidth={1.5} />}
                <span className="text-[10px] uppercase font-bold tracking-widest">{imgError ? "Broken Link" : "No Cover"}</span>
            </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-black text-white leading-tight truncate">{game.title}</h3>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{game.genre}</p>
            {votes > 5 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black italic tracking-tighter animate-pulse">HOT</span>}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 flex-1 flex flex-col">
        {!showComments ? (
          <div className="flex-1 flex flex-col justify-between">
            <div>
                <p className="text-xs text-gray-400 line-clamp-3 mb-4 h-12 leading-relaxed italic">
                "{game.description}"
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                {game.platforms.map((p) => (
                    <div key={p} className="flex items-center text-[9px] font-black bg-black border border-gray-800 px-2 py-0.5 rounded-md text-gray-500">
                    <PlatformIcon p={p} /> {p}
                    </div>
                ))}
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center mt-auto border-t border-gray-800/50 pt-4">
                <div className="flex items-center gap-1">
                    {canRemove && onRemove && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(game.id); }}
                        className="text-gray-600 hover:text-danger hover:bg-danger/10 p-2 rounded-xl transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                    )}
                    <button 
                        onClick={() => setShowComments(true)}
                        className="text-gray-600 hover:text-accent hover:bg-accent/10 p-2 rounded-xl transition-all relative"
                    >
                        <MessageSquare size={18} />
                        {comments.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full border-2 border-surface"></span>}
                    </button>
                    {game.link && (
                        <a href={game.link} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-white p-2 transition-colors">
                            <ExternalLink size={18} />
                        </a>
                    )}
                </div>
                
                <button 
                    onClick={() => onVote(game.id)}
                    disabled={!isVotingEnabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-90 ${
                    hasVoted 
                        ? 'bg-primary text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]' 
                        : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                    <ThumbsUp size={16} className={hasVoted ? 'fill-current' : ''} />
                    <span>{votes}</span>
                </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-[180px]">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-500">{t('lobby.comments')} ({comments.length})</span>
                <button onClick={() => setShowComments(false)} className="text-[10px] font-bold text-primary">{t('common.back')}</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 custom-scrollbar">
                {comments.length === 0 ? (
                    <p className="text-[10px] text-gray-600 italic text-center py-4">{t('lobby.noComments')}</p>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className="bg-black/40 p-2 rounded-lg border border-gray-800/50">
                            <p className="text-[9px] font-bold text-accent mb-0.5">{c.userName}</p>
                            <p className="text-[10px] text-gray-300 leading-tight">{c.text}</p>
                        </div>
                    ))
                )}
             </div>
             <form onSubmit={handleSendComment} className="relative mt-auto">
                <input 
                    type="text" 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder={t('lobby.addComment')}
                    className="w-full bg-black border border-gray-800 rounded-lg py-2 pl-3 pr-10 text-[10px] outline-none focus:border-primary transition-colors"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors">
                    <Send size={12}/>
                </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCard;
