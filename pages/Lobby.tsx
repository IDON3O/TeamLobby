import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Gamepad2, Users, Menu, LogOut, Plus, Search, Crown, X, 
  Image as ImageIcon, Loader2, Lock, Copy, Link as LinkIcon,
  CheckCircle2, Check, MessageCircle, LayoutGrid, Trophy, Trash2,
  ExternalLink, Edit3, Send, ThumbsUp, ArrowLeft, Monitor, Tv, Box, ImageOff
} from 'lucide-react';
import { Room, User, Message, Game, GameGenre, Platform, Comment } from '../types';
import { 
  subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, 
  toggleUserReadyState, removeGameFromRoom, addCommentToGame, updateGameInRoom, deleteRoom 
} from '../services/roomService';
import { uploadGameImage } from '../services/firebaseService';
import { MOCK_GAMES } from '../constants';
import Chat from '../components/Chat';
import GameCard from '../components/GameCard';
import { useLanguage } from '../services/i18n';

interface LobbyProps {
    currentUser: User;
}

const Lobby: React.FC<LobbyProps> = ({ currentUser }) => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    
    const [room, setRoom] = useState<Room | null>(null);
    const [view, setView] = useState<'LOBBY' | 'LIBRARY'>('LOBBY');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'VOTED' | 'RECENT'>('ALL');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [editingGameId, setEditingGameId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    // Form states para Crear/Editar
    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameGenre, setNewGameGenre] = useState<GameGenre>(GameGenre.FPS);
    const [newGameLink, setNewGameLink] = useState('');
    const [newGameImageUrl, setNewGameImageUrl] = useState('');
    const [newGameDesc, setNewGameDesc] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (code) {
            const unsub = subscribeToRoom(code, (updatedRoom) => {
                if (!updatedRoom) { navigate('/'); return; }
                setRoom(updatedRoom);
                // Si hay un juego seleccionado, actualizar sus datos (votos, comentarios)
                if (selectedGame) {
                  const updated = updatedRoom.gameQueue.find(g => g.id === selectedGame.id);
                  if (updated) setSelectedGame(updated);
                  else setSelectedGame(null); // Fue borrado
                }
            });
            return () => unsub();
        }
    }, [code, navigate, selectedGame?.id]);

    const handleLeave = () => navigate('/');
    
    const handleVote = (id: string) => room && voteForGame(room.code, id, currentUser.id);
    
    const handleRemove = (id: string) => {
        if (window.confirm("¿Eliminar esta postulación?")) {
            if (room) {
                removeGameFromRoom(room.code, id, currentUser.id, !!currentUser.isAdmin);
                setSelectedGame(null);
            }
        }
    };

    const handleReady = () => room && toggleUserReadyState(room.code, currentUser.id);
    
    const openEditModal = (game: Game) => {
        setEditingGameId(game.id);
        setNewGameTitle(game.title);
        setNewGameGenre(game.genre);
        setNewGameLink(game.link || '');
        setNewGameImageUrl(game.imageUrl || '');
        setNewGameDesc(game.description || '');
        setIsGameModalOpen(true);
    };

    const handleSaveGame = async () => {
        if (!newGameTitle || !room) return;
        setIsUploading(true);
        try {
            let finalImg = newGameImageUrl;
            if (selectedFile) finalImg = await uploadGameImage(selectedFile);
            
            const gameData: Partial<Game> = {
                title: newGameTitle,
                description: newGameDesc || 'User recommended game.',
                imageUrl: finalImg,
                genre: newGameGenre,
                link: newGameLink,
            };

            if (editingGameId) {
                await updateGameInRoom(room.code, editingGameId, gameData);
            } else {
                const newGame: Game = {
                    ...gameData as Game,
                    id: `custom-${Date.now()}`,
                    platforms: [Platform.PC],
                    votedBy: [currentUser.id],
                    tags: ['Custom'],
                    status: 'pending'
                };
                await addGameToRoom(room.code, newGame, currentUser);
            }
            
            closeModal();
        } catch(e) { alert(t('common.error')); } finally { setIsUploading(false); }
    };

    const closeModal = () => {
        setIsGameModalOpen(false);
        setEditingGameId(null);
        setNewGameTitle(''); setNewGameImageUrl(''); setPreviewUrl(null); setNewGameLink(''); setNewGameDesc('');
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !selectedGame || !room) return;
        addCommentToGame(room.code, selectedGame.id, {
            id: `${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.nickname || currentUser.alias,
            text: newComment,
            timestamp: Date.now()
        });
        setNewComment('');
    };

    const handleSendMsg = (txt: string) => room && sendChatMessage(room.code, {
        id: `${Date.now()}`, userId: currentUser.id, userName: currentUser.nickname || currentUser.alias, content: txt, timestamp: Date.now()
    });

    if (!room) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={48}/></div>;

    const members = room.members || [];
    let queue = [...(room.gameQueue || [])];

    // Ordenamiento
    if (activeFilter === 'VOTED') queue.sort((a, b) => (b.votedBy?.length || 0) - (a.votedBy?.length || 0));
    else if (activeFilter === 'RECENT') queue.reverse();
    else queue.sort((a, b) => a.title.localeCompare(b.title));

    // Ranking
    const sortedRanking = members.map(m => {
        const proposedGames = queue.filter(g => g.proposedBy === m.id);
        const totalVotes = proposedGames.reduce((acc, curr) => acc + (curr.votedBy?.length || 0), 0);
        return { ...m, totalVotes };
    }).filter(m => m.totalVotes > 0).sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

    const podium = [
        sortedRanking[1], // 2nd
        sortedRanking[0], // 1st
        sortedRanking[2]  // 3rd
    ].filter(Boolean);

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans relative">
            
            {/* Overlay para cerrar Sidebar en móvil */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface border-r border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/20">
                        <Link to="/" className="flex items-center gap-2 group">
                            <Gamepad2 size={24} className="text-primary group-hover:animate-bounce transition-all"/>
                            <span className="font-black text-xl tracking-tighter uppercase italic text-white group-hover:text-primary transition-colors">TeamLobby</span>
                        </Link>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><X/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        <nav className="space-y-1.5">
                            <button onClick={() => { setView('LOBBY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LOBBY' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-black' : 'text-gray-500 hover:bg-gray-800 font-bold'}`}>
                                <LayoutGrid size={20}/> <span>{t('lobby.viewLobby')}</span>
                            </button>
                            <button onClick={() => { setView('LIBRARY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LIBRARY' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-black' : 'text-gray-500 hover:bg-gray-800 font-bold'}`}>
                                <Search size={20}/> <span>{t('lobby.viewLibrary')}</span>
                            </button>
                        </nav>

                        {/* Ranking */}
                        {sortedRanking.length > 0 && (
                            <div className="relative pt-8 pb-4 bg-black/20 rounded-2xl border border-gray-800/50">
                                <div className="flex items-end justify-center gap-2 px-2">
                                    {podium.map((m) => {
                                        const isFirst = m.id === sortedRanking[0].id;
                                        return (
                                            <div key={m.id} className="flex flex-col items-center flex-1 max-w-[80px]">
                                                <img src={m.avatarUrl} className={`rounded-full border-2 mb-2 ${isFirst ? 'w-14 h-14 border-yellow-500' : 'w-10 h-10 border-gray-700'}`}/>
                                                <div className={`rounded-t-xl w-full flex flex-col items-center p-2 bg-gradient-to-b from-gray-800/40 to-transparent border-t border-gray-700 ${isFirst ? 'h-16' : 'h-10'}`}>
                                                    <p className="text-[8px] font-black truncate w-full text-center text-gray-500 uppercase">{m.nickname || m.alias}</p>
                                                    <p className="text-[10px] font-black text-primary">{m.totalVotes}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Miembros */}
                        <div className="space-y-2">
                            <div className="px-2 text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('lobby.squad')}</div>
                            {members.map(m => (
                                <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${m.isReady ? 'bg-green-500/10 border-green-500/30' : 'bg-black/20 border-gray-800'}`}>
                                    <img src={m.avatarUrl} className={`w-8 h-8 rounded-full border ${m.isReady ? 'border-green-500' : 'border-gray-800'}`}/>
                                    <p className="text-xs font-bold truncate flex-1">{m.nickname || m.alias}</p>
                                    {m.isReady && <Check size={12} className="text-green-500" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800">
                        <button onClick={handleReady} className={`w-full py-4 rounded-xl text-xs font-black tracking-widest transition-all mb-3 ${currentUser.isReady ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'bg-gray-800 text-gray-500'}`}>
                            {currentUser.isReady ? t('lobby.ready') : t('lobby.setReady')}
                        </button>
                        <button onClick={handleLeave} className="w-full py-2 bg-gray-900 border border-gray-800 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-white transition-colors">Leave Lobby</button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><Menu/></button>
                        <div>
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">{room.name} {room.isPrivate && <Lock size={14} className="text-gray-600"/>}</h2>
                            <span className="text-[10px] font-mono font-black text-primary/80">#{room.code}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         {!currentUser.isGuest && (
                            <button onClick={() => setIsGameModalOpen(true)} className="bg-primary hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                <Plus size={20}/> <span className="hidden sm:inline tracking-widest">{t('lobby.addGame')}</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-black/10">
                    {view === 'LOBBY' ? (
                        <div className="space-y-6 max-w-7xl mx-auto w-full">
                            <div className="flex p-1 bg-black/40 border border-gray-800 rounded-xl w-fit">
                                <button onClick={() => setActiveFilter('ALL')} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterAll')}</button>
                                <button onClick={() => setActiveFilter('VOTED')} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'VOTED' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterVoted')}</button>
                                <button onClick={() => setActiveFilter('RECENT')} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'RECENT' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterRecent')}</button>
                            </div>

                            {queue.length === 0 ? (
                                <div className="h-96 border-2 border-dashed border-gray-800/50 rounded-[3rem] flex flex-col items-center justify-center text-gray-700 italic tracking-widest">
                                    Queue is empty
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
                                    {queue.map(g => (
                                        <GameCard 
                                            key={g.id}
                                            game={g} 
                                            currentUserId={currentUser.id} 
                                            onVote={handleVote} 
                                            onOpenDetails={setSelectedGame}
                                            isVotingEnabled={!currentUser.isGuest}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-8 w-full">
                             <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary" size={24}/>
                                <input type="text" placeholder={t('lobby.searchLib')} className="w-full bg-surface border border-gray-800 rounded-[2rem] py-5 pl-14 pr-6 outline-none focus:border-primary transition-all text-sm font-black shadow-2xl tracking-widest"/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {MOCK_GAMES.map(g => (
                                    <div key={g.id} className="flex flex-col h-full group/item">
                                        <GameCard 
                                            game={{...g, status: 'approved'}} 
                                            currentUserId={currentUser.id} 
                                            onVote={()=>{}} 
                                            onOpenDetails={setSelectedGame}
                                            isVotingEnabled={false} 
                                        />
                                        <button onClick={() => addGameToRoom(room.code, g, currentUser)} className="mt-4 w-full py-4 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-[0.2em] shadow-xl">
                                            {t('lobby.addToQueue')}
                                        </button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL DETALLES DEL JUEGO (EXPANSIÓN) */}
            {selectedGame && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-surface border border-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setSelectedGame(null)} className="absolute top-6 right-6 z-50 p-3 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all border border-white/10">
                    <X size={24}/>
                  </button>

                  {/* Lado Izquierdo: Visual */}
                  <div className="w-full md:w-1/2 relative bg-gray-900 h-64 md:h-auto shrink-0">
                    <img src={selectedGame.imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8">
                      <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase drop-shadow-2xl">{selectedGame.title}</h3>
                      <p className="text-primary font-black uppercase tracking-[0.3em] mt-2">{selectedGame.genre}</p>
                    </div>
                  </div>

                  {/* Lado Derecho: Info y Social */}
                  <div className="w-full md:w-1/2 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar space-y-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Game Info</h4>
                        <p className="text-gray-300 text-sm leading-relaxed italic">"{selectedGame.description}"</p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Platforms</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedGame.platforms.map(p => (
                             <div key={p} className="flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-gray-800 rounded-xl text-[10px] font-black text-gray-400">
                                {p.includes('PC') ? <Monitor size={12}/> : p.includes('Xbox') ? <Box size={12}/> : <Tv size={12}/>} {p}
                             </div>
                          ))}
                        </div>
                      </div>

                      {/* Sección Comentarios */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                          <MessageCircle size={14}/> {t('lobby.comments')} ({selectedGame.comments?.length || 0})
                        </h4>
                        <div className="space-y-3">
                          {selectedGame.comments && Object.values(selectedGame.comments).length > 0 ? (
                            Object.values(selectedGame.comments).map((c: any) => (
                              <div key={c.id} className="bg-black/40 border border-gray-800/50 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-accent uppercase mb-1">{c.userName}</p>
                                <p className="text-xs text-gray-300">{c.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-600 italic px-2">{t('lobby.noComments')}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer del Modal Detalle */}
                    <div className="p-8 bg-gray-900/50 border-t border-gray-800 space-y-4">
                      {/* Input de Comentario */}
                      <form onSubmit={handleAddComment} className="relative">
                        <input 
                          type="text" 
                          value={newComment} 
                          onChange={e => setNewComment(e.target.value)}
                          placeholder={t('lobby.addComment')}
                          className="w-full bg-black border border-gray-800 rounded-2xl py-4 pl-5 pr-12 text-sm font-bold outline-none focus:border-primary transition-all"
                        />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary p-2 hover:bg-primary/10 rounded-xl">
                          <Send size={18}/>
                        </button>
                      </form>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-2">
                           {(currentUser.isAdmin || selectedGame.proposedBy === currentUser.id) && (
                              <>
                                <button onClick={() => openEditModal(selectedGame)} className="p-4 bg-gray-800 text-white rounded-2xl hover:bg-primary transition-all shadow-xl">
                                  <Edit3 size={18}/>
                                </button>
                                <button onClick={() => handleRemove(selectedGame.id)} className="p-4 bg-gray-800 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl">
                                  <Trash2 size={18}/>
                                </button>
                              </>
                           )}
                           {selectedGame.link && (
                             <a href={selectedGame.link} target="_blank" rel="noreferrer" className="p-4 bg-gray-800 text-white rounded-2xl hover:bg-white hover:text-black transition-all shadow-xl">
                                <ExternalLink size={18}/>
                             </a>
                           )}
                        </div>
                        <button 
                          onClick={() => handleVote(selectedGame.id)} 
                          className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${
                            selectedGame.votedBy?.includes(currentUser.id) 
                            ? 'bg-primary text-white' 
                            : 'bg-white text-black hover:bg-gray-200'
                          }`}
                        >
                          <ThumbsUp size={18} className={selectedGame.votedBy?.includes(currentUser.id) ? 'fill-current' : ''}/>
                          VOTE ({selectedGame.votedBy?.length || 0})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Crear/Editar (Ya existía, ajustado) */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-surface border border-gray-700 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">{editingGameId ? 'Update Entry' : t('lobby.modalTitle')}</h3>
                            <button onClick={closeModal} className="p-3 hover:bg-gray-800 rounded-2xl transition-all border border-transparent hover:border-gray-700"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Game Title</label>
                                    <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} placeholder={t('lobby.gameTitle')} className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-sm font-black focus:border-primary outline-none transition-all shadow-inner"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Image URL</label>
                                    <input type="text" value={newGameImageUrl} onChange={e => setNewGameImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-primary transition-all shadow-inner"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Genre</label>
                                      <select value={newGameGenre} onChange={e => setNewGameGenre(e.target.value as GameGenre)} className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-xs font-black text-gray-400 outline-none focus:border-primary appearance-none cursor-pointer">
                                          {Object.values(GameGenre).map(g => <option key={g} value={g}>{g}</option>)}
                                      </select>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Web Link</label>
                                      <input type="text" value={newGameLink} onChange={e => setNewGameLink(e.target.value)} placeholder="https://..." className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-primary transition-all shadow-inner"/>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Description</label>
                                    <textarea value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} rows={3} className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-xs font-bold focus:border-primary outline-none transition-all resize-none shadow-inner" placeholder="Brief info about the game..."></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-900/40 flex gap-4 border-t border-gray-800">
                            <button onClick={closeModal} className="flex-1 py-5 rounded-2xl text-[10px] font-black text-gray-500 hover:bg-gray-800 transition-all uppercase tracking-widest">Cancel</button>
                            <button onClick={handleSaveGame} disabled={isUploading || !newGameTitle} className="flex-1 py-5 bg-primary text-white rounded-2xl text-[10px] font-black shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-[0.2em]">
                                {isUploading ? 'Syncing...' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Móvil FAB */}
            <button 
                onClick={() => setIsChatOpen(true)}
                className="lg:hidden fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all border-4 border-background"
            >
                <MessageCircle size={28} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background shadow-lg"></span>
            </button>

            {/* Chat Drawer Móvil */}
            {isChatOpen && (
                <div className="fixed inset-0 z-[120] bg-black/80 lg:hidden backdrop-blur-xl flex items-end">
                    <div className="bg-surface w-full h-[85vh] rounded-t-[3rem] border-t border-gray-800 flex flex-col overflow-hidden animate-slide-up shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
                        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/60">
                            <span className="font-black text-sm tracking-[0.3em] text-white uppercase italic">{t('chat.title')}</span>
                            <button onClick={() => setIsChatOpen(false)} className="p-3 bg-gray-800 rounded-2xl border border-gray-700"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                             <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Escritorio */}
            <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
                <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
            </aside>
        </div>
    );
};

export default Lobby;