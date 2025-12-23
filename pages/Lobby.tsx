
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Gamepad2, Menu, Plus, Search, X, 
  Loader2, Lock, MessageCircle, LayoutGrid, Trophy, Trash2,
  ExternalLink, Edit3, Send, ThumbsUp, Monitor, Tv, Box, CheckCircle2, Info, ChevronDown, ChevronUp,
  Clock, Dices, Vote, Sparkles, RefreshCcw
} from 'lucide-react';
import { Room, User, Game, GameGenre, Platform, ViewState } from '../types';
import { 
  subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, 
  toggleUserReadyState, removeGameFromRoom, addCommentToGame, updateGameInRoom, leaveRoomCleanly, cleanupRoomMembers,
  startReadyActivity, submitReadySuggestion, submitReadyVote, resolveReadyActivity, resetReadyActivity
} from '../services/roomService';
import { uploadGameImage } from '../services/firebaseService';
import { MOCK_GAMES } from '../constants';
import Chat from '../components/Chat';
import GameCard from '../components/GameCard';
import { useLanguage, TranslationKey } from '../services/i18n';
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
    const [view, setView] = useState<ViewState>('LOBBY');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'VOTED' | 'RECENT'>('ALL');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [editingGameId, setEditingGameId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameGenre, setNewGameGenre] = useState<GameGenre>(GameGenre.ACTION);
    const [newGameLink, setNewGameLink] = useState('');
    const [newGameImageUrl, setNewGameImageUrl] = useState('');
    const [newGameDesc, setNewGameDesc] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showAllGenres, setShowAllGenres] = useState(false);

    // Roulette specific state
    const [isSpinning, setIsSpinning] = useState(false);

    useEffect(() => {
        if (code) {
            cleanupRoomMembers(code);
            const unsub = subscribeToRoom(code, (updatedRoom) => {
                if (!updatedRoom) { navigate('/'); return; }
                setRoom(updatedRoom);
            });
            return () => { unsub(); leaveRoomCleanly(code, currentUser.id); };
        }
    }, [code, navigate, currentUser.id]);

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

    const handleResolve = () => {
        if (room?.readySession?.type === 'roulette') {
            setIsSpinning(true);
            setTimeout(() => {
                resolveReadyActivity(room.code);
                setIsSpinning(false);
            }, 3000);
        } else {
            if (room) resolveReadyActivity(room.code);
        }
    };

    const handleSaveGame = async () => {
        if (!newGameTitle || !room) return;
        setIsUploading(true);
        try {
            let finalImg = newGameImageUrl;
            const gameData: Partial<Game> = { title: newGameTitle, description: newGameDesc || 'User recommended game.', imageUrl: finalImg, genre: newGameGenre, link: newGameLink };
            if (editingGameId) await updateGameInRoom(room.code, editingGameId, gameData);
            else {
                const newGame: Game = { ...gameData as Game, id: `custom-${Date.now()}`, platforms: [Platform.PC], votedBy: [currentUser.id], tags: ['Custom'], status: 'approved', proposedBy: currentUser.id, comments: [] };
                await addGameToRoom(room.code, newGame, currentUser);
            }
            closeModal();
        } catch(e) { showAlert({ message: t('common.error'), type: 'error' }); } finally { setIsUploading(false); }
    };

    const closeModal = () => { setIsGameModalOpen(false); setEditingGameId(null); setSelectedFile(null); setNewGameTitle(''); setNewGameImageUrl(''); setNewGameLink(''); setNewGameDesc(''); setShowAllGenres(false); };

    if (!room) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={48}/></div>;

    const members = room.members || [];
    const sortedMembers = [...members].sort((a, b) => (a.isReady === b.isReady) ? (a.nickname || "").localeCompare(b.nickname || "") : (a.isReady ? -1 : 1));
    const readyActivityActive = room.readySession?.active && room.readySession?.status !== 'idle';

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
                            <button onClick={() => { setView('READY'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${view === 'READY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={20}/> <span className="uppercase tracking-widest text-[10px] font-black">READY</span>
                                </div>
                                {readyActivityActive && <div className="w-2 h-2 rounded-full bg-white animate-ping" />}
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
                            <span className="text-[10px] font-mono font-black text-primary/80">#{room.code}</span>
                        </div>
                    </div>
                    {view === 'LOBBY' && (
                        <button onClick={() => setIsGameModalOpen(true)} className="bg-primary hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95">
                            <Plus size={20}/> <span className="hidden sm:inline uppercase tracking-widest">Add Game</span>
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {view === 'LOBBY' ? (
                        <div className="space-y-6 max-w-7xl mx-auto w-full">
                            <div className="flex p-1 bg-black/40 border border-gray-800 rounded-xl w-fit">
                                {['ALL', 'VOTED', 'RECENT'].map(f => (
                                    <button key={f} onClick={() => setActiveFilter(f as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${activeFilter === f ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
                                {room.gameQueue.map(g => (
                                    <GameCard key={g.id} game={g} currentUserId={currentUser.id} onVote={handleVote} onOpenDetails={setSelectedGame} isVotingEnabled={!currentUser.isGuest} />
                                ))}
                            </div>
                        </div>
                    ) : view === 'LIBRARY' ? (
                        <div className="max-w-7xl mx-auto space-y-8 w-full">
                             <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24}/>
                                <input type="text" placeholder="Search global library..." className="w-full bg-surface border border-gray-800 rounded-[2rem] py-5 pl-14 pr-6 outline-none focus:border-primary text-sm font-black tracking-widest"/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {MOCK_GAMES.map(g => (
                                    <div key={g.id} className="flex flex-col h-full group/item">
                                        <GameCard game={{...g, status: 'approved'}} currentUserId={currentUser.id} onVote={()=>{}} onOpenDetails={setSelectedGame} isVotingEnabled={false} />
                                        <button onClick={() => addGameToRoom(room.code, g, currentUser)} className="mt-4 w-full py-4 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-[0.2em]">Add to Queue</button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ) : (
                        /* READY VIEW - NEW CONTENT */
                        <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                             {!room.readySession || room.readySession.status === 'idle' ? (
                                <div className="text-center space-y-10">
                                    <div className="space-y-4">
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mx-auto">
                                            <Sparkles size={48} className="text-primary"/>
                                        </div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Centro de Operaciones</h3>
                                        <p className="text-gray-500 font-bold max-w-md mx-auto text-sm leading-relaxed italic">Coordina el inicio de la sesión. Elige un método para decidir qué jugar ahora mismo.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <button onClick={() => handleStartActivity('roulette')} className="group p-8 bg-surface border-2 border-gray-800 rounded-[2.5rem] hover:border-primary/50 transition-all text-left space-y-4 shadow-xl">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Dices size={28}/></div>
                                            <div>
                                                <h4 className="font-black text-lg text-white uppercase italic tracking-tighter">Ruleta del Destino</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Azar puro entre vuestras propuestas.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => handleStartActivity('voting')} className="group p-8 bg-surface border-2 border-gray-800 rounded-[2.5rem] hover:border-secondary/50 transition-all text-left space-y-4 shadow-xl">
                                            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform"><Vote size={28}/></div>
                                            <div>
                                                <h4 className="font-black text-lg text-white uppercase italic tracking-tighter">Voto de Escuadra</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Votación democrática sin auto-voto.</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                             ) : (
                                <div className="w-full bg-surface border border-gray-800 rounded-[3rem] p-10 space-y-10 shadow-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800">
                                                {room.readySession.type === 'roulette' ? <Dices className="text-primary"/> : <Vote className="text-secondary"/>}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black italic uppercase text-white">{room.readySession.type === 'roulette' ? 'Ruleta del Destino' : 'Voto de Escuadra'}</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{room.readySession.status === 'results' ? 'Resultados Finales' : 'Recopilando Propuestas...'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => resetReadyActivity(room.code)} className="p-3 hover:bg-gray-800 rounded-xl transition-all text-gray-600 hover:text-white"><RefreshCcw size={20}/></button>
                                    </div>

                                    {room.readySession.status === 'collecting' && (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">¿Qué quieres jugar?</h4>
                                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {room.gameQueue.map(g => {
                                                            const isSuggested = room.readySession?.suggestions[currentUser.id]?.gameId === g.id;
                                                            return (
                                                                <button 
                                                                    key={g.id} 
                                                                    onClick={() => handleReadySuggestion(g)}
                                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${isSuggested ? 'bg-primary/20 border-primary text-white' : 'bg-black/20 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                                                >
                                                                    <span className="text-xs font-black truncate max-w-[140px]">{g.title}</span>
                                                                    {isSuggested && <CheckCircle2 size={16}/>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Participantes ({Object.keys(room.readySession.suggestions || {}).length})</h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {/* Fix: Cast Object.values to any to avoid unknown type errors */}
                                                        {(Object.values(room.readySession.suggestions || {}) as any[]).map(s => (
                                                            <div key={s.userName} className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                                <span className="text-[10px] font-black text-white">{s.userName}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {room.readySession.type === 'voting' && Object.keys(room.readySession.suggestions).length > 1 && (
                                                <div className="p-6 bg-secondary/5 border border-secondary/20 rounded-[2rem] space-y-4">
                                                    <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest text-center">¡Vota por tu favorito!</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {/* Fix: Cast Object.values to any to avoid unknown type errors */}
                                                        {(Object.values(room.readySession.suggestions) as any[]).map(s => {
                                                            const canVote = s.gameId !== room.readySession?.suggestions[currentUser.id]?.gameId;
                                                            const hasVoted = room.readySession?.votes[currentUser.id] === s.gameId;
                                                            return (
                                                                <button 
                                                                    key={s.gameId}
                                                                    disabled={!canVote}
                                                                    onClick={() => submitReadyVote(room.code, currentUser.id, s.gameId)}
                                                                    className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all ${hasVoted ? 'bg-secondary text-black border-secondary' : canVote ? 'bg-black/40 border-gray-800 text-gray-500 hover:text-white hover:border-gray-600' : 'bg-gray-900 border-gray-900 text-gray-800 opacity-50 cursor-not-allowed'}`}
                                                                >
                                                                    {s.gameTitle}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleResolve}
                                                disabled={isSpinning || Object.keys(room.readySession.suggestions).length === 0}
                                                className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-xs rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
                                            >
                                                {isSpinning ? <Loader2 className="animate-spin" /> : <Sparkles size={20}/>}
                                                {isSpinning ? 'GIRANDO...' : room.readySession.type === 'roulette' ? 'LANZAR RULETA' : 'FINALIZAR VOTACIÓN'}
                                            </button>
                                        </div>
                                    )}

                                    {room.readySession.status === 'results' && (
                                        <div className="flex flex-col items-center py-10 space-y-8 animate-in zoom-in-50 duration-500">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-primary/40 blur-[80px] rounded-full animate-pulse" />
                                                <div className="relative bg-gray-900 border-4 border-primary p-12 rounded-[3rem] shadow-[0_0_60px_rgba(139,92,246,0.3)]">
                                                    <Trophy size={64} className="text-yellow-500 drop-shadow-2xl mb-4 mx-auto"/>
                                                    <div className="text-center space-y-2">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">¡Tenemos un Ganador!</p>
                                                        <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                                                            {Array.isArray(room.readySession.winner) 
                                                                ? room.gameQueue.filter(g => room.readySession?.winner?.includes(g.id)).map(g => g.title).join(' & ')
                                                                : room.gameQueue.find(g => g.id === room.readySession?.winner)?.title || 'Juego Eliminado'}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => resetReadyActivity(room.code)} className="px-10 py-4 bg-gray-800 hover:bg-white hover:text-black text-gray-400 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest border border-gray-700">Nueva Selección</button>
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                    )}
                </div>

                {/* FAB Chat */}
                <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-4">
                    {isChatOpen && (
                        <div className="w-[calc(100vw-3rem)] sm:w-[400px] bg-surface/95 backdrop-blur-2xl border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[500px] md:h-[600px] animate-in slide-in-from-bottom-10">
                             <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <span className="font-black text-[11px] tracking-widest text-white uppercase">SQUAD_CHANNEL</span>
                                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-gray-800 rounded-xl"><X size={20}/></button>
                            </div>
                            <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
                        </div>
                    )}
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all ${isChatOpen ? 'bg-gray-900 text-white' : 'bg-primary text-white shadow-primary/20'}`}>
                        {isChatOpen ? <X size={28} /> : <MessageCircle size={28} />}
                    </button>
                </div>
            </main>

            {/* Modal: Game Details (Reducido para brevedad ya que el usuario conoce el flujo) */}
            {selectedGame && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in">
                    <div className="bg-surface border border-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
                        <button onClick={() => setSelectedGame(null)} className="absolute top-6 right-6 z-[60] p-3 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all border border-white/10 shadow-lg"><X size={24}/></button>
                        <div className="relative w-full h-[240px] md:h-[340px] shrink-0 bg-gray-900">
                            <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-125" style={{ backgroundImage: `url(${selectedGame.imageUrl})` }}/>
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={selectedGame.imageUrl} className="h-full w-auto object-contain max-w-full drop-shadow-2xl py-8" alt={selectedGame.title}/>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                            <div className="absolute bottom-6 left-8 right-8">
                                <h3 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-2xl leading-none">{selectedGame.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                    <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px] bg-primary/10 px-4 py-1.5 rounded-lg border border-primary/20">{t(`genre.${selectedGame.genre}` as TranslationKey)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <p className="text-gray-300 text-sm leading-relaxed italic bg-black/20 p-6 rounded-2xl border border-gray-800/50">"{selectedGame.description}"</p>
                        </div>
                        <div className="p-8 bg-gray-900 border-t border-gray-800 flex justify-end">
                            <button onClick={() => handleVote(selectedGame.id)} className={`py-4 px-10 rounded-2xl font-black text-xs tracking-[0.2em] transition-all ${selectedGame.votedBy?.includes(currentUser.id) ? 'bg-primary text-white' : 'bg-white text-black'}`}>
                                {selectedGame.votedBy?.includes(currentUser.id) ? 'VOTED' : 'CAST VOTE'} 
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add Game */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-surface border border-gray-700 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">{t('lobby.modalTitle')}</h3>
                            <button onClick={closeModal} className="p-3 hover:bg-gray-800 rounded-2xl"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Game Title</label>
                                <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-sm font-black focus:border-primary outline-none transition-all shadow-inner" placeholder="e.g. Elden Ring"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Category</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.values(GameGenre).slice(0, 6).map(g => (
                                        <button key={g} onClick={() => setNewGameGenre(g)} className={`px-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${newGameGenre === g ? 'bg-primary text-white border-primary shadow-lg' : 'bg-black/40 text-gray-500 border-gray-800'}`}>{t(`genre.${g}` as TranslationKey)}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Image Link</label>
                                <input type="text" value={newGameImageUrl} onChange={e => setNewGameImageUrl(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-primary" placeholder="URL portadas..."/>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-900/60 flex gap-4 border-t border-gray-800">
                            <button onClick={closeModal} className="flex-1 py-5 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest">Cancel</button>
                            <button onClick={handleSaveGame} disabled={isUploading || !newGameTitle} className="flex-1 py-5 bg-primary text-white rounded-2xl text-[10px] font-black shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-[0.2em]">{isUploading ? 'Uploading...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;
