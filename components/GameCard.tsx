import React, { useState } from 'react';
import { Game, Comment } from '../types';
import { 
  ThumbsUp, Trash2, Gamepad2, Monitor, Tv, Box, ExternalLink, ImageOff, 
  MessageSquare, Send, Edit3
} from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface GameCardProps {
  game: Game;
  currentUserId: string;
  onVote: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (game: Game) => void;
  onAddComment?: (gameId: string, text: string) => void;
  isVotingEnabled: boolean;
  canRemove: boolean;
  hideInteractions?: boolean;
}

const PlatformIcon = ({ p }: { p: string }) => {
  if (p.includes('PC')) return <Monitor size={12} className="mr-1" />;
  if (p.includes('Xbox')) return <Box size={12} className="mr-1" />;
  if (p.includes('PS')) return <Tv size={12} className="mr-1" />;
  if (p.includes('Switch')) return <Gamepad2 size={12} className="mr-1" />;
  return null;
};

const GameCard: React.FC<GameCardProps> = ({ game, currentUserId, onVote, onRemove, onEdit, onAddComment, isVotingEnabled, canRemove, hideInteractions }) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const votes = game.votedBy ? game.votedBy.length : 0;
  const hasVoted = game.votedBy ? game.votedBy.includes(currentUserId) : false;
  const comments = (game.comments ? (Array.isArray(game.comments) ? game.comments : Object.values(game.comments)) : []) as Comment[];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment) return;
    onAddComment(game.id, newComment);
    setNewComment('');
  };

  return (
    <div className={`group relative bg-surface border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col h-full min-w-[260px] select-none ${hasVoted ? 'border-primary shadow-primary/10' : 'border-gray-800 hover:border-gray-700'}`}>
      
      {/* Header Imagen */}
      <div className="relative h-36 w-full overflow-hidden shrink-0 bg-gray-900 flex items-center justify-center">
        {game.imageUrl && !imgError ? (
            <img 
            src={game.imageUrl} 
            alt={game.title} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
        ) : (
            <div className="flex flex-col items-center justify-center text-gray-700">
                {imgError ? <ImageOff size={24} className="mb-1"/> : <Gamepad2 size={32} className="mb-1" strokeWidth={1.5} />}
                <span className="text-[8px] uppercase font-black tracking-widest">{imgError ? "Link Error" : "No Cover"}</span>
            </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-sm font-black text-white leading-tight truncate">{game.title}</h3>
          <p className="text-[9px] text-primary font-bold uppercase tracking-wider mt-0.5">{game.genre}</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-3 flex-1 flex flex-col">
        {!showComments ? (
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div>
                <p className="text-[11px] text-gray-400 line-clamp-2 mb-2 italic h-8">
                "{game.description}"
                </p>

                <div className="flex flex-wrap gap-1">
                {game.platforms.slice(0, 3).map((p) => (
                    <div key={p} className="flex items-center text-[8px] font-black bg-black border border-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                        <PlatformIcon p={p} /> {p}
                    </div>
                ))}
                </div>
            </div>

            {/* Acciones - Ajustadas para soportar todos los botones con espacio */}
            {!hideInteractions && (
                <div className="flex justify-between items-center mt-auto border-t border-gray-800/50 pt-3">
                    <div className="flex items-center gap-1">
                        {canRemove && onRemove && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(game.id); }}
                            className="text-gray-600 hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-all"
                            title="Eliminar"
                        >
                            <Trash2 size={16} />
                        </button>
                        )}
                        {canRemove && onEdit && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(game); }}
                            className="text-gray-600 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all"
                            title="Editar"
                        >
                            <Edit3 size={16} />
                        </button>
                        )}
                        <button 
                            onClick={() => setShowComments(true)}
                            className="text-gray-600 hover:text-accent hover:bg-accent/10 p-2 rounded-lg transition-all relative"
                            title="Comentarios"
                        >
                            <MessageSquare size={16} />
                            {comments.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full border border-surface"></span>}
                        </button>
                        {game.link && (
                            <a href={game.link} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all" title="Ir al enlace">
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => onVote(game.id)}
                        disabled={!isVotingEnabled}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all active:scale-90 ${
                        hasVoted 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                            : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white'
                        }`}
                    >
                        <ThumbsUp size={14} className={hasVoted ? 'fill-current' : ''} />
                        <span>{votes}</span>
                    </button>
                </div>
            )}
            
            {hideInteractions && game.link && (
                 <div className="mt-auto border-t border-gray-800/50 pt-3 flex justify-center">
                    <a href={game.link} target="_blank" rel="noreferrer" className="text-[10px] font-black text-gray-500 hover:text-white flex items-center gap-2 uppercase tracking-widest transition-colors py-2">
                         View Details <ExternalLink size={12} />
                    </a>
                 </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-[140px]">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black uppercase text-gray-500">{t('lobby.comments')}</span>
                <button onClick={() => setShowComments(false)} className="text-[9px] font-bold text-primary">{t('common.back')}</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 pr-1 custom-scrollbar">
                {comments.length === 0 ? (
                    <p className="text-[9px] text-gray-600 italic text-center py-4">{t('lobby.noComments')}</p>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className="bg-black/30 p-2 rounded border border-gray-800/30">
                            <p className="text-[8px] font-black text-accent">{c.userName}</p>
                            <p className="text-[9px] text-gray-300 leading-tight">{c.text}</p>
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
                    className="w-full bg-black border border-gray-800 rounded-xl py-2 pl-3 pr-8 text-[9px] outline-none focus:border-primary transition-colors"
                />
                <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors p-1">
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