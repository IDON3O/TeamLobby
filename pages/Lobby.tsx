
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Gamepad2, Menu, Plus, Search, X, 
  Loader2, Lock, MessageCircle, LayoutGrid, Trophy, Trash2,
  ExternalLink, Edit3, Send, ThumbsUp, Monitor, Tv, Box, CheckCircle2, Info, Copy,
  Clock, Dices, Vote, Sparkles, RefreshCcw, UserPlus, PlayCircle, MessageSquare, ChevronDown, ChevronUp, MoreHorizontal
} from 'lucide-react';
import { Room, User, Game, GameGenre, Platform, ViewState, Comment } from '../types';
import { 
  subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, subscribeToGlobalLibrary,
  toggleUserReadyState, removeGameFromRoom, addCommentToGame, updateGameInRoom, leaveRoomCleanly, cleanupRoomMembers,
  startReadyActivity, submitReadySuggestion, submitReadyVote, resolveReadyActivity, resetReadyActivity
} from '../services/roomService';
import Chat from '../components/Chat';
import GameCard from '../components/GameCard';
import { useLanguage, TranslationKey } from '../services/i18n';
import { useAlert } from '../components/CustomModal';

interface LobbyProps {
    currentUser: User;
}

const PlatformIcon = ({ p }: { p: string }) => {
    if (p.includes('PC')) return <Monitor size={14} />;
    if (p.includes('Xbox')) return <Box size={14} />;
    if (p.includes('PS')) return <Tv size={14} />;
    if (p.includes('Switch')) return <Gamepad2 size={14} />;
    return null;
};

