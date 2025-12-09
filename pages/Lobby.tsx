import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Gamepad2, Users, Menu, LogOut, Plus, Search, Sparkles, Crown, X, Save, 
  Image as ImageIcon, Loader2, ShieldCheck, Lock, Copy, MicOff, Link as LinkIcon
} from 'lucide-react';
import { Room, User, Message, Game, GameGenre, Platform, ViewState } from '../types';
import { subscribeToRoom, addGameToRoom, voteForGame, sendChatMessage, toggleUserReadyState, removeGameFromRoom } from '../services/roomService';
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
    const [view, setView] = useState<ViewState>('LOBBY');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState<'MENU' | 'CHAT'>('MENU');
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    
    // Game Modal State
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);
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
            const unsubscribe = subscribeToRoom(code, (updatedRoom) => {
                if (!updatedRoom) {
                    alert(t('lobby.roomNotExist'));
                    navigate('/');
                    return;
                }
                setRoom(updatedRoom);
            });
            return () => unsubscribe();
        }
    }, [code, navigate, t]);

    // Handlers
    const handleLeave = () => navigate('/');
    const copyCode = () => { navigator.clipboard.writeText(code || ''); alert(t('lobby.copied')); };
    const handleVote = (id: string) => room && voteForGame(room.code, id, currentUser.id);
    const handleRemove = (id: string) => room && removeGameFromRoom(room.code, id, currentUser.id, !!currentUser.isAdmin);
    const handleSendMsg = (txt: string) => room && !currentUser.isMuted && sendChatMessage(room.code, {
        id: `${Date.now()}`, userId: currentUser.id, userName: currentUser.alias, content: txt, timestamp: Date.now()
    });
    const handleReady = () => room && toggleUserReadyState(room.code, currentUser.id);

    const handleRecommendations = async () => {
        if (!room || currentUser.isGuest) return;
        setIsLoadingRecs(true);
        try {
            const recs = await getGameRecommendations(room.members, room.gameQueue);
            const existing = room.gameQueue.map(g => g.title.toLowerCase());
            for (const g of recs) {
                if (!existing.includes(g.title.toLowerCase())) await addGameToRoom(room.code, g, currentUser);
            }
        } finally { setIsLoadingRecs(false); }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setNewGameImageUrl(''); // Clear text input if file selected
        }
    };

    const handleAddGame = async () => {
        if (!newGameTitle || !room) return;
        setIsUploading(true);
        let finalImg = newGameImageUrl;

        try {
            if (selectedFile) {
                finalImg = await uploadGameImage(selectedFile);
            }

            const game: Game = {
                id: `custom-${Date.now()}`,
                title: newGameTitle,
                description: 'Custom added game.',
                imageUrl: finalImg,
                genre: newGameGenre,
                platforms: [Platform.PC],
                votedBy: [currentUser.id],
                tags: ['Custom'],
                link: newGameLink,
                proposedBy: currentUser.id
            };
            await addGameToRoom(room.code, game, currentUser);
            setIsGameModalOpen(false);
            setNewGameTitle(''); setNewGameLink(''); setNewGameImageUrl(''); setPreviewUrl(null); setSelectedFile(null);
            setView('LOBBY');
        } catch(e) { alert(t('common.error')); } finally { setIsUploading(false); }
    };

    const handleAddLibrary = async (game: Game) => {
        if (!room) return;
        if (room.gameQueue.find(g => g.title === game.title)) return alert("Already in queue");
        await addGameToRoom(room.code, { ...game, id: `lib-${Date.now()}`, votedBy: [currentUser.id], proposedBy: currentUser.id }, currentUser);
        setView('LOBBY');
    };

    if (!room) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

    const members = room.members || [];
    const queue = room.gameQueue || [];
    const chat = room.chatHistory || [];

    return (
        <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans selection:bg-primary/30">
             {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}
             
             {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[85vw] md:w-80 lg:w-72 bg-surface border-r border-gray-800 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center"><Gamepad2 size={18}/></div>
                        <span className="font-bold text-lg">TeamLobby</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden"><X/></button>
                </div>

                <div className="flex lg:hidden border-b border-gray-800">
                    <button onClick={() => setMobileTab('MENU')} className={`flex-1 py-3 text-sm font-bold ${mobileTab === 'MENU' ? 'border-b-2 border-primary' : 'text-gray-500'}`}>{t('lobby.menu')}</button>
                    <button onClick={() => setMobileTab('CHAT')} className={`flex-1 py-3 text-sm font-bold ${mobileTab === 'CHAT' ? 'border-b-2 border-primary' : 'text-gray-500'}`}>{t('lobby.chat')}</button>
                </div>

                <div className="flex-1 overflow-y-auto relative">
                    <div className={`flex-col h-full ${mobileTab === 'MENU' || window.innerWidth >= 1024 ? 'flex' : 'hidden'}`}>
                         <div className="flex-1 py-6 px-4 space-y-2">
                            <button onClick={() => { setView('LOBBY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${view === 'LOBBY' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                                <Users size={20}/> <span className="font-semibold">{t('lobby.viewLobby')}</span>
                            </button>
                            <button onClick={() => { setView('LIBRARY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${view === 'LIBRARY' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                                <Gamepad2 size={20}/> <span className="font-semibold">{t('lobby.viewLibrary')}</span>
                            </button>
                            <div className="mt-8 px-2 mb-2 text-xs font-bold text-gray-500 uppercase">{t('lobby.squad')} ({members.length})</div>
                            {members.map(m => (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-2 bg-gray-900/30 border border-gray-800/50 rounded-lg">
                                    <div className="relative">
                                        <img src={m.avatarUrl} className="w-8 h-8 rounded-full"/>
                                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-surface ${m.isReady ? 'bg-green-500' : 'bg-gray-500'}`}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate flex gap-1">{m.alias} {m.isAdmin && <ShieldCheck size={12} className="text-yellow-500"/>}</p>
                                    </div>
                                    {m.isMuted && <MicOff size={12} className="text-red-500"/>}
                                </div>
                            ))}
                         </div>
                         <div className="p-4 border-t border-gray-800 bg-gray-900/80">
                            <div className="flex items-center gap-3 mb-4 p-2 bg-black/40 rounded-lg">
                                <img src={currentUser.avatarUrl} className="w-10 h-10 rounded-full"/>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{currentUser.alias}</p>
                                    <p className="text-xs text-gray-500">{currentUser.isReady ? t('lobby.ready') : t('lobby.notReady')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleReady} className={`py-2 rounded-lg text-xs font-bold ${currentUser.isReady ? 'bg-green-500' : 'bg-gray-800'}`}>{currentUser.isReady ? t('lobby.ready') : t('lobby.setReady')}</button>
                                <button onClick={handleLeave} className="py-2 rounded-lg bg-gray-800 hover:bg-danger/20 text-gray-400 hover:text-danger"><LogOut size={16} className="mx-auto"/></button>
                            </div>
                         </div>
                    </div>
                    <div className={`h-full ${mobileTab === 'CHAT' && window.innerWidth < 1024 ? 'block' : 'hidden'}`}>
                        <Chat messages={chat} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 bg-background">
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-surface/50 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden"><Menu/></button>
                        <div>
                            <h2 className="text-lg font-bold leading-none">{room.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-2 rounded border border-gray-800">CODE: <span className="text-accent">{room.code}</span></span>
                                <button onClick={copyCode}><Copy size={12}/></button>
                                {room.isPrivate && <Lock size={12} className="text-gray-500"/>}
                            </div>
                        </div>
                    </div>
                    {!currentUser.isGuest && <button onClick={() => setIsGameModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-violet-600 rounded-lg text-sm font-bold"><Plus size={16}/> <span className="hidden md:inline">{t('lobby.addGame')}</span></button>}
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    {view === 'LOBBY' ? (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Crown size={16} className="text-yellow-500"/> {t('lobby.votedGames')}</h3>
                                {!currentUser.isGuest && <button onClick={handleRecommendations} disabled={isLoadingRecs} className="text-xs font-bold text-accent flex items-center gap-1">{isLoadingRecs ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} {t('lobby.aiSuggest')}</button>}
                            </div>
                            {queue.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center gap-4">
                                    <Gamepad2 size={48}/> <p>{t('lobby.queueEmpty')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {queue.map(g => (
                                        <div key={g.id} className="h-64 md:h-80">
                                            <GameCard game={g} currentUserId={currentUser.id} onVote={handleVote} onRemove={handleRemove} isVotingEnabled={!currentUser.isGuest} canRemove={currentUser.isAdmin || g.proposedBy === currentUser.id || !g.proposedBy} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg border border-gray-800 max-w-md">
                                <Search size={18} className="text-gray-500 ml-2"/><input type="text" placeholder={t('lobby.searchLib')} className="bg-transparent border-none outline-none text-sm w-full text-gray-300"/>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {MOCK_GAMES.map(g => (
                                    <div key={g.id} className="h-64 opacity-75 hover:opacity-100">
                                        <GameCard game={g} currentUserId={currentUser.id} onVote={()=>{}} isVotingEnabled={false} canRemove={false}/>
                                        {!currentUser.isGuest && <button onClick={() => handleAddLibrary(g)} className="w-full mt-2 py-2 bg-gray-800 hover:bg-primary text-xs font-bold rounded border border-gray-700">{t('lobby.addToQueue')}</button>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <aside className="hidden lg:block w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
                <Chat messages={chat} currentUser={currentUser} onSendMessage={handleSendMsg} onReceiveMessage={() => {}} />
            </aside>

            {/* Add Game Modal with URL Input */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex justify-between bg-gray-900/50">
                            <h3 className="font-bold flex gap-2"><Plus size={18} className="text-primary"/> {t('lobby.modalTitle')}</h3>
                            <button onClick={() => setIsGameModalOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">{t('lobby.coverImage')}</label>
                                <div className="space-y-2">
                                     <div onClick={() => fileInputRef.current?.click()} className="relative h-32 w-full rounded-xl border-2 border-dashed border-gray-700 hover:border-primary hover:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                                        {(previewUrl || newGameImageUrl) ? (
                                            <img src={previewUrl || newGameImageUrl} className="w-full h-full object-cover"/>
                                        ) : (
                                            <><ImageIcon className="text-gray-600 mb-2"/><span className="text-xs text-gray-500">{t('lobby.uploadImg')}</span></>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <LinkIcon size={14} className="text-gray-500"/>
                                         <input type="text" value={newGameImageUrl} onChange={e => { setNewGameImageUrl(e.target.value); setPreviewUrl(null); }} placeholder={t('lobby.pasteUrl')} className="flex-1 bg-black/50 border border-gray-700 rounded px-2 py-1 text-xs"/>
                                     </div>
                                </div>
                            </div>
                            <input type="text" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} placeholder={t('lobby.gameTitle')} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
                            <input type="text" value={newGameLink} onChange={e => setNewGameLink(e.target.value)} placeholder={t('lobby.storeUrl')} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"/>
                            <select value={newGameGenre} onChange={e => setNewGameGenre(e.target.value as GameGenre)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
                                {Object.values(GameGenre).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="p-4 bg-gray-900/50 flex justify-end gap-2">
                            <button onClick={() => setIsGameModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800">{t('common.cancel')}</button>
                            <button onClick={handleAddGame} disabled={isUploading || !newGameTitle} className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white flex items-center gap-2">
                                {isUploading ? t('lobby.uploading') : <><Save size={16}/> {t('common.save')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;