
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Gamepad2, Users, Menu, LogOut, Plus, Search, Sparkles, Crown, X, Save, 
  Image as ImageIcon, Loader2, ShieldCheck, Lock, Copy, MicOff, Link as LinkIcon,
  CheckCircle2, Check, MessageCircle, UserCircle, LayoutGrid, Clock, Trophy, Trash2,
  ThumbsUp, ChevronUp
} from 'lucide-react';
import { Room, User, Message, Game, GameGenre, Platform, ViewState } from '../types';
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
    const [editingGameId, setEditingGameId] = useState<string | null>(null);

    // Form states
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
            });
            return () => unsub();
        }
    }, [code, navigate]);

    // Handlers
    const handleLeave = () => navigate('/');
    const handleDeleteRoom = async () => {
        if (window.confirm("Delete this room forever?")) {
            await deleteRoom(code!);
            navigate('/');
        }
    };

    const handleVote = (id: string) => room && voteForGame(room.code, id, currentUser.id);
    const handleRemove = (id: string) => room && removeGameFromRoom(room.code, id, currentUser.id, !!currentUser.isAdmin);
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

    const handleSendMsg = (txt: string) => room && sendChatMessage(room.code, {
        id: `${Date.now()}`, userId: currentUser.id, userName: currentUser.nickname || currentUser.alias, content: txt, timestamp: Date.now()
    });
    
    const handleAddComment = (gameId: string, text: string) => {
        if (!room) return;
        addCommentToGame(room.code, gameId, {
            id: `${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.nickname || currentUser.alias,
            text,
            timestamp: Date.now()
        });
    };

    if (!room) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={48}/></div>;

    const members = room.members || [];
    let queue = [...(room.gameQueue || [])];

    // Sorting: Alfabético A-Z por defecto en ALL
    if (activeFilter === 'VOTED') queue.sort((a, b) => (b.votedBy?.length || 0) - (a.votedBy?.length || 0));
    else if (activeFilter === 'RECENT') queue.reverse();
    else queue.sort((a, b) => a.title.localeCompare(b.title));

    // Podium Logic (1º centro, 2º izquierda, 3º derecha)
    const sortedRanking = members.map(m => {
        const proposedGames = queue.filter(g => g.proposedBy === m.id);
        const totalVotes = proposedGames.reduce((acc, curr) => acc + (curr.votedBy?.length || 0), 0);
        return { ...m, totalVotes };
    }).filter(m => m.totalVotes > 0).sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

    const podium = [
        sortedRanking[1], // 2nd Place
        sortedRanking[0], // 1st Place
        sortedRanking[2]  // 3rd Place
    ].filter(Boolean);

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans">
            {/* Sidebar Desktop */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface border-r border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/20">
                        <div className="flex items-center gap-2">
                            <Gamepad2 size={24} className="text-primary animate-pulse"/>
                            <span className="font-black text-xl tracking-tighter uppercase italic text-white">TeamLobby</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><X/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        <nav className="space-y-1.5">
                            <button onClick={() => setView('LOBBY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LOBBY' ? 'bg-primary text-white shadow-lg shadow-primary/30 font-black' : 'text-gray-500 hover:bg-gray-800 font-bold'}`}>
                                <LayoutGrid size={20}/> <span>{t('lobby.viewLobby')}</span>
                            </button>
                            <button onClick={() => setView('LIBRARY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LIBRARY' ? 'bg-primary text-white shadow-lg shadow-primary/30 font-black' : 'text-gray-500 hover:bg-gray-800 font-bold'}`}>
                                <Search size={20}/> <span>{t('lobby.viewLibrary')}</span>
                            </button>
                        </nav>

                        {/* Podium Section Mejorado */}
                        {sortedRanking.length > 0 && (
                            <div className="relative pt-8 pb-4">
                                <div className="flex items-end justify-center gap-2">
                                    {podium.map((m, idx) => {
                                        const isFirst = m.id === sortedRanking[0].id;
                                        const isSecond = m.id === (sortedRanking[1]?.id);
                                        const isThird = m.id === (sortedRanking[2]?.id);
                                        
                                        return (
                                            <div key={m.id} className="flex flex-col items-center group">
                                                <div className="relative mb-2">
                                                    <img src={m.avatarUrl} className={`rounded-full border-2 transition-transform group-hover:scale-110 shadow-2xl ${isFirst ? 'w-16 h-16 border-yellow-500' : 'w-12 h-12 border-gray-600'}`}/>
                                                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-surface ${isFirst ? 'bg-yellow-500 text-black' : isSecond ? 'bg-gray-400 text-black' : 'bg-orange-600 text-white'}`}>
                                                        {isFirst ? '1' : isSecond ? '2' : '3'}
                                                    </div>
                                                </div>
                                                <div className={`rounded-t-xl w-16 flex flex-col items-center p-2 border-t border-x border-gray-800 bg-black/40 shadow-inner ${isFirst ? 'h-24 border-yellow-500/30' : isSecond ? 'h-16' : 'h-12'}`}>
                                                    <p className="text-[8px] font-black truncate w-full text-center text-gray-400">{m.nickname || m.alias}</p>
                                                    <p className="text-[9px] font-black text-primary mt-1">{m.totalVotes}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mt-0"></div>
                            </div>
                        )}

                        <div>
                            <div className="px-2 mb-3 text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                <Users size={14}/> {t('lobby.squad')} ({members.length})
                            </div>
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${m.isReady ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/10' : 'bg-black/20 border-gray-800'}`}>
                                        <div className="relative">
                                            <img src={m.avatarUrl} className={`w-8 h-8 rounded-full border-2 ${m.isReady ? 'border-green-500' : 'border-gray-800'}`}/>
                                            {m.isReady && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-surface flex items-center justify-center"><Check size={6} className="text-black" strokeWidth={5}/></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold truncate ${m.isReady ? 'text-white' : 'text-gray-500'}`}>{m.nickname || m.alias}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 bg-black/40 backdrop-blur-md">
                        <button 
                            onClick={handleReady} 
                            className={`w-full py-4 rounded-xl text-xs font-black tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 mb-3 ${
                                currentUser.isReady 
                                ? 'bg-green-500 text-black shadow-[0_8px_20px_rgba(34,197,94,0.3)]' 
                                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                            }`}
                        >
                            {currentUser.isReady ? <><CheckCircle2 size={18}/> {t('lobby.ready')}</> : t('lobby.setReady')}
                        </button>
                        <div className="flex gap-2">
                             {(currentUser.isAdmin || room.hostId === currentUser.id) && (
                                <button onClick={handleDeleteRoom} className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                             )}
                            <button onClick={handleLeave} className="flex-1 py-2 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-2 text-gray-400 hover:text-white"><LogOut size={16}/> Leave</button>
                        </div>
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
                            <button onClick={() => { navigator.clipboard.writeText(room.code); alert(t('lobby.copied')); }} className="flex items-center gap-2 group">
                                <span className="text-[10px] font-mono font-black text-primary/80 group-hover:text-primary transition-colors">#{room.code}</span>
                                <Copy size={10} className="text-gray-600 group-hover:text-white transition-colors"/>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         {!currentUser.isGuest && (
                            <button onClick={() => setIsGameModalOpen(true)} className="bg-primary hover:bg-violet-600 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                <Plus size={18}/> <span className="hidden sm:inline">{t('lobby.addGame')}</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-black/10">
                    {view === 'LOBBY' ? (
                        <div className="space-y-6 max-w-7xl mx-auto">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex p-1 bg-black/40 border border-gray-800 rounded-xl w-fit backdrop-blur shadow-inner">
                                    <button onClick={() => setActiveFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'ALL' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterAll')}</button>
                                    <button onClick={() => setActiveFilter('VOTED')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'VOTED' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterVoted')}</button>
                                    <button onClick={() => setActiveFilter('RECENT')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'RECENT' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterRecent')}</button>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-surface/30 px-3 py-1.5 rounded-full border border-gray-800/50">
                                    <Crown size={14} className="text-yellow-500"/> {t('lobby.votedGames')}
                                </div>
                            </div>

                            {queue.length === 0 ? (
                                <div className="h-80 border-2 border-dashed border-gray-800/50 rounded-[2rem] flex flex-col items-center justify-center text-gray-700 gap-4 bg-surface/10">
                                    <Gamepad2 size={64} className="opacity-10"/>
                                    <p className="font-black text-sm uppercase tracking-[0.2em]">{t('lobby.queueEmpty')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-24">
                                    {queue.map(g => (
                                        <GameCard 
                                            key={g.id}
                                            game={g} 
                                            currentUserId={currentUser.id} 
                                            onVote={handleVote} 
                                            onRemove={handleRemove}
                                            onEdit={openEditModal}
                                            onAddComment={handleAddComment}
                                            isVotingEnabled={!currentUser.isGuest}
                                            canRemove={currentUser.isAdmin || g.proposedBy === currentUser.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-6">
                             <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={20}/>
                                <input type="text" placeholder={t('lobby.searchLib')} className="w-full bg-surface border border-gray-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary transition-all text-sm font-bold shadow-2xl"/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {MOCK_GAMES.map(g => (
                                    <div key={g.id} className="flex flex-col group/item">
                                        <div className="flex-1">
                                            <GameCard 
                                                game={{...g, status: 'approved'}} 
                                                currentUserId={currentUser.id} 
                                                onVote={()=>{}} 
                                                isVotingEnabled={false} 
                                                canRemove={false}
                                                hideInteractions={true}
                                            />
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Botón de Chat Flotante para Móvil */}
            <button 
                onClick={() => setIsChatOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
            >
                <MessageCircle size={24} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-surface animate-bounce"></span>
            </button>

            {/* Modal Add/Edit */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-surface border border-gray-700 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                            <h3 className="text-xl font-black tracking-tight italic uppercase">{editingGameId ? 'Update Entry' : t('lobby.modalTitle')}</h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-800 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">{t('lobby.coverImage')}</label>
                                <div onClick={() => fileInputRef.current?.click()} className="h-36 w-full rounded-2xl border-2 border-dashed border-gray-800 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all group overflow-hidden bg-black/30">
                                    {previewUrl || newGameImageUrl ? (
                                        <img src={previewUrl || newGameImageUrl} className="w-full h-full object-cover"/>
                                    ) : (
                                        <>
                                            <ImageIcon size={32} className="text-gray-700 group-hover:text-primary transition-colors mb-2"/>
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('lobby.uploadImg')}</span>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                                        if (e.target.files?.[0]) {
                                            const file = e.target.files[0];
                                            setSelectedFile(file);
                                            setPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}/>
                                </div>
                                <div className="flex items-center gap-3 bg-black/50 border border-gray-800 rounded-xl px-4 py-3 group focus-within:border-primary transition-colors">
                                    <LinkIcon size={16} className="text-gray-600 group-focus-within:text-primary"/>
                                    <input type="text" value={newGameImageUrl} onChange={e => { setNewGameImageUrl(e.target.value); setPreviewUrl(null); }} placeholder={t('lobby.pasteUrl')} className="bg-transparent border-none outline-none text-xs w-full text-white font-bold"/>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Game Title</label>
                                    <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} placeholder={t('lobby.gameTitle')} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3.5 text-sm font-bold focus:border-primary outline-none transition-all"/>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Web/Store Link</label>
                                    <input type="text" value={newGameLink} onChange={e => setNewGameLink(e.target.value)} placeholder="https://store.steampowered.com/..." className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3.5 text-sm font-bold focus:border-primary outline-none transition-all"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Genre</label>
                                        <select value={newGameGenre} onChange={e => setNewGameGenre(e.target.value as GameGenre)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3.5 text-xs font-bold text-gray-300 outline-none focus:border-primary appearance-none">
                                            {Object.values(GameGenre).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Platforms</label>
                                        <div className="w-full bg-black/30 border border-gray-800/50 rounded-xl px-4 py-3.5 text-xs font-black text-gray-600 italic">AUTO</div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Description</label>
                                    <textarea value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} rows={3} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-primary outline-none transition-all resize-none"></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-900/40 flex gap-4 border-t border-gray-800">
                            <button onClick={closeModal} className="flex-1 py-4 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-800 tracking-widest uppercase transition-colors">{t('common.cancel')}</button>
                            <button onClick={handleSaveGame} disabled={isUploading || !newGameTitle} className="flex-1 py-4 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 tracking-widest uppercase transition-all">
                                {isUploading ? 'SYNCING...' : t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Chat */}
            <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
                <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
            </aside>

            {/* Mobile Chat Drawer */}
            {isChatOpen && (
                <div className="fixed inset-0 z-[120] bg-black/70 lg:hidden backdrop-blur-md flex items-end">
                    <div className="bg-surface w-full h-[85vh] rounded-t-[2.5rem] border-t border-gray-800 flex flex-col overflow-hidden animate-slide-up shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/60">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-black text-sm tracking-widest text-white">{t('chat.title')}</span>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                             <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;