const Lobby: React.FC<LobbyProps> = ({ currentUser }) => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    
    const [room, setRoom] = useState<Room | null>(null);
    const [view, setView] = useState<ViewState>('LOBBY');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'VOTED' | 'RECENT'>('ALL');
    const [globalGames, setGlobalGames] = useState<Game[]>([]);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [editingGameId, setEditingGameId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameGenre, setNewGameGenre] = useState<GameGenre>(GameGenre.ACTION);
    const [newGamePlatforms, setNewGamePlatforms] = useState<Platform[]>([Platform.PC]);
    const [newGameLink, setNewGameLink] = useState('');
    const [newGameImageUrl, setNewGameImageUrl] = useState('');
    const [newGameDesc, setNewGameDesc] = useState('');
    const [showAllGenres, setShowAllGenres] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);

    useEffect(() => {
        if (code) {
            cleanupRoomMembers(code);
            const unsub = subscribeToRoom(code, (updatedRoom) => {
                if (!updatedRoom) { navigate('/'); return; }
                setRoom(updatedRoom);
            });
            const unsubLib = subscribeToGlobalLibrary(setGlobalGames);
            return () => { unsub(); unsubLib(); leaveRoomCleanly(code, currentUser.id); };
        }
    }, [code, navigate, currentUser.id]);

    const handleCopyCode = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            showAlert({ message: t('lobby.copied'), type: 'success' });
        }
    };

    const handleLeave = () => { if (code) leaveRoomCleanly(code, currentUser.id); navigate('/'); };
    const handleVote = (id: string) => room && voteForGame(room.code, id, currentUser.id);
    const handleReady = () => room && toggleUserReadyState(room.code, currentUser.id);
    const handleSendMsg = (txt: string) => {
        if (!room) return;
        sendChatMessage(room.code, { id: `${Date.now()}`, userId: currentUser.id, userName: currentUser.nickname || currentUser.alias, content: txt, timestamp: Date.now() });
    };

    const handleStartActivity = (type: 'roulette' | 'voting') => {
        if (room) startReadyActivity(room.code, type);
    };

    const handleReadySuggestion = (game: Game) => {
        if (room) submitReadySuggestion(room.code, currentUser.id, currentUser.nickname || currentUser.alias, game.id, game.title);
    };

    const handleAdvancePhase = () => {
        if (!room || !room.readySession) return;
        const suggestionsCount = Object.keys(room.readySession.suggestions || {}).length;
        if (suggestionsCount < 2) {
            showAlert({ message: "Se requieren al menos 2 juegos propuestos.", type: 'info' });
            return;
        }
        if (room.readySession.type === 'roulette') {
            setIsSpinning(true);
            setTimeout(() => {
                resolveReadyActivity(room.code);
                setIsSpinning(false);
            }, 3000);
        } else {
            resolveReadyActivity(room.code);
        }
    };

    const handleSaveGame = async () => {
        if (!newGameTitle || !room) return;
        setIsUploading(true);
        try {
            const gameData: Partial<Game> = { 
                title: newGameTitle, 
                description: newGameDesc || 'No description.', 
                imageUrl: newGameImageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop', 
                genre: newGameGenre, 
                platforms: newGamePlatforms,
                link: newGameLink 
            };
            if (editingGameId) await updateGameInRoom(room.code, editingGameId, gameData);
            else {
                const newGame: Game = { ...gameData as Game, id: `custom-${Date.now()}`, votedBy: [currentUser.id], tags: ['Custom'], status: 'approved', proposedBy: currentUser.id, comments: {} };
                await addGameToRoom(room.code, newGame, currentUser);
            }
            closeModal();
        } catch(e) { showAlert({ message: t('common.error'), type: 'error' }); } finally { setIsUploading(false); }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedGame || !room) return;
        const comment: Comment = { id: `comment-${Date.now()}`, userId: currentUser.id, userName: currentUser.nickname || currentUser.alias, text: newComment, timestamp: Date.now() };
        await addCommentToGame(room.code, selectedGame.id, comment);
        setNewComment('');
        const updatedComments = { ...(selectedGame.comments || {}), [comment.id]: comment };
        setSelectedGame({ ...selectedGame, comments: updatedComments });
    };

    const handleDeleteGame = async (gameId: string) => {
        if (!room) return;
        showAlert({
            title: "Remover Juego",
            message: "¿Estás seguro de que quieres quitar este juego de la cola?",
            type: 'confirm',
            onConfirm: async () => {
                await removeGameFromRoom(room.code, gameId, currentUser.id, currentUser.isAdmin || false);
                if (selectedGame?.id === gameId) setSelectedGame(null);
            }
        });
    };

    const togglePlatform = (p: Platform) => {
        setNewGamePlatforms(prev => 
            prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
        );
    };

    const closeModal = () => { 
        setIsGameModalOpen(false); 
        setEditingGameId(null); 
        setNewGameTitle(''); 
        setNewGameImageUrl(''); 
        setNewGameLink(''); 
        setNewGameDesc(''); 
        setNewGamePlatforms([Platform.PC]);
        setShowAllGenres(false);
    };

    const openEditModal = (game: Game) => {
        setEditingGameId(game.id);
        setNewGameTitle(game.title);
        setNewGameDesc(game.description);
        setNewGameImageUrl(game.imageUrl);
        setNewGameGenre(game.genre);
        setNewGameLink(game.link || '');
        setNewGamePlatforms(game.platforms || [Platform.PC]);
        setIsGameModalOpen(true);
    };

    if (!room) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={48}/></div>;

    const members = room.members || [];
    const sortedMembers = [...members].sort((a, b) => (a.isReady === b.isReady) ? (a.nickname || "").localeCompare(b.nickname || "") : (a.isReady ? -1 : 1));
    const suggestions = room.readySession?.suggestions || {};
    const genres = Object.values(GameGenre);
    const visibleGenres = showAllGenres ? genres : genres.slice(0, 5);

    const getProposerName = (id?: string) => {
        if (!id) return 'Anónimo';
        if (id === 'AI') return 'Gemini AI';
        const member = members.find(m => m.id === id);
        return member?.nickname || member?.alias || id;
    };

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans relative">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface border-r border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/20">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-xl"><Gamepad2 size={20} className="text-primary"/></div>
                            <span className="font-black text-xl tracking-tighter uppercase italic text-white">TeamLobby</span>
                        </Link>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><X/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <nav className="space-y-1.5">
                            <button onClick={() => { setView('LOBBY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LOBBY' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <LayoutGrid size={20}/> <span className="text-[10px] uppercase font-black tracking-widest">Lobby</span>
                            </button>
                            <button onClick={() => { setView('LIBRARY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LIBRARY' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <Search size={20}/> <span className="text-[10px] uppercase font-black tracking-widest">Library</span>
                            </button>
                            <button onClick={() => { setView('READY'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${view === 'READY' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={20}/> <span className="uppercase tracking-widest text-[10px] font-black">READY</span>
                                </div>
                                {room.readySession?.active && <div className="w-2 h-2 rounded-full bg-secondary animate-ping shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                            </button>
                        </nav>

                        <div className="space-y-2">
                            <div className="px-2 text-[10px] font-black text-gray-600 uppercase tracking-widest">SQUAD</div>
                            {sortedMembers.map(m => (
                                <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${m.isReady ? 'bg-green-500/10 border-green-500/30' : 'bg-black/20 border-gray-800'}`}>
                                    <img src={m.avatarUrl} className={`w-8 h-8 rounded-full border ${m.isReady ? 'border-green-500' : 'border-gray-800 grayscale'}`}/>
                                    <p className={`text-xs font-bold truncate flex-1 ${m.isReady ? 'text-green-500' : 'text-gray-500'}`}>{m.nickname || m.alias}</p>
                                    {m.isReady && <CheckCircle2 size={12} className="text-green-500 animate-pulse" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800">
                        <button onClick={handleReady} className={`w-full py-4 rounded-xl text-xs font-black tracking-widest transition-all mb-3 ${currentUser.isReady ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'bg-gray-800 text-gray-500'}`}>
                            {currentUser.isReady ? 'READY' : 'SET READY'}
                        </button>
                        <button onClick={handleLeave} className="w-full py-2 bg-gray-900 border border-gray-800 rounded-xl text-[10px] font-black uppercase text-gray-400">LEAVE</button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-background relative">
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><Menu/></button>
                        <div>
                            <h2 className="text-lg font-black text-white">{room.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-black text-primary/80">#{room.code}</span>
                                <button onClick={handleCopyCode} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-all"><Copy size={12}/></button>
                            </div>
                        </div>
                    </div>
                    {view === 'LOBBY' && !currentUser.isGuest && (
                        <button onClick={() => setIsGameModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                            <Plus size={16}/> <span className="hidden sm:inline">Add Game</span>
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {view === 'LOBBY' ? (
                        <div className="space-y-6 max-w-7xl mx-auto w-full">
                            <div className="flex p-1 bg-black/40 border border-gray-800 rounded-xl w-fit">
                                {['ALL', 'VOTED', 'RECENT'].map(f => (
                                    <button key={f} onClick={() => setActiveFilter(f as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${activeFilter === f ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
                                {room.gameQueue.map(g => (
                                    <GameCard key={g.id} game={g} currentUserId={currentUser.id} onVote={handleVote} onOpenDetails={setSelectedGame} isVotingEnabled={true} />
                                ))}
                                {room.gameQueue.length === 0 && (
                                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-700 bg-surface/10 border-2 border-dashed border-gray-800 rounded-[3rem]">
                                        <div className="p-6 bg-gray-900/50 rounded-full mb-4 border border-gray-800">
                                            <Gamepad2 size={48} className="opacity-20"/>
                                        </div>
                                        <p className="font-black text-xs uppercase tracking-[0.3em]">Queue is empty. Add from Library!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : view === 'LIBRARY' ? (
                        <div className="max-w-7xl mx-auto space-y-8 w-full">
                             <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24}/>
                                <input type="text" placeholder="Search global library..." className="w-full bg-surface border border-gray-800 rounded-[2.5rem] py-5 pl-14 pr-6 outline-none focus:border-primary text-sm font-black tracking-widest shadow-xl"/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {globalGames.map(g => (
                                    <div key={g.id} className="flex flex-col h-full group/item">
                                        <GameCard game={{...g, status: 'approved'}} currentUserId={currentUser.id} onVote={()=>{}} onOpenDetails={setSelectedGame} isVotingEnabled={false} />
                                        <button onClick={() => addGameToRoom(room.code, g, currentUser)} className="mt-4 w-full py-4 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-[0.2em]">Add to Queue</button>
                                    </div>
                                ))}
                                {globalGames.length === 0 && (
                                    <div className="col-span-full py-20 text-center text-gray-600 font-black uppercase text-xs tracking-widest">Global Library is Empty</div>
                                )}
                             </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                             {!room.readySession || room.readySession.status === 'idle' ? (
                                <div className="text-center space-y-10">
                                    <div className="space-y-4">
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mx-auto">
                                            <Sparkles size={48} className="text-primary"/>
                                        </div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">READY COMMAND</h3>
                                        <p className="text-gray-500 font-bold max-w-md mx-auto text-sm leading-relaxed italic">Coordina el inicio de la sesión.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
                                        <button onClick={() => handleStartActivity('roulette')} className="group p-8 bg-surface border-2 border-gray-800 rounded-[2.5rem] hover:border-primary/50 transition-all text-left space-y-4 shadow-xl">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Dices size={28}/></div>
                                            <div>
                                                <h4 className="font-black text-lg text-white uppercase italic tracking-tighter">Ruleta</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Azar entre propuestas.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => handleStartActivity('voting')} className="group p-8 bg-surface border-2 border-gray-800 rounded-[2.5rem] hover:border-secondary/50 transition-all text-left space-y-4 shadow-xl">
                                            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform"><Vote size={28}/></div>
                                            <div>
                                                <h4 className="font-black text-lg text-white uppercase italic tracking-tighter">Voto</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Votación democrática.</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                             ) : (
                                <div className="w-full bg-surface border border-gray-800 rounded-[3rem] p-8 md:p-12 space-y-10 shadow-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800">
                                                {room.readySession.type === 'roulette' ? <Dices className="text-primary"/> : <Vote className="text-secondary"/>}
                                            </div>
                                            <h3 className="text-xl font-black italic uppercase text-white">{room.readySession.type === 'roulette' ? 'Ruleta' : 'Votación'}</h3>
                                        </div>
                                        <button onClick={() => resetReadyActivity(room.code)} className="p-3 hover:bg-gray-800 rounded-xl transition-all"><RefreshCcw size={20}/></button>
                                    </div>
                                    
                                    {room.readySession.status === 'collecting' && (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Propuestas</h4>
                                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                        {room.gameQueue.map(g => {
                                                            const isSuggested = suggestions[currentUser.id]?.gameId === g.id;
                                                            return (
                                                                <button key={g.id} onClick={() => handleReadySuggestion(g)} className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left text-xs font-black ${isSuggested ? 'bg-primary/20 border-primary text-white' : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                                                                    {g.title} {isSuggested && <CheckCircle2 size={16} className="text-primary"/>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">En Escena ({Object.keys(suggestions).length})</h4>
                                                    <div className="space-y-2">
                                                        {Object.values(suggestions).map((s: any) => (
                                                            <div key={s.userName + s.gameId} className="p-4 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-[11px] font-black italic">
                                                                <span className="text-primary uppercase">{s.userName}</span>
                                                                <span className="text-gray-400">{s.gameTitle}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={handleAdvancePhase} disabled={isSpinning || Object.keys(suggestions).length < 2} className="w-full py-6 bg-white text-black font-black uppercase rounded-[2rem] flex items-center justify-center gap-3 shadow-xl hover:bg-gray-200 transition-all disabled:opacity-50">
                                                {isSpinning ? <Loader2 className="animate-spin" /> : <PlayCircle size={20}/>}
                                                PROCESAR ACTIVIDAD
                                            </button>
                                        </div>
                                    )}

                                    {room.readySession.status === 'results' && (
                                        <div className="text-center py-12 space-y-8">
                                            <div className="relative inline-block">
                                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                                                <Trophy size={80} className="text-yellow-500 mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] relative z-10"/>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Resultado Final</p>
                                                <h4 className="text-4xl font-black italic uppercase text-white drop-shadow-xl tracking-tighter">
                                                    {Array.isArray(room.readySession.winner) ? "¡EMPATE TÉCNICO!" : (room.gameQueue.find(g => g.id === room.readySession?.winner)?.title || "ELEGIDO POR EL DESTINO")}
                                                </h4>
                                            </div>
                                            <button onClick={() => resetReadyActivity(room.code)} className="px-12 py-4 bg-gray-800 border border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">REINICIAR</button>
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                    )}
                </div>

                <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-4">
                    {isChatOpen && (
                        <div className="w-[calc(100vw-3rem)] sm:w-[400px] bg-surface/95 backdrop-blur-2xl border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[500px] md:h-[600px] animate-in slide-in-from-bottom-10">
                            <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
                        </div>
                    )}
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-4 border-background ${isChatOpen ? 'bg-gray-900 text-white' : 'bg-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]'}`}>
                        {isChatOpen ? <X size={28}/> : <MessageCircle size={28}/>}
                    </button>
                </div>
            </main>

            {selectedGame && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in">
                    <div className="bg-surface border border-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
                        <button onClick={() => setSelectedGame(null)} className="absolute top-6 right-6 z-[60] p-3 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all border border-white/10 shadow-lg"><X size={24}/></button>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="relative w-full h-[220px] md:h-[320px] bg-gray-900">
                                <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-125" style={{ backgroundImage: `url(${selectedGame.imageUrl})` }}/>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={selectedGame.imageUrl} className="h-full w-auto object-contain max-w-full drop-shadow-2xl py-6" alt={selectedGame.title}/>
                                </div>
                                <div className="absolute bottom-6 left-8">
                                    <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-lg">{selectedGame.title}</h3>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="text-primary font-black uppercase text-[9px] bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">{t(`genre.${selectedGame.genre}` as TranslationKey)}</span>
                                        <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded-lg border border-gray-800 shadow-inner">
                                            {selectedGame.platforms.map(p => <PlatformIcon key={p} p={p} />)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row">
                                <div className="flex-1 p-6 md:p-8 space-y-8">
                                    <div className="space-y-3">
                                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Info size={12}/> Resumen</h4>
                                        <p className="text-gray-300 text-sm italic leading-relaxed bg-black/30 p-6 rounded-2xl border border-gray-800/50">"{selectedGame.description || 'Sin descripción disponible.'}"</p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={12}/> {t('lobby.comments')}</h4>
                                        <div className="space-y-3">
                                            {Object.values(selectedGame.comments || {}).length === 0 ? (
                                                <div className="p-8 border border-dashed border-gray-800 rounded-2xl text-center">
                                                    <p className="text-[9px] text-gray-700 italic font-black uppercase tracking-widest">{t('lobby.noComments')}</p>
                                                </div>
                                            ) : (
                                                Object.values(selectedGame.comments || {}).map(c => (
                                                    <div key={c.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 group/comment">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[9px] font-black text-primary uppercase italic">{c.userName}</span>
                                                            <span className="text-[8px] text-gray-700 font-bold">{new Date(c.timestamp).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-300 leading-relaxed italic">"{c.text}"</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {!currentUser.isGuest && (
                                            <div className="flex gap-2 pt-2">
                                                <input value={newComment} onChange={e => setNewComment(e.target.value)} className="flex-1 bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary font-bold placeholder:text-gray-700" placeholder={t('lobby.addComment')}/>
                                                <button onClick={handleAddComment} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-violet-600 transition-all"><Send size={18}/></button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full lg:w-52 p-6 md:p-8 lg:border-l border-gray-800 space-y-6 bg-gray-900/10 shrink-0">
                                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Info Técnica</h4>
                                    <div className="p-4 bg-black/40 border border-gray-800 rounded-2xl space-y-3">
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Postulado por</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-[10px] text-primary italic">#</div>
                                            <span className="text-[11px] font-black text-white italic truncate" title={getProposerName(selectedGame.proposedBy)}>
                                                {getProposerName(selectedGame.proposedBy)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-black/40 border border-gray-800 rounded-2xl space-y-3">
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Plataformas</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedGame.platforms.map(p => (
                                                <div key={p} className="flex items-center gap-1.5 bg-gray-800/50 px-2 py-1 rounded-lg text-[9px] font-black text-gray-400">
                                                    <PlatformIcon p={p}/> {p}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 bg-gray-900 border-t border-gray-800 flex flex-wrap items-center gap-4 shrink-0">
                            {view === 'LOBBY' && (
                                <button onClick={() => handleVote(selectedGame.id)} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${selectedGame.votedBy?.includes(currentUser.id) ? 'bg-primary text-white shadow-primary/30' : 'bg-white text-black hover:bg-gray-200 shadow-xl'}`}>
                                    <ThumbsUp size={18} className={selectedGame.votedBy?.includes(currentUser.id) ? 'fill-current' : ''}/>
                                    {selectedGame.votedBy?.includes(currentUser.id) ? 'VOTADO' : 'VOTAR'}
                                </button>
                            )}
                            
                            {view === 'LIBRARY' && (
                                <button onClick={() => addGameToRoom(room.code, selectedGame, currentUser)} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95">
                                    <Plus size={18}/> AÑADIR A LA COLA
                                </button>
                            )}

                            {(currentUser.isAdmin || selectedGame.proposedBy === currentUser.id) && view === 'LOBBY' && (
                                <div className="flex gap-2">
                                    <button onClick={() => openEditModal(selectedGame)} className="p-4 bg-surface border border-gray-800 text-gray-400 hover:text-white rounded-2xl transition-all hover:bg-gray-800 shadow-xl" title="Editar">
                                        <Edit3 size={18}/>
                                    </button>
                                    <button onClick={() => handleDeleteGame(selectedGame.id)} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-xl" title="Eliminar">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            )}

                            {selectedGame.link && (
                                <a href={selectedGame.link} target="_blank" rel="noreferrer" className="p-4 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-2xl transition-all shadow-xl" title="Ver en tienda">
                                    <ExternalLink size={18}/>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isGameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-surface border border-gray-700 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">{editingGameId ? 'Editar Postulación' : t('lobby.modalTitle')}</h3>
                            <button onClick={closeModal} className="p-2.5 hover:bg-gray-800 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Título del Juego</label>
                                <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm font-black focus:border-primary outline-none transition-all placeholder:text-gray-700" placeholder="e.g. Halo Infinite..."/>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Género</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {visibleGenres.map(g => (
                                        <button 
                                            key={g} 
                                            onClick={() => setNewGameGenre(g)} 
                                            className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase transition-all border ${newGameGenre === g ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10' : 'bg-black/40 text-gray-500 border-gray-800'}`}
                                        >
                                            {t(`genre.${g}` as TranslationKey)}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setShowAllGenres(!showAllGenres)}
                                        className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase transition-all border flex items-center justify-center gap-1 ${showAllGenres ? 'bg-gray-800 text-white border-gray-700' : 'bg-black/40 text-gray-500 border-gray-800'}`}
                                    >
                                        {showAllGenres ? <ChevronUp size={10}/> : <MoreHorizontal size={10}/>}
                                        {showAllGenres ? 'MENOS' : 'MÁS'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Plataformas</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(Platform).map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => togglePlatform(p)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black transition-all border ${newGamePlatforms.includes(p) ? 'bg-secondary/20 text-secondary border-secondary shadow-lg shadow-secondary/10' : 'bg-black/40 text-gray-500 border-gray-800'}`}
                                        >
                                            <PlatformIcon p={p}/> {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Portada (URL)</label>
                                    <input type="text" value={newGameImageUrl} onChange={e => setNewGameImageUrl(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-primary transition-all placeholder:text-gray-800" placeholder="https://...jpg"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Enlace</label>
                                    <input type="text" value={newGameLink} onChange={e => setNewGameLink(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-primary transition-all placeholder:text-gray-800" placeholder="e.g. Steam Store..."/>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Descripción</label>
                                <textarea value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-[10px] h-20 font-bold outline-none focus:border-primary transition-all resize-none placeholder:text-gray-800" placeholder="¿Por qué jugar este título?..."/>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-900/60 flex gap-3 border-t border-gray-800">
                            <button onClick={closeModal} className="flex-1 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
                            <button onClick={handleSaveGame} disabled={isUploading || !newGameTitle} className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all">
                                {isUploading ? <Loader2 className="animate-spin mx-auto" size={16}/> : (editingGameId ? 'Actualizar' : 'Publicar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;
