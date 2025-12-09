import React, { useState, useEffect, useRef } from 'react';
import { 
  Gamepad2, Users, Menu, LogOut, Plus, Search, 
  Sparkles, Crown, X, Save, Image as ImageIcon, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import GameCard from './components/GameCard';
import Chat from './components/Chat';
import { Game, Room, User, Message, Platform, ViewState, GameGenre } from './types';
import { MOCK_GAMES } from './constants';
import { getGameRecommendations } from './services/geminiService';
import { uploadGameImage } from './services/firebaseService';
import { signInWithGoogle, logout, createGuestUser } from './services/authService';
import { 
    createRoom, joinRoom, subscribeToRoom, addGameToRoom, 
    voteForGame, sendChatMessage, toggleUserReadyState, removeGameFromRoom 
} from './services/roomService';
import { db } from './firebaseConfig';

const App: React.FC = () => {
  // --- State ---
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('tl_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentUser) {
        sessionStorage.setItem('tl_user', JSON.stringify(currentUser));
    } else {
        sessionStorage.removeItem('tl_user');
    }
  }, [currentUser]);

  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<ViewState>('HOME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'MENU' | 'CHAT'>('MENU');
  
  // Loading States
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [dbError, setDbError] = useState(false);
  
  // Inputs
  const [joinCode, setJoinCode] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameGenre, setNewGameGenre] = useState<GameGenre>(GameGenre.FPS);
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (!db) setDbError(true);
  }, []);

  // --- Realtime Subscription ---
  useEffect(() => {
      if (room?.code) {
          const unsubscribe = subscribeToRoom(room.code, (updatedRoom) => {
              setRoom(updatedRoom);
          });
          return () => unsubscribe();
      }
  }, [room?.code]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      if (!isModalOpen) {
          setPreviewUrl(null);
          setSelectedFile(null);
          setNewGameTitle('');
      }
  }, [isModalOpen]);

  // --- Auth Actions ---

  const handleLogin = async () => {
      try {
          const user = await signInWithGoogle();
          if (user) setCurrentUser(user);
      } catch (e) {
          alert("Login failed. Check console.");
      }
  };

  const handleGuestLogin = () => {
      const guest = createGuestUser();
      setCurrentUser(guest);
  };

  const handleLogout = async () => {
      await logout();
      setCurrentUser(null);
      setRoom(null);
      setView('HOME');
  };

  // --- Room Actions ---

  const handleCreateRoom = async () => {
    if (!currentUser || currentUser.isGuest) return alert("Must be logged in to create a room.");
    if (!db) return alert("Firebase not connected.");
    
    setIsCreatingRoom(true);
    try {
        const code = await createRoom(currentUser);
        setRoom({ code, hostId: currentUser.id, members: [currentUser], gameQueue: [], chatHistory: [] });
        setView('LOBBY');
    } catch (e) {
        alert("Error creating room. " + e);
        console.error(e);
    } finally {
        setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode || !currentUser) return;
    if (!db) return alert("Firebase not connected.");
    
    setIsJoiningRoom(true);
    const codeUpper = joinCode.toUpperCase().trim();
    try {
        const success = await joinRoom(codeUpper, currentUser);
        if (success) {
            setRoom({ 
                code: codeUpper, 
                hostId: '', 
                members: [], 
                gameQueue: [], 
                chatHistory: [] 
            } as Room); 
            setView('LOBBY');
        } else {
            alert("Room not found!");
        }
    } catch (e) {
        console.error(e);
        alert("Connection error.");
    } finally {
        setIsJoiningRoom(false);
    }
  };

  const handleLeaveRoom = () => {
    setRoom(null);
    setView('HOME');
    setJoinCode('');
  };

  // --- Game Actions ---

  const handleVote = async (gameId: string) => {
    if (!room || !currentUser) return;
    if (currentUser.isGuest) {
        alert("Login required to vote.");
        return;
    }
    await voteForGame(room.code, gameId, currentUser.id);
  };

  const handleRemoveGame = async (gameId: string) => {
      if (!room || !currentUser) return;
      // Only Host or Admin can remove
      if (room.hostId !== currentUser.id && !currentUser.isAdmin) return;

      const gameToRemove = room.gameQueue?.find(g => g.id === gameId);
      if (gameToRemove) {
          await removeGameFromRoom(room.code, gameToRemove);
      }
  }

  const handleSendMessage = async (text: string) => {
    if (!room || !currentUser) return;
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      userId: currentUser.id,
      userName: currentUser.alias,
      content: text,
      timestamp: Date.now()
    };
    await sendChatMessage(room.code, newMessage);
  };

  const handleGetRecommendations = async () => {
    if (!room || !currentUser) return;
    if (currentUser.isGuest) return alert("Guests cannot request AI recs.");

    setIsLoadingRecs(true);
    try {
        const recs = await getGameRecommendations(room.members || [], room.gameQueue || []);
        const existingTitles = (room.gameQueue || []).map(g => g.title.toLowerCase());
        const newGames = recs.filter(r => !existingTitles.includes(r.title.toLowerCase()));
        
        for (const game of newGames) {
            await addGameToRoom(room.code, game, currentUser);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingRecs(false);
    }
  };

  const toggleReady = async () => {
      if (!room || !currentUser) return;
      setCurrentUser(prev => prev ? ({...prev, isReady: !prev.isReady}) : null);
      await toggleUserReadyState(room.code, currentUser.id);
  }

  const handleNavClick = (newView: ViewState) => {
    setView(newView);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const handleAddCustomGame = async () => {
      if (!newGameTitle.trim() || !room || !currentUser) return;
      
      setIsUploading(true);
      let finalImageUrl = ""; // Default to icon if no image

      try {
        if (selectedFile) {
            finalImageUrl = await uploadGameImage(selectedFile);
        }

        const newGame: Game = {
            id: `custom-${Date.now()}`,
            title: newGameTitle,
            description: 'Custom added game.',
            imageUrl: finalImageUrl,
            genre: newGameGenre,
            platforms: [Platform.PC],
            votedBy: [currentUser.id], // Auto-vote for own suggestion
            tags: ['Custom']
        };

        await addGameToRoom(room.code, newGame, currentUser);
        setIsModalOpen(false);
        handleNavClick('LOBBY');

      } catch (error) {
          alert("Error adding game: " + error);
      } finally {
          setIsUploading(false);
      }
  };

  const handleAddLibraryGame = async (game: Game) => {
      if (!room || !currentUser) return;
      if (currentUser.isGuest) return alert("Guests cannot add games.");

      if (room.gameQueue?.find(g => g.title === game.title)) {
          alert("Game already in queue!");
          return;
      }
      const gameEntry: Game = { 
          ...game, 
          id: `lib-${Date.now()}-${game.id}`, 
          votedBy: [currentUser.id] 
        };
      await addGameToRoom(room.code, gameEntry, currentUser);
      handleNavClick('LOBBY');
  };

  // --- Auth View (Not logged in) ---
  if (!currentUser) {
      return (
        <div className="min-h-screen bg-background text-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
             <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
             
             <div className="max-w-sm w-full bg-surface border border-gray-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 z-10">
                <div className="flex justify-center mb-4">
                    <div className="bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-lg shadow-primary/30">
                        <Gamepad2 size={40} className="text-white" />
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter mb-2">TeamLobby</h1>
                    <p className="text-gray-400 text-sm">Sign in to sync, vote, and lead your squad.</p>
                </div>

                <div className="space-y-3 pt-4">
                    <button onClick={handleLogin} className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                        <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
                        Sign in with Google
                    </button>
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                        <div className="relative flex justify-center text-xs font-bold uppercase"><span className="px-2 bg-surface text-gray-600">or</span></div>
                    </div>
                    <button onClick={handleGuestLogin} className="w-full bg-gray-800 text-gray-400 hover:text-white font-medium py-3 rounded-xl transition-colors text-sm border border-gray-700 hover:border-gray-600">
                        Continue as Guest
                    </button>
                </div>
             </div>
        </div>
      )
  }

  // --- Home View (Logged in, No Room) ---

  if (!room || view === 'HOME') {
    return (
      <div className="min-h-screen bg-background text-gray-100 flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        
        {/* User Badge Top Right */}
        <div className="absolute top-4 right-4 flex items-center gap-3 bg-surface/50 backdrop-blur border border-gray-800 pr-4 pl-2 py-2 rounded-full z-20">
            <img src={currentUser.avatarUrl} className="w-8 h-8 rounded-full bg-gray-700" />
            <div className="text-sm">
                <p className="font-bold leading-none">{currentUser.alias}</p>
                <p className="text-[10px] text-gray-400 uppercase">{currentUser.isGuest ? 'Guest' : currentUser.isAdmin ? 'Admin' : 'Member'}</p>
            </div>
            <button onClick={handleLogout} className="ml-2 text-gray-500 hover:text-white"><LogOut size={16}/></button>
        </div>

        {dbError && (
            <div className="absolute top-4 left-0 right-0 flex justify-center z-50 px-4">
                <div className="bg-danger/20 border border-danger text-danger px-4 py-3 rounded-xl flex items-center gap-3 max-w-lg">
                    <AlertTriangle size={24} />
                    <div>
                        <p className="font-bold">Missing Firebase Configuration</p>
                        <p className="text-sm">Please check your environment variables.</p>
                    </div>
                </div>
            </div>
        )}

        <div className="max-w-md w-full space-y-8 z-10 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary mb-3 tracking-tighter">
              TeamLobby
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-medium">Sync. Vote. Play.</p>
          </div>

          <div className="bg-surface/80 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
            {!currentUser.isGuest ? (
                <button 
                onClick={handleCreateRoom}
                disabled={isCreatingRoom || dbError}
                className="w-full bg-primary hover:bg-violet-600 active:scale-95 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isCreatingRoom ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                CREATE SQUAD
                </button>
            ) : (
                <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-xl text-center text-gray-500 text-sm">
                    Guests cannot create rooms. Please log in.
                </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
              <div className="relative flex justify-center text-xs font-bold tracking-widest"><span className="px-4 bg-surface text-gray-600">OR JOIN EXISTING</span></div>
            </div>

            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="ENTER CODE" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-4 text-center tracking-widest font-mono text-lg uppercase focus:border-accent outline-none transition-all placeholder:text-gray-700"
              />
              <button 
                onClick={handleJoinRoom}
                disabled={isJoiningRoom || !joinCode || dbError}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                 {isJoiningRoom ? <Loader2 className="animate-spin" /> : "JOIN ROOM"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safe checks for arrays
  const membersList = room.members || [];
  const gameQueueList = room.gameQueue || [];
  const chatHistoryList = room.chatHistory || [];

  return (
    <div className="h-screen bg-background text-gray-100 flex overflow-hidden font-sans selection:bg-primary/30">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[85vw] md:w-80 lg:w-72 bg-surface border-r border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                    <Gamepad2 size={18} className="text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-white">TeamLobby</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-800 rounded-md text-gray-400"><X size={20} /></button>
        </div>

        {/* Mobile Tabs */}
        <div className="flex lg:hidden border-b border-gray-800">
            <button onClick={() => setMobileTab('MENU')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'MENU' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}>MENU</button>
            <button onClick={() => setMobileTab('CHAT')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'CHAT' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}>CHAT</button>
        </div>

        <div className="flex-1 overflow-y-auto relative">
            {/* MENU TAB */}
            <div className={`flex-col h-full ${mobileTab === 'MENU' || window.innerWidth >= 1024 ? 'flex' : 'hidden'}`}>
                <div className="flex-1 py-6 px-4 space-y-2">
                    <div className="px-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Navigation</div>
                    <button onClick={() => handleNavClick('LOBBY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${view === 'LOBBY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}`}>
                        <Users size={20} className={view === 'LOBBY' ? 'text-white' : 'group-hover:text-primary transition-colors'} />
                        <span className="font-semibold">Lobby</span>
                    </button>
                    <button onClick={() => handleNavClick('LIBRARY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${view === 'LIBRARY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}`}>
                        <Gamepad2 size={20} className={view === 'LIBRARY' ? 'text-white' : 'group-hover:text-primary transition-colors'} />
                        <span className="font-semibold">Game Library</span>
                    </button>

                    <div className="mt-8 px-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Squad ({membersList.length})</div>
                    <div className="space-y-2">
                        {membersList.map(member => (
                            <div key={member.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-900/30 border border-gray-800/50">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden ring-2 ring-gray-800">
                                        {member.avatarUrl && <img src={member.avatarUrl} className="w-full h-full object-cover"/>}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-surface ${member.isReady ? 'bg-green-500' : 'bg-gray-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate flex items-center gap-1">
                                        {member.alias}
                                        {member.isAdmin && <ShieldCheck size={12} className="text-yellow-500"/>}
                                        {member.isGuest && <span className="text-[9px] bg-gray-700 px-1 rounded text-gray-400">GUEST</span>}
                                    </p>
                                    <p className="text-[10px] text-gray-500 truncate">{member.platforms.join(', ')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur shrink-0">
                    <div className="flex items-center gap-3 mb-4 p-2 bg-black/40 rounded-lg border border-gray-800">
                        <img src={currentUser.avatarUrl} alt="User" className="w-10 h-10 rounded-full border border-gray-700" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{currentUser.alias}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">{currentUser.isReady ? 'Ready' : 'Afk / Not Ready'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={toggleReady} className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentUser.isReady ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                            {currentUser.isReady ? 'Ready' : 'Set Ready'}
                        </button>
                        <button onClick={handleLeaveRoom} className="py-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-danger/20 hover:text-danger hover:border-danger/30 border border-transparent transition-all flex items-center justify-center gap-1">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* CHAT TAB (Mobile Only) */}
            <div className={`h-full ${mobileTab === 'CHAT' && window.innerWidth < 1024 ? 'block' : 'hidden'}`}>
                 <Chat messages={chatHistoryList} currentUser={currentUser} onSendMessage={handleSendMessage} onReceiveMessage={() => {}} />
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 lg:px-8 bg-surface/50 backdrop-blur sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-800 rounded-md text-gray-300"><Menu size={24} /></button>
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white leading-none">{view === 'LOBBY' ? 'Squad Lobby' : 'Game Library'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                             ROOM: <span className="text-accent">{room.code}</span>
                         </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!currentUser.isGuest ? (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary hover:bg-violet-600 text-white rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary/20">
                        <Plus size={16} /><span className="hidden md:inline">Add Game</span>
                    </button>
                ) : (
                    <span className="text-[10px] text-gray-500 border border-gray-800 px-2 py-1 rounded bg-gray-900">Guest Mode (Read Only)</span>
                )}
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
            {view === 'LOBBY' ? (
                <div className="space-y-8 pb-20">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Crown size={16} className="text-yellow-500" /> Top Voted</h3>
                            
                            {!currentUser.isGuest && (
                                <button onClick={handleGetRecommendations} disabled={isLoadingRecs} className="text-xs font-bold text-accent hover:text-cyan-300 flex items-center gap-1 transition-colors disabled:opacity-50">
                                    {isLoadingRecs ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} AI SUGGEST
                                </button>
                            )}
                        </div>
                        
                        {gameQueueList.length === 0 ? (
                             <div className="border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center gap-4">
                                <Gamepad2 size={48} className="text-gray-700" />
                                <p>Queue is empty. Add games from the Library!</p>
                             </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                                {gameQueueList.map((game) => (
                                    <div key={game.id} className="h-64 md:h-80">
                                        <GameCard 
                                            game={game}
                                            currentUserId={currentUser.id}
                                            onVote={handleVote}
                                            onRemove={handleRemoveGame}
                                            isVotingEnabled={!currentUser.isGuest}
                                            canRemove={currentUser.id === room.hostId || !!currentUser.isAdmin}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 pb-20">
                    <div className="flex items-center gap-2 mb-6 bg-gray-900/50 p-2 rounded-lg border border-gray-800 max-w-md">
                        <Search size={18} className="text-gray-500 ml-2" />
                        <input type="text" placeholder="Search library..." className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-300 placeholder:text-gray-600 h-8" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                         {MOCK_GAMES.map(game => (
                             <div key={game.id} className="h-64 md:h-72 opacity-75 hover:opacity-100 transition-opacity">
                                 <GameCard 
                                    game={game} 
                                    currentUserId={currentUser.id}
                                    onVote={() => {}} 
                                    isVotingEnabled={false}
                                    canRemove={false}
                                />
                                 {!currentUser.isGuest && (
                                     <button 
                                        onClick={() => handleAddLibraryGame(game)}
                                        className="w-full mt-2 py-2 rounded bg-gray-800 hover:bg-primary hover:text-white text-xs font-bold transition-colors border border-gray-700 hover:border-primary"
                                     >
                                        ADD TO QUEUE
                                     </button>
                                 )}
                             </div>
                         ))}
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* Desktop Chat */}
      <aside className="hidden lg:block w-80 border-l border-gray-800 bg-surface flex-col shrink-0">
          <Chat messages={chatHistoryList} currentUser={currentUser} onSendMessage={handleSendMessage} onReceiveMessage={() => {}} />
      </aside>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-surface border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                      <h3 className="font-bold text-white flex items-center gap-2"><Plus size={18} className="text-primary"/> Add Custom Game</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">Cover Image</label>
                          <div onClick={() => fileInputRef.current?.click()} className="relative h-40 w-full rounded-xl border-2 border-dashed border-gray-700 hover:border-primary hover:bg-gray-800/50 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden">
                              {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <><ImageIcon className="text-gray-600 group-hover:text-primary mb-2 transition-colors" size={32} /><span className="text-xs text-gray-500 group-hover:text-gray-300">Click to upload cover</span></>}
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">Game Title</label>
                          <input type="text" value={newGameTitle} onChange={(e) => setNewGameTitle(e.target.value)} placeholder="e.g. Helldivers 2" className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none transition-colors"/>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">Genre</label>
                          <select value={newGameGenre} onChange={(e) => setNewGameGenre(e.target.value as GameGenre)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-primary outline-none appearance-none">
                              {Object.values(GameGenre).map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-2">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
                      <button onClick={handleAddCustomGame} disabled={isUploading || !newGameTitle} className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                          {isUploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><Save size={16} /> Save Game</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;