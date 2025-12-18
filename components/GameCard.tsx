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
    <div className={`group relative bg-surface border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col h-full w-full select-none ${hasVoted ? 'border-primary shadow-primary/10' : 'border-gray-800 hover:border-gray-700'}`}>
      
      {/* Header Imagen */}
      <div className="relative h-40 w-full overflow-hidden shrink-0 bg-gray-900 flex items-center justify-center">
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

      {/* Contenido */}
      <div className="p-4 flex-1 flex flex-col min-h-[160px]">
        {!showComments ? (
          <div className="flex-1 flex flex-col justify-between">
            <div>
                <p className="text-xs text-gray-400 line-clamp-3 mb-4 italic leading-relaxed">
                "{game.description}"
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                {game.platforms.slice(0, 4).map((p) => (
                    <div key={p} className="flex items-center text-[9px] font-black bg-black/50 border border-gray-800 px-2 py-1 rounded-lg text-gray-500">
                        <PlatformIcon p={p} /> {p}
                    </div>
                ))}
                </div>
            </div>

            {/* Acciones - Cuadrícula de botones alineada */}
            {!hideInteractions && (
                <div className="flex justify-between items-center mt-auto border-t border-gray-800 pt-4">
                    <div className="flex items-center gap-1">
                        {canRemove && onRemove && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(game.id); }}
                            className="text-gray-600 hover:text-danger hover:bg-danger/10 p-2 rounded-xl transition-all"
                            title="Eliminar"
                        >
                            <Trash2 size={18} />
                        </button>
                        )}
                        {canRemove && onEdit && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(game); }}
                            className="text-gray-600 hover:text-primary hover:bg-primary/10 p-2 rounded-xl transition-all"
                            title="Editar"
                        >
                            <Edit3 size={18} />
                        </button>
                        )}
                        <button 
                            onClick={() => setShowComments(true)}
                            className="text-gray-600 hover:text-accent hover:bg-accent/10 p-2 rounded-xl transition-all relative"
                            title="Comentarios"
                        >
                            <MessageSquare size={18} />
                            {comments.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full border-2 border-surface"></span>}
                        </button>
                        {game.link && (
                            <a href={game.link} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all" title="Enlace Externo">
                                <ExternalLink size={18} />
                            </a>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => onVote(game.id)}
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
            )}
            
            {hideInteractions && game.link && (
                 <div className="mt-auto border-t border-gray-800 pt-4 flex justify-center">
                    <a href={game.link} target="_blank" rel="noreferrer" className="text-[10px] font-black text-gray-500 hover:text-white flex items-center gap-2 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl hover:bg-gray-900 border border-transparent hover:border-gray-800 w-full justify-center">
                         View Details <ExternalLink size={14} />
                    </a>
                 </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
             <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('lobby.comments')} ({comments.length})</span>
                <button onClick={() => setShowComments(false)} className="text-[10px] font-black text-primary uppercase hover:underline">{t('common.back')}</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2 custom-scrollbar">
                {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-700 opacity-50">
                        <MessageSquare size={24} className="mb-2"/>
                        <p className="text-[10px] font-bold italic">{t('lobby.noComments')}</p>
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className="bg-black/40 p-2.5 rounded-xl border border-gray-800/40">
                            <p className="text-[9px] font-black text-accent uppercase mb-1">{c.userName}</p>
                            <p className="text-xs text-gray-300 leading-snug">{c.text}</p>
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
                    className="w-full bg-black border border-gray-800 rounded-xl py-3 pl-4 pr-10 text-xs outline-none focus:border-primary transition-colors font-bold"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-primary transition-colors p-1.5">
                    <Send size={14}/>
                </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCard;