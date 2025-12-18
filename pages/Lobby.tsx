import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Gamepad2, Users, Menu, LogOut, Plus, Search, Sparkles, Crown, X, Save, 
  Image as ImageIcon, Loader2, ShieldCheck, Lock, Copy, MicOff, Link as LinkIcon,
  CheckCircle2, Check, MessageCircle, UserCircle, LayoutGrid, Clock
} from 'lucide-react';
import { Room, User, Message, Game, GameGenre, Platform, ViewState } from '../types';
import { 
  subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, 
  toggleUserReadyState, removeGameFromRoom, addCommentToGame 
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
    const [isChatOpen, setIsChatOpen] = useState(false); // Para móviles
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);

    // Form states
    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameGenre, setNewGameGenre] = useState<GameGenre>(GameGenre.FPS);
    const [newGameLink, setNewGameLink] = useState('');
    const [newGameImageUrl, setNewGameImageUrl] = useState('');
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleAddGame = async () => {
        if (!newGameTitle || !room) return;
        setIsUploading(true);
        try {
            let finalImg = newGameImageUrl;
            if (selectedFile) finalImg = await uploadGameImage(selectedFile);
            const game: Game = {
                id: `custom-${Date.now()}`,
                title: newGameTitle,
                description: 'User recommended game.',
                imageUrl: finalImg,
                genre: newGameGenre,
                platforms: [Platform.PC],
                votedBy: [currentUser.id],
                tags: ['Custom'],
                link: newGameLink,
                status: 'pending'
            };
            await addGameToRoom(room.code, game, currentUser);
            setIsGameModalOpen(false);
            setNewGameTitle(''); setNewGameImageUrl(''); setPreviewUrl(null);
        } catch(e) { alert(t('common.error')); } finally { setIsUploading(false); }
    };

    if (!room) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={48}/></div>;

    const members = room.members || [];
    let queue = [...(room.gameQueue || [])];

    // Aplicar Filtros
    if (activeFilter === 'VOTED') queue.sort((a, b) => (b.votedBy?.length || 0) - (a.votedBy?.length || 0));
    if (activeFilter === 'RECENT') queue.reverse();

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans">
            {/* Sidebar Desktop */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface border-r border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20"><Gamepad2 size={20}/></div>
                            <span className="font-black text-xl tracking-tighter">TeamLobby</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden"><X/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <nav className="space-y-1">
                            <button onClick={() => setView('LOBBY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LOBBY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <LayoutGrid size={20}/> <span className="font-bold">{t('lobby.viewLobby')}</span>
                            </button>
                            <button onClick={() => setView('LIBRARY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LIBRARY' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-800'}`}>
                                <Search size={20}/> <span className="font-bold">{t('lobby.viewLibrary')}</span>
                            </button>
                        </nav>

                        <div>
                            <div className="px-2 mb-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('lobby.squad')} ({members.length})</div>
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${m.isReady ? 'bg-green-500/10 border-green-500/40 ring-1 ring-green-500/20' : 'bg-black/20 border-gray-800'}`}>
                                        <div className="relative">
                                            <img src={m.avatarUrl} className={`w-9 h-9 rounded-full border-2 ${m.isReady ? 'border-green-500' : 'border-gray-700'}`}/>
                                            {m.isReady && (
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-surface animate-bounce">
                                                    <Check size={8} className="text-black" strokeWidth={5} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${m.isReady ? 'text-white' : 'text-gray-400'}`}>{m.nickname || m.alias}</p>
                                            <p className={`text-[10px] font-black uppercase ${m.isReady ? 'text-green-500' : 'text-gray-600'}`}>
                                                {m.isReady ? t('lobby.ready') : t('lobby.notReady')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 bg-black/40 backdrop-blur">
                        <button 
                            onClick={handleReady} 
                            className={`w-full py-4 rounded-xl text-xs font-black tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 mb-3 ${
                                currentUser.isReady 
                                ? 'bg-green-500 text-black shadow-[0_8px_20px_rgba(34,197,94,0.4)]' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {currentUser.isReady ? <><CheckCircle2 size={18}/> {t('lobby.ready')}</> : t('lobby.setReady')}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => navigate('/profile')} className="flex-1 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><UserCircle size={16}/> {t('profile.nickname')}</button>
                            <button onClick={handleLeave} className="px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"><LogOut size={18}/></button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-gray-800 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"><Menu/></button>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">{room.name}</h2>
                            <button onClick={() => { navigator.clipboard.writeText(room.code); alert(t('lobby.copied')); }} className="flex items-center gap-2 mt-0.5 group">
                                <span className="text-[10px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">#{room.code}</span>
                                <Copy size={12} className="text-gray-600 group-hover:text-white transition-colors"/>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsChatOpen(!isChatOpen)} className="lg:hidden p-3 bg-gray-900 border border-gray-800 rounded-xl relative">
                            <MessageCircle size={20}/>
                            <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-4 border-surface"></span>
                        </button>
                        {!currentUser.isGuest && (
                            <button onClick={() => setIsGameModalOpen(true)} className="bg-primary hover:bg-violet-600 text-white p-3 md:px-5 md:py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                <Plus size={20}/> <span className="hidden md:inline">{t('lobby.addGame')}</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                    {view === 'LOBBY' ? (
                        <div className="space-y-8 max-w-7xl mx-auto">
                            {/* Filtros */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex p-1 bg-black/40 border border-gray-800 rounded-xl w-fit">
                                    <button onClick={() => setActiveFilter('ALL')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeFilter === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterAll')}</button>
                                    <button onClick={() => setActiveFilter('VOTED')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeFilter === 'VOTED' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterVoted')}</button>
                                    <button onClick={() => setActiveFilter('RECENT')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeFilter === 'RECENT' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('lobby.filterRecent')}</button>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                    <Crown size={14} className="text-yellow-500"/> {t('lobby.votedGames')}
                                </div>
                            </div>

                            {queue.length === 0 ? (
                                <div className="h-64 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-600 gap-4">
                                    <Gamepad2 size={64} className="opacity-20"/>
                                    <p className="font-bold">{t('lobby.queueEmpty')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                                    {queue.map(g => (
                                        <div key={g.id} className="h-[440px]">
                                            <GameCard 
                                                game={g} 
                                                currentUserId={currentUser.id} 
                                                onVote={handleVote} 
                                                onRemove={handleRemove}
                                                onAddComment={handleAddComment}
                                                isVotingEnabled={!currentUser.isGuest}
                                                canRemove={currentUser.isAdmin || g.proposedBy === currentUser.id}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-8">
                             <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                                <input type="text" placeholder={t('lobby.searchLib')} className="w-full bg-surface border border-gray-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner"/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {MOCK_GAMES.map(g => (
                                    <div key={g.id} className="h-[400px] flex flex-col opacity-80 hover:opacity-100 transition-opacity">
                                        <GameCard game={{...g, status: 'approved'}} currentUserId={currentUser.id} onVote={()=>{}} isVotingEnabled={false} canRemove={false}/>
                                        <button onClick={() => addGameToRoom(room.code, g, currentUser)} className="mt-3 w-full py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-black hover:bg-primary hover:text-white transition-all uppercase tracking-widest">{t('lobby.addToQueue')}</button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Desktop Chat Sidebar */}
            <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
                <Chat messages={room.chatHistory} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
            </aside>

            {/* Mobile Chat Drawer */}
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

            {/* Add Game Modal */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="bg-surface border border-gray-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-black">{t('lobby.modalTitle')}</h3>
                            <button onClick={() => setIsGameModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors"><X/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('lobby.coverImage')}</label>
                                <div onClick={() => fileInputRef.current?.click()} className="h-40 w-full rounded-2xl border-2 border-dashed border-gray-800 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all group">
                                    {previewUrl || newGameImageUrl ? (
                                        <img src={previewUrl || newGameImageUrl} className="w-full h-full object-cover rounded-2xl"/>
                                    ) : (
                                        <>
                                            <ImageIcon size={32} className="text-gray-700 group-hover:text-primary transition-colors mb-2"/>
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{t('lobby.uploadImg')}</span>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                                </div>
                                <div className="flex items-center gap-2 bg-black/40 border border-gray-800 rounded-xl px-4 py-2.5">
                                    <LinkIcon size={16} className="text-gray-600"/>
                                    <input type="text" value={newGameImageUrl} onChange={e => { setNewGameImageUrl(e.target.value); setPreviewUrl(null); }} placeholder={t('lobby.pasteUrl')} className="bg-transparent border-none outline-none text-xs w-full text-white font-bold"/>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} placeholder={t('lobby.gameTitle')} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"/>
                                <select value={newGameGenre} onChange={e => setNewGameGenre(e.target.value as GameGenre)} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-300">
                                    {Object.values(GameGenre).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-900/50 flex gap-3">
                            <button onClick={() => setIsGameModalOpen(false)} className="flex-1 py-4 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-800">{t('common.cancel')}</button>
                            <button onClick={handleAddGame} disabled={isUploading || !newGameTitle} className="flex-1 py-4 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95">
                                {isUploading ? t('lobby.uploading') : t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;