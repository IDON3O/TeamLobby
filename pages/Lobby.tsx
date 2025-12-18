
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
import { useAlert } from '../components/CustomModal';

interface LobbyProps {
    currentUser: User;
}

const Lobby: React.FC<LobbyProps> = ({ currentUser }) => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    
    const [room, setRoom] = useState<Room | null>(null);
    const [view, setView] = useState<'LOBBY' | 'LIBRARY'>('LOBBY');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'VOTED' | 'RECENT'>('ALL');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [editingGameId, setEditingGameId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameGenre, setNewGameGenre] = useState<GameGenre>(GameGenre.FPS);
    const [newGameLink, setNewGameLink] = useState('');
    const [newGameImageUrl, setNewGameImageUrl] = useState('');
    const [newGameDesc, setNewGameDesc] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (code) {
            const unsub = subscribeToRoom(code, (updatedRoom) => {
                if (!updatedRoom) { navigate('/'); return; }
                setRoom(updatedRoom);
                if (selectedGame) {
                  const updated = updatedRoom.gameQueue.find(g => g.id === selectedGame.id);
                  if (updated) setSelectedGame(updated);
                  else setSelectedGame(null);
                }
            });
            return () => unsub();
        }
    }, [code, navigate, selectedGame?.id]);

    const handleLeave = () => navigate('/');
    const handleVote = (id: string) => room && voteForGame(room.code, id, currentUser.id);
    
    const handleRemove = (id: string) => {
        showAlert({
            title: "REMOVE ENTRY",
            message: "Are you sure you want to delete this game suggestion?",
            type: 'confirm',
            confirmText: "Delete",
            onConfirm: () => {
                if (room) {
                    removeGameFromRoom(room.code, id, currentUser.id, !!currentUser.isAdmin);
                    setSelectedGame(null);
                }
            }
        });
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
        } catch(e) { showAlert({ message: t('common.error'), type: 'error' }); } finally { setIsUploading(false); }
    };

    const closeModal = () => {
        setIsGameModalOpen(false);
        setEditingGameId(null);
        setNewGameTitle(''); setNewGameImageUrl(''); setNewGameLink(''); setNewGameDesc('');
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

    if (activeFilter === 'VOTED') queue.sort((a, b) => (b.votedBy?.length || 0) - (a.votedBy?.length || 0));
    else if (activeFilter === 'RECENT') queue.reverse();
    else queue.sort((a, b) => a.title.localeCompare(b.title));

    // LÓGICA DE RANKING ACTUALIZADA:
    // 1. "El voto propio no cuenta": Se resta 1 punto por cada juego propuesto (que es el voto automático del autor).
    // 2. "Más de 2 votos": Solo se suman puntos si el juego tiene 2 o más votos (es decir, al menos 1 voto de un tercero).
    const sortedRanking = members.map(m => {
        const proposedGames = queue.filter(g => g.proposedBy === m.id);
        const totalVotes = proposedGames.reduce((acc, g) => {
            const count = g.votedBy?.length || 0;
            // Si tiene más de 1 voto (el propio + al menos uno de otro), contamos los votos externos
            if (count > 1) {
                return acc + (count - 1); 
            }
            return acc;
        }, 0);
        return { ...m, totalVotes };
    }).filter(m => m.totalVotes > 0).sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

    const podium = [
        sortedRanking[1], sortedRanking[0], sortedRanking[2]
    ].filter(Boolean);

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans relative">
            
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

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

                        {/* El podio ahora se muestra si al menos un usuario tiene 1 voto de comunidad */}
                        {sortedRanking.length > 0 && (
                            <div className="relative pt-8 pb-4 bg-black/20 rounded-2xl border border-gray-800/50">
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-50">
                                    <Trophy size={10} className="text-yellow-500"/>
                                    <span className="text-[8px] font-black uppercase tracking-tighter">SQUAD LEADERS</span>
                                </div>
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

            {selectedGame && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-surface border border-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setSelectedGame(null)} className="absolute top-6 right-6 z-[60] p-3 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all border border-white/10 shadow-lg">
                    <X size={24}/>
                  </button>

                  <div className="relative w-full h-[200px] md:h-[300px] shrink-0 bg-gray-900">
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110" 
                      style={{ backgroundImage: `url(${selectedGame.imageUrl})` }}
                    />
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img 
                        src={selectedGame.imageUrl} 
                        className="h-full w-auto object-contain max-w-full drop-shadow-2xl" 
                        alt={selectedGame.title}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-8 right-8">
                      <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-2xl">{selectedGame.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-primary font-black uppercase tracking-[0.2em] text-xs bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">{selectedGame.genre}</span>
                        {selectedGame.proposedBy && (
                          <span className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Proposed by {members.find(m => m.id === selectedGame.proposedBy)?.nickname || 'Member'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                      
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Gamepad2 size={14}/> {t('lobby.gameTitle')} Info
                          </h4>
                          <p className="text-gray-300 text-sm leading-relaxed italic bg-black/20 p-5 rounded-2xl border border-gray-800/50">
                            "{selectedGame.description}"
                          </p>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Available Platforms</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedGame.platforms.map(p => (
                               <div key={p} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-[10px] font-black text-gray-400">
                                  {p.includes('PC') ? <Monitor size={14}/> : p.includes('Xbox') ? <Box size={14}/> : <Tv size={14}/>} {p}
                               </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 flex flex-col h-full">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                          <MessageCircle size={14}/> {t('lobby.comments')} ({selectedGame.comments ? Object.values(selectedGame.comments).length : 0})
                        </h4>
                        
                        <div className="flex-1 bg-black/40 border border-gray-800 rounded-2xl p-4 overflow-hidden flex flex-col min-h-[250px] max-h-[300px]">
                          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {selectedGame.comments && Object.values(selectedGame.comments).length > 0 ? (
                              Object.values(selectedGame.comments).map((c: any) => (
                                <div key={c.id} className="bg-surface/50 border border-gray-800/50 p-3 rounded-xl">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black text-accent uppercase">{c.userName}</span>
                                    <span className="text-[8px] text-gray-600">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-xs text-gray-300 leading-snug">{c.text}</p>
                                </div>
                              ))
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <MessageCircle size={32} className="mb-2"/>
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('lobby.noComments')}</p>
                              </div>
                            )}
                          </div>
                          
                          <form onSubmit={handleAddComment} className="relative mt-4 shrink-0">
                            <input 
                              type="text" 
                              value={newComment} 
                              onChange={e => setNewComment(e.target.value)}
                              placeholder={t('lobby.addComment')}
                              className="w-full bg-black border border-gray-800 rounded-xl py-3.5 pl-4 pr-12 text-xs font-bold outline-none focus:border-primary transition-all"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary p-2 hover:bg-primary/10 rounded-lg transition-colors">
                              <Send size={16}/>
                            </button>
                          </form>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="p-8 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
                    <div className="flex items-center gap-3">
                       {(currentUser.isAdmin || selectedGame.proposedBy === currentUser.id) && (
                          <div className="flex gap-2 mr-2">
                            <button onClick={() => openEditModal(selectedGame)} className="p-4 bg-surface text-gray-400 border border-gray-800 rounded-2xl hover:text-primary hover:border-primary/50 transition-all shadow-xl group">
                              <Edit3 size={20} className="group-hover:scale-110 transition-transform"/>
                            </button>
                            <button onClick={() => handleRemove(selectedGame.id)} className="p-4 bg-surface text-gray-400 border border-gray-800 rounded-2xl hover:text-red-500 hover:border-red-500/50 transition-all shadow-xl group">
                              <Trash2 size={20} className="group-hover:scale-110 transition-transform"/>
                            </button>
                          </div>
                       )}
                       {selectedGame.link && (
                         <a href={selectedGame.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-6 py-4 bg-surface border border-gray-800 text-white rounded-2xl hover:bg-white hover:text-black transition-all shadow-xl font-black uppercase text-[10px] tracking-widest">
                            <ExternalLink size={18}/> {t('lobby.coverImage')} Link
                         </a>
                       )}
                    </div>

                    <button 
                      onClick={() => handleVote(selectedGame.id)} 
                      className={`w-full md:w-auto min-w-[240px] py-4 px-10 rounded-2xl font-black text-xs tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 ${
                        selectedGame.votedBy?.includes(currentUser.id) 
                        ? 'bg-primary text-white shadow-primary/30' 
                        : 'bg-white text-black hover:bg-gray-200'
                      }`}
                    >
                      <ThumbsUp size={20} className={selectedGame.votedBy?.includes(currentUser.id) ? 'fill-current' : ''}/>
                      {selectedGame.votedBy?.includes(currentUser.id) ? 'VOTED' : 'CAST VOTE'} 
                      <span className="ml-2 bg-black/10 px-2 py-0.5 rounded text-[10px]">{selectedGame.votedBy?.length || 0}</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

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

            <button 
                onClick={() => setIsChatOpen(true)}
                className="lg:hidden fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all border-4 border-background"
            >
                <MessageCircle size={28} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background shadow-lg"></span>
            </button>

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

            <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
                <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
            </aside>
        </div>
    );
};

export default Lobby;
