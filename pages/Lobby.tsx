import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Gamepad2, Users, Menu, LogOut, Plus, Search, Sparkles, Crown, X, Save, 
  Image as ImageIcon, Loader2, ShieldCheck, Lock, Copy, MicOff, Link as LinkIcon,
  CheckCircle2, Check, MessageCircle, UserCircle, LayoutGrid, Clock, Trophy
} from 'lucide-react';
import { Room, User, Message, Game, GameGenre, Platform, ViewState } from '../types';
import { 
  subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, 
  toggleUserReadyState, removeGameFromRoom, addCommentToGame, updateGameInRoom 
} from '../services/roomService';
import { getGameRecommendations } from '../services/geminiService';
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

    // Ranking de usuarios (quién ha propuesto los juegos con más votos)
    const userRanking = members.map(m => {
        const proposedGames = queue.filter(g => g.proposedBy === m.id);
        const totalVotes = proposedGames.reduce((acc, curr) => acc + (curr.votedBy?.length || 0), 0);
        return { ...m, totalVotes };
    }).sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

    if (activeFilter === 'VOTED') queue.sort((a, b) => (b.votedBy?.length || 0) - (a.votedBy?.length || 0));
    if (activeFilter === 'RECENT') queue.reverse();

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface border-r border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Gamepad2 size={24} className="text-primary"/>
                            <span className="font-black text-xl tracking-tighter uppercase italic">TeamLobby</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><X/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        <nav className="space-y-1">
                            <button onClick={() => setView('LOBBY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LOBBY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <LayoutGrid size={20}/> <span className="font-bold">{t('lobby.viewLobby')}</span>
                            </button>
                            <button onClick={() => setView('LIBRARY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LIBRARY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <Search size={20}/> <span className="font-bold">{t('lobby.viewLibrary')}</span>
                            </button>
                        </nav>

                        {/* Ranking Usuarios */}
                        <div className="bg-black/20 border border-gray-800/50 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy size={16} className="text-yellow-500"/>
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Top Contributors</span>
                            </div>
                            <div className="space-y-3">
                                {userRanking.map((m, idx) => (
                                    <div key={m.id} className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={m.avatarUrl} className="w-8 h-8 rounded-full border border-gray-800"/>
                                            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : 'bg-orange-600 text-white'}`}>{idx+1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold truncate text-gray-300">{m.nickname || m.alias}</p>
                                            <p className="text-[9px] font-bold text-gray-600">{m.totalVotes} votes</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="px-2 mb-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('lobby.squad')} ({members.length})</div>
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${m.isReady ? 'bg-green-500/10 border-green-500/30' : 'bg-black/20 border-gray-800'}`}>
                                        <div className="relative">
                                            <img src={m.avatarUrl} className={`w-8 h-8 rounded-full border-2 ${m.isReady ? 'border-green-500' : 'border-gray-800'}`}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold truncate ${m.isReady ? 'text-white' : 'text-gray-400'}`}>{m.nickname || m.alias}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 bg-black/40">
                        <button 
                            onClick={handleReady} 
                            className={`w-full py-4 rounded-xl text-xs font-black tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 mb-3 ${
                                currentUser.isReady 
                                ? 'bg-green-500 text-black shadow-[0_8px_20px_rgba(34,197,94,0.3)]' 
                                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                            }`}
                        >
                            {currentUser.isReady ? <><CheckCircle2 size={18}/> {t('lobby.ready')}</> : t('lobby.setReady')}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => navigate('/profile')} className="flex-1 py-2 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-2"><UserCircle size={14}/> Profile</button>
                            <button onClick={handleLeave} className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"><LogOut size={16}/></button>
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
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">{room.name} {room.isPrivate && <Lock size={14} className="text-gray-600"/>}</h2>
                            <button onClick={() => { navigator.clipboard.writeText(room.code); alert(t('lobby.copied')); }} className="flex items-center gap-2 group">
                                <span className="text-[10px] font-mono font-black text-primary">#{room.code}</span>
                                <Copy size={10} className="text-gray-600 group-hover:text-white transition-colors"/>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!currentUser.isGuest && (
                            <button onClick={() => setIsGameModalOpen(true)} className="bg-primary hover:bg-violet-600 text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                <Plus size={16}/> <span className="hidden sm:inline">{t('lobby.addGame')}</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {view === 'LOBBY' ? (
                        <div className="space-y-6 max-w-7xl mx-auto">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex p-1 bg-black/40 border border-gray-800 rounded-xl w-fit">
                                    <button onClick={() => setActiveFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterAll')}</button>
                                    <button onClick={() => setActiveFilter('VOTED')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'VOTED' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterVoted')}</button>
                                    <button onClick={() => setActiveFilter('RECENT')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'RECENT' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterRecent')}</button>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    <Crown size={14} className="text-yellow-500"/> {t('lobby.votedGames')}
                                </div>
                            </div>

                            {queue.length === 0 ? (
                                <div className="h-64 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-700 gap-4">
                                    <Gamepad2 size={48} className="opacity-20"/>
                                    <p className="font-black text-sm uppercase tracking-widest">{t('lobby.queueEmpty')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-12">
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
                             <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                <input type="text" placeholder={t('lobby.searchLib')} className="w-full bg-surface border border-gray-800 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary transition-all text-sm font-bold"/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {MOCK_GAMES.map(g => (
                                    <div key={g.id} className="flex flex-col opacity-90 hover:opacity-100 transition-all">
                                        <GameCard game={{...g, status: 'approved'}} currentUserId={currentUser.id} onVote={()=>{}} isVotingEnabled={false} canRemove={false}/>
                                        <button onClick={() => addGameToRoom(room.code, g, currentUser)} className="mt-2 w-full py-2 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-widest">{t('lobby.addToQueue')}</button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Add/Edit */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <div className="bg-surface border border-gray-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-black">{editingGameId ? 'EDIT PROPOSAL' : t('lobby.modalTitle')}</h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-800 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('lobby.coverImage')}</label>
                                <div onClick={() => fileInputRef.current?.click()} className="h-32 w-full rounded-2xl border-2 border-dashed border-gray-800 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all group overflow-hidden">
                                    {previewUrl || newGameImageUrl ? (
                                        <img src={previewUrl || newGameImageUrl} className="w-full h-full object-cover"/>
                                    ) : (
                                        <>
                                            <ImageIcon size={28} className="text-gray-700 group-hover:text-primary transition-colors mb-1"/>
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">{t('lobby.uploadImg')}</span>
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
                                <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-xl px-3 py-2">
                                    <LinkIcon size={14} className="text-gray-600"/>
                                    <input type="text" value={newGameImageUrl} onChange={e => { setNewGameImageUrl(e.target.value); setPreviewUrl(null); }} placeholder={t('lobby.pasteUrl')} className="bg-transparent border-none outline-none text-[11px] w-full text-white font-bold"/>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Title</label>
                                    <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} placeholder={t('lobby.gameTitle')} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none transition-all"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Game Website / Store Link</label>
                                    <input type="text" value={newGameLink} onChange={e => setNewGameLink(e.target.value)} placeholder="https://store.steampowered.com/..." className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none transition-all"/>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Genre</label>
                                        <select value={newGameGenre} onChange={e => setNewGameGenre(e.target.value as GameGenre)} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-[11px] font-bold text-gray-300 outline-none focus:border-primary">
                                            {Object.values(GameGenre).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Platforms</label>
                                        <div className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-[11px] font-bold text-gray-500 italic">Auto-detected</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Short Description</label>
                                    <textarea value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} rows={2} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none transition-all resize-none"></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 bg-gray-900/30 flex gap-2">
                            <button onClick={closeModal} className="flex-1 py-3 rounded-xl text-[10px] font-black text-gray-500 hover:bg-gray-800 tracking-widest uppercase">{t('common.cancel')}</button>
                            <button onClick={handleSaveGame} disabled={isUploading || !newGameTitle} className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 active:scale-95 tracking-widest uppercase">
                                {isUploading ? 'SAVING...' : t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
                <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
            </aside>

            {isChatOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 lg:hidden backdrop-blur-sm flex items-end">
                    <div className="bg-surface w-full h-[80vh] rounded-t-3xl border-t border-gray-800 flex flex-col overflow-hidden animate-slide-up">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                            <span className="font-black text-sm">{t('chat.title')}</span>
                            <button onClick={() => setIsChatOpen(false)} className="p-2"><X/></button>
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