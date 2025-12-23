
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Gamepad2, Menu, Plus, Search, X, 
  Loader2, Lock, MessageCircle, LayoutGrid, Trophy, Trash2,
  ExternalLink, Edit3, Send, ThumbsUp, Monitor, Tv, Box, CheckCircle2, Info, ChevronDown, ChevronUp,
  Clock, Dices, Vote, Sparkles, RefreshCcw, UserPlus, PlayCircle, Fingerprint
} from 'lucide-react';
import { Room, User, Game, GameGenre, Platform, ViewState } from '../types';
import { 
  subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, 
  toggleUserReadyState, removeGameFromRoom, addCommentToGame, updateGameInRoom, leaveRoomCleanly, cleanupRoomMembers,
  startReadyActivity, submitReadySuggestion, submitReadyVote, resolveReadyActivity, resetReadyActivity, setReadyStatus
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

    const handleAdvancePhase = () => {
        if (!room || !room.readySession) return;
        const suggestionsCount = Object.keys(room.readySession.suggestions || {}).length;
        if (suggestionsCount < 2) {
            showAlert({ message: "Se requieren al menos 2 juegos propuestos por la escuadra.", type: 'info' });
            return;
        }

        if (room.readySession.type === 'roulette') {
            setIsSpinning(true);
            setTimeout(() => {
                resolveReadyActivity(room.code);
                setIsSpinning(false);
            }, 3000);
        } else {
            setReadyStatus(room.code, 'results'); // En votación avanzamos directamente a resultados para contar
            resolveReadyActivity(room.code);
        }
    };

    const handleSaveGame = async () => {
        if (!newGameTitle || !room) return;
        setIsUploading(true);
        try {
            const gameData: Partial<Game> = { title: newGameTitle, description: newGameDesc || 'User recommended game.', imageUrl: newGameImageUrl, genre: newGameGenre, link: newGameLink };
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
    const suggestions = room.readySession?.suggestions || {};
    const votes = room.readySession?.votes || {};

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
                                {readyActivityActive && <div className="w-2 h-2 rounded-full bg-secondary animate-ping shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
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
                        /* READY VIEW - MEJORADO */
                        <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                             {!room.readySession || room.readySession.status === 'idle' ? (
                                <div className="text-center space-y-10">
                                    <div className="space-y-4">
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mx-auto">
                                            <Sparkles size={48} className="text-primary"/>
                                        </div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">COMMAND CENTER</h3>
                                        <p className="text-gray-500 font-bold max-w-md mx-auto text-sm leading-relaxed italic">Inicia una sesión para decidir qué jugar con tu escuadra.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <button onClick={() => handleStartActivity('roulette')} className="group p-8 bg-surface border-2 border-gray-800 rounded-[2.5rem] hover:border-primary transition-all text-left space-y-4 shadow-xl">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Dices size={28}/></div>
                                            <div>
                                                <h4 className="font-black text-lg text-white uppercase italic tracking-tighter">Ruleta</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Azar entre las sugerencias.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => handleStartActivity('voting')} className="group p-8 bg-surface border-2 border-gray-800 rounded-[2.5rem] hover:border-secondary transition-all text-left space-y-4 shadow-xl">
                                            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform"><Vote size={28}/></div>
                                            <div>
                                                <h4 className="font-black text-lg text-white uppercase italic tracking-tighter">Votación</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Democracia pura de escuadra.</p>
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
                                            <div>
                                                <h3 className="text-xl font-black italic uppercase text-white">{room.readySession.type === 'roulette' ? 'Ruleta del Destino' : 'Voto de Escuadra'}</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado: {room.readySession.status}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => resetReadyActivity(room.code)} className="p-3 hover:bg-gray-800 rounded-xl transition-all text-gray-600 hover:text-white"><RefreshCcw size={20}/></button>
                                    </div>

                                    {room.readySession.status === 'collecting' && (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                                        <Plus size={14}/> Propón un juego
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {room.gameQueue.length === 0 ? (
                                                            <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-700 font-black text-[10px] uppercase">Agrega juegos a la cola primero</div>
                                                        ) : (
                                                            room.gameQueue.map(g => {
                                                                const isSuggested = suggestions?.[currentUser.id]?.gameId === g.id;
                                                                return (
                                                                    <button 
                                                                        key={g.id} 
                                                                        onClick={() => handleReadySuggestion(g)}
                                                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${isSuggested ? 'bg-primary/20 border-primary text-white' : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                                                    >
                                                                        <span className="text-xs font-black truncate">{g.title}</span>
                                                                        {isSuggested && <CheckCircle2 size={16} className="text-primary" />}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                                        <UserPlus size={14}/> Escuadra Participante ({Object.keys(suggestions).length})
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {Object.values(suggestions).length === 0 ? (
                                                            <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-700 font-black text-[10px] uppercase italic">Esperando propuestas...</div>
                                                        ) : (
                                                            Object.values(suggestions).map((s: any) => (
                                                                <div key={s.userName + s.gameId} className="p-4 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-between animate-in slide-in-from-right-4 duration-300">
                                                                    <span className="text-[10px] font-black text-white uppercase italic">{s.userName}</span>
                                                                    <span className="text-[9px] font-black text-gray-500 tracking-widest">{s.gameTitle}</span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {Object.keys(suggestions).length >= 2 ? (
                                                <button 
                                                    onClick={handleAdvancePhase}
                                                    disabled={isSpinning}
                                                    className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.4em] text-xs rounded-[2rem] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
                                                >
                                                    {isSpinning ? <Loader2 className="animate-spin" /> : <PlayCircle size={20}/>}
                                                    {isSpinning ? 'SPINNING...' : room.readySession.type === 'roulette' ? 'LANZAR RULETA' : 'INICIAR VOTACIÓN'}
                                                </button>
                                            ) : (
                                                <div className="p-6 bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl text-center">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Esperando al menos 2 propuestas para continuar...</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {room.readySession.status === 'results' && (
                                        <div className="flex flex-col items-center py-12 space-y-10 animate-in zoom-in-95 duration-700">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-primary/30 blur-[100px] rounded-full animate-pulse" />
                                                <div className="relative bg-gray-900 border-4 border-primary p-12 rounded-[4rem] text-center space-y-6">
                                                    <Trophy size={80} className="text-yellow-500 mx-auto mb-4"/>
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">RESULTADO FINAL</p>
                                                        {Array.isArray(room.readySession.winner) ? (
                                                            <div className="flex flex-wrap justify-center gap-2">
                                                                {room.readySession.winner.map(winId => (
                                                                    <span key={winId} className="px-5 py-2 bg-primary/20 border border-primary/40 rounded-xl text-xs font-black text-white uppercase italic">
                                                                        {room.gameQueue.find(g => g.id === winId)?.title || "Juego"}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <h4 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">
                                                                {room.gameQueue.find(g => g.id === room.readySession?.winner)?.title || 'Juego Seleccionado'}
                                                            </h4>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => resetReadyActivity(room.code)} className="px-12 py-5 bg-gray-800 text-gray-400 font-black rounded-2xl transition-all uppercase text-[10px] tracking-[0.3em]">Reiniciar Actividad</button>
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
                             <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="font-black text-[11px] tracking-[0.3em] text-white uppercase italic">SQUAD_CHANNEL</span>
                                </div>
                                <button onClick={() => setIsChatOpen(false)} className="p-2.5 hover:bg-gray-800 rounded-xl transition-all"><X size={20}/></button>
                            </div>
                            <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
                        </div>
                    )}
                    <button 
                        onClick={() => setIsChatOpen(!isChatOpen)} 
                        className={`group w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 border-4 border-background ${isChatOpen ? 'bg-gray-900 text-white' : 'bg-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]'}`}
                    >
                        {isChatOpen ? <X size={28} className="animate-in spin-in-90" /> : <MessageCircle size={28} className="animate-in zoom-in-50" />}
                    </button>
                </div>
            </main>

            {/* Modal: Game Details */}
            {selectedGame && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-surface border border-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
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

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="p-8 md:p-10">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Info size={14}/> Game Summary
                                    </h4>
                                    <p className="text-gray-300 text-sm leading-relaxed italic bg-black/20 p-6 rounded-2xl border border-gray-800/50">
                                        "{selectedGame.description || 'No description provided.'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
                             {selectedGame.link && (
                                <a href={selectedGame.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-8 py-4 bg-surface border border-gray-800 text-white rounded-2xl hover:bg-white hover:text-black transition-all shadow-xl font-black uppercase text-[10px] tracking-widest">
                                    <ExternalLink size={18}/> Web Store
                                </a>
                            )}
                            <button 
                                onClick={() => handleVote(selectedGame.id)} 
                                className={`w-full md:w-auto min-w-[260px] py-4 px-10 rounded-2xl font-black text-xs tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 ${
                                    selectedGame.votedBy?.includes(currentUser.id) 
                                    ? 'bg-primary text-white shadow-primary/30' 
                                    : 'bg-white text-black hover:bg-gray-200'
                                }`}
                            >
                                <ThumbsUp size={20} className={selectedGame.votedBy?.includes(currentUser.id) ? 'fill-current' : ''}/>
                                {selectedGame.votedBy?.includes(currentUser.id) ? 'VOTED' : 'CAST VOTE'} 
                                <span className="ml-2 bg-black/10 px-3 py-1 rounded-lg text-[10px]">{selectedGame.votedBy?.length || 0}</span>
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
                                <input type="text" value={newGameImageUrl} onChange={e => setNewGameImageUrl(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-primary shadow-inner" placeholder="URL cover..."/>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-900/60 flex gap-4 border-t border-gray-800">
                            <button onClick={closeModal} className="flex-1 py-5 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-gray-800 transition-all">Cancel</button>
                            <button onClick={handleSaveGame} disabled={isUploading || !newGameTitle} className="flex-1 py-5 bg-primary text-white rounded-2xl text-[10px] font-black shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-[0.2em]">{isUploading ? 'Uploading...' : 'Save Game'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;
