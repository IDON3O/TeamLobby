
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldCheck, ArrowLeft, Loader2, Plus, X, Monitor, Tv, Box, Gamepad2,
  Shield, Layout, Trash2, ExternalLink, Ban, MicOff, Mic, ChevronUp, MoreHorizontal,
  Settings as SettingsIcon, Save, Globe, BookOpen, Edit3, Info
} from 'lucide-react';
import { User, Room, Game, GameGenre, Platform } from '../types';
import { 
  subscribeToAllUsers, getAllRooms, toggleBanUser, subscribeToGlobalLibrary,
  approveGame, updateUserProfile, deleteRoom, toggleMuteUser, deleteGlobalGame,
  subscribeToSettings, updateSettings, addGameToGlobalLibrary, updateGlobalGame
} from '../services/roomService';
import { useLanguage, TranslationKey } from '../services/i18n';
import { useAlert } from '../components/CustomModal';

interface AdminProps {
    currentUser: User;
}

const PlatformIcon = ({ p }: { p: string }) => {
    if (p.includes('PC')) return <Monitor size={14} />;
    if (p.includes('Xbox')) return <Box size={14} />;
    if (p.includes('PS')) return <Tv size={14} />;
    if (p.includes('Switch')) return <Gamepad2 size={14} />;
    return null;
};

const Admin: React.FC<AdminProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [pendingGames, setPendingGames] = useState<Game[]>([]);
    const [globalLibrary, setGlobalLibrary] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'rooms' | 'pending' | 'library' | 'settings'>('users');
    
    const [communityHubCode, setCommunityHubCode] = useState("");
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Modal Global Library States
    const [isLibModalOpen, setIsLibModalOpen] = useState(false);
    const [editingLibId, setEditingLibId] = useState<string | null>(null);
    const [newLibTitle, setNewLibTitle] = useState('');
    const [newLibGenre, setNewLibGenre] = useState<GameGenre>(GameGenre.ACTION);
    const [newLibPlatforms, setNewLibPlatforms] = useState<Platform[]>([Platform.PC]);
    const [newLibLink, setNewLibLink] = useState('');
    const [newLibImageUrl, setNewLibImageUrl] = useState('');
    const [newLibDesc, setNewLibDesc] = useState('');
    const [showAllLibGenres, setShowAllLibGenres] = useState(false);
    const [isSavingLibGame, setIsSavingLibGame] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const allRooms = await getAllRooms();
            setRooms(allRooms);
            
            const pending: Game[] = [];
            allRooms.forEach(r => {
                const queue = (Array.isArray(r.gameQueue) ? r.gameQueue : Object.values(r.gameQueue || {})) as Game[];
                queue.forEach(g => {
                    if (g.status === 'pending') pending.push(g);
                });
            });
            setPendingGames(pending);
        } catch (e) {
            console.error("Error loading admin data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubUsers = subscribeToAllUsers(setUsers);
        const unsubLib = subscribeToGlobalLibrary(setGlobalLibrary);
        const unsubSettings = subscribeToSettings((settings) => {
            if (settings && settings.communityHubCode) {
                setCommunityHubCode(settings.communityHubCode);
            }
        });

        loadData();
        return () => {
            unsubUsers();
            unsubLib();
            unsubSettings();
        };
    }, []);

    const handleApprove = async (game: Game) => {
        await approveGame(game);
        showAlert({ message: `Juego "${game.title}" aprobado globalmente.`, type: 'success' });
        loadData();
    };

    const handleRoleUpdate = async (u: User) => {
        await updateUserProfile(u.id, { isAdmin: !u.isAdmin });
    };

    const handleDeleteRoom = async (code: string) => {
        showAlert({
            title: "ELIMINAR SALA",
            message: `¿Borrar permanentemente la sala #${code}?`,
            type: 'confirm',
            onConfirm: async () => {
                await deleteRoom(code);
                loadData();
            }
        });
    };

    const handleMuteToggle = async (u: User) => {
        await toggleMuteUser(u.id, !u.isMuted);
    };

    const handleSaveSettings = async () => {
        if (!communityHubCode.trim()) return;
        setIsSavingSettings(true);
        try {
            await updateSettings({ communityHubCode: communityHubCode.toUpperCase() });
            showAlert({ message: "Ajustes globales actualizados.", type: 'success' });
        } catch (e) {
            showAlert({ message: "Error al actualizar.", type: 'error' });
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Global Library Handlers
    const openLibModal = (game?: Game) => {
        if (game) {
            setEditingLibId(game.id);
            setNewLibTitle(game.title);
            setNewLibGenre(game.genre);
            setNewLibPlatforms(game.platforms || [Platform.PC]);
            setNewLibLink(game.link || '');
            setNewLibImageUrl(game.imageUrl);
            setNewLibDesc(game.description);
        } else {
            setEditingLibId(null);
            setNewLibTitle('');
            setNewLibGenre(GameGenre.ACTION);
            setNewLibPlatforms([Platform.PC]);
            setNewLibLink('');
            setNewLibImageUrl('');
            setNewLibDesc('');
        }
        setIsLibModalOpen(true);
    };

    const closeLibModal = () => {
        setIsLibModalOpen(false);
        setEditingLibId(null);
        setShowAllLibGenres(false);
    };

    const toggleLibPlatform = (p: Platform) => {
        setNewLibPlatforms(prev => 
            prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
        );
    };

    const handleSaveLibGame = async () => {
        if (!newLibTitle.trim()) return;
        setIsSavingLibGame(true);
        try {
            const gameData: Game = {
                id: editingLibId || `lib-${Date.now()}`,
                title: newLibTitle,
                description: newLibDesc,
                imageUrl: newLibImageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
                genre: newLibGenre,
                platforms: newLibPlatforms,
                link: newLibLink,
                status: 'approved',
                votedBy: [],
                tags: ['Global']
            };

            if (editingLibId) await updateGlobalGame(editingLibId, gameData);
            else await addGameToGlobalLibrary(gameData);
            
            showAlert({ message: "Biblioteca actualizada.", type: 'success' });
            closeLibModal();
        } catch (e) {
            showAlert({ message: "Error al guardar.", type: 'error' });
        } finally {
            setIsSavingLibGame(false);
        }
    };

    const handleDeleteLibGame = (gameId: string) => {
        showAlert({
            title: "ELIMINAR DE BIBLIOTECA",
            message: "¿Quitar este juego del catálogo global?",
            type: 'confirm',
            onConfirm: async () => {
                await deleteGlobalGame(gameId);
            }
        });
    };

    const genres = Object.values(GameGenre);
    const visibleLibGenres = showAllLibGenres ? genres : genres.slice(0, 5);

    return (
        <div className="min-h-screen bg-background text-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-3 bg-surface hover:bg-gray-800 rounded-xl transition-colors border border-gray-800">
                            <ArrowLeft size={20}/>
                        </button>
                        <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 italic uppercase">
                            <ShieldCheck className="text-yellow-500" size={32}/> {t('admin.dashboard')}
                        </h1>
                    </div>
                    
                    <nav className="flex bg-surface p-1 rounded-2xl border border-gray-800 shadow-xl flex-wrap justify-center md:justify-end">
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Usuarios</button>
                        <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'rooms' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Salas</button>
                        <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pending' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Pendientes ({pendingGames.length})</button>
                        <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'library' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Biblioteca</button>
                        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Ajustes</button>
                    </nav>
                </header>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={48}/>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Syncing Database...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {activeTab === 'users' && (
                            <div className="bg-surface border border-gray-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-900/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800">
                                            <th className="px-6 py-5">Usuario</th>
                                            <th className="px-6 py-5">Estado</th>
                                            <th className="px-6 py-5 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-white/5 transition-colors text-xs">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <img src={u.avatarUrl} className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800" />
                                                    <span className="font-black text-white">{u.nickname || u.alias}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        {u.isAdmin && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded uppercase font-black">Admin</span>}
                                                        {u.isBanned && <span className="text-[8px] bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded uppercase font-black">Banned</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center space-x-2">
                                                    <button onClick={() => handleRoleUpdate(u)} className={`p-2 rounded-xl border ${u.isAdmin ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-500'}`}><Shield size={16}/></button>
                                                    <button onClick={() => toggleBanUser(u.id, !u.isBanned)} className={`p-2 rounded-xl border ${u.isBanned ? 'bg-red-500 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}><Ban size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'rooms' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rooms.map(r => (
                                    <div key={r.code} className="bg-surface border border-gray-800 rounded-[2rem] p-6 space-y-4 hover:border-primary/40 transition-all shadow-xl">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-black text-white uppercase italic">{r.name}</h3>
                                                <span className="text-[10px] font-mono text-primary font-black">#{r.code}</span>
                                            </div>
                                            <button onClick={() => handleDeleteRoom(r.code)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                        </div>
                                        <div className="flex gap-3 text-[10px] font-black text-gray-500 uppercase">
                                            <span className="bg-black/30 px-3 py-1.5 rounded-lg border border-gray-800">{r.members?.length || 0} Miembros</span>
                                            <span className="bg-black/30 px-3 py-1.5 rounded-lg border border-gray-800">{r.gameQueue?.length || 0} Juegos</span>
                                        </div>
                                        <button onClick={() => navigate(`/room/${r.code}`)} className="w-full py-3 bg-gray-900 border border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all">Ver Sala</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'library' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase text-gray-500 tracking-[0.3em] flex items-center gap-2">
                                        <BookOpen size={16}/> Catálogo Global ({globalLibrary.length})
                                    </h3>
                                    <button onClick={() => openLibModal()} className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20 flex items-center gap-2">
                                        <Plus size={16}/> Añadir Juego Global
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {globalLibrary.map(g => (
                                        <div key={g.id} className="bg-surface border border-gray-800 rounded-[2rem] overflow-hidden group hover:border-primary/40 transition-all shadow-xl flex flex-col">
                                            <div className="h-40 relative bg-gray-900 overflow-hidden">
                                                <img src={g.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                                                <div className="absolute bottom-4 left-5">
                                                    <h4 className="font-black text-white uppercase italic leading-none">{g.title}</h4>
                                                    <span className="text-[9px] text-primary font-black uppercase mt-1 inline-block">{g.genre}</span>
                                                </div>
                                            </div>
                                            <div className="p-5 flex-1 space-y-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {g.platforms?.map(p => <div key={p} className="text-[8px] font-black bg-black/40 border border-gray-800 px-2 py-1 rounded-lg text-gray-500 uppercase">{p}</div>)}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openLibModal(g)} className="flex-1 py-3 bg-gray-800 border border-gray-700 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"><Edit3 size={14}/> Editar</button>
                                                    <button onClick={() => handleDeleteLibGame(g.id)} className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {globalLibrary.length === 0 && (
                                        <div className="col-span-full py-20 border-2 border-dashed border-gray-800 rounded-[2rem] flex flex-col items-center justify-center text-gray-600 font-black uppercase text-xs">
                                            La biblioteca global está vacía
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'pending' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingGames.length === 0 ? (
                                    <div className="col-span-full h-80 border-2 border-dashed border-gray-800 rounded-[2rem] flex flex-col items-center justify-center text-gray-600 font-black uppercase text-xs">Sin postulaciones pendientes</div>
                                ) : (
                                    pendingGames.map(g => (
                                        <div key={g.id} className="bg-surface border border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-2xl">
                                            <div className="flex gap-4">
                                                <img src={g.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-900 border border-gray-800" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-white truncate text-sm">{g.title}</p>
                                                    <p className="text-[9px] font-black text-primary uppercase">{g.genre}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold mt-1 line-clamp-2 italic leading-relaxed">"{g.description}"</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApprove(g)} className="flex-1 py-3 bg-green-500 text-black text-[10px] font-black uppercase rounded-xl shadow-lg shadow-green-500/20 active:scale-95 transition-all">Aprobar</button>
                                                <button className="flex-1 py-3 bg-gray-800 text-red-500 text-[10px] font-black uppercase rounded-xl border border-gray-700">Rechazar</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-surface border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20"><Globe size={24}/></div>
                                        <div>
                                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Community Hub</h3>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Sala de acceso global</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Código de Sala</label>
                                        <input type="text" value={communityHubCode} onChange={e => setCommunityHubCode(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl py-5 px-6 font-black text-lg tracking-[0.5em] text-center focus:border-primary outline-none text-primary" placeholder="E.G. UC2PI" />
                                    </div>
                                    <button onClick={handleSaveSettings} disabled={isSavingSettings || !communityHubCode.trim()} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95">
                                        {isSavingSettings ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Actualizar Hub
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL GESTIÓN BIBLIOTECA GLOBAL */}
            {isLibModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-surface border border-gray-700 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">{editingLibId ? 'Editar Juego Global' : 'Nuevo Juego Global'}</h3>
                            <button onClick={closeLibModal} className="p-2.5 hover:bg-gray-800 rounded-xl text-gray-500 hover:text-white transition-all"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Título</label>
                                <input type="text" value={newLibTitle} onChange={e => setNewLibTitle(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm font-black focus:border-primary outline-none transition-all placeholder:text-gray-700" placeholder="e.g. Minecraft..."/>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Género</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {visibleLibGenres.map(g => (
                                        <button 
                                            key={g} 
                                            onClick={() => setNewLibGenre(g)} 
                                            className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase transition-all border ${newLibGenre === g ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10' : 'bg-black/40 text-gray-500 border-gray-800'}`}
                                        >
                                            {t(`genre.${g}` as TranslationKey)}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setShowAllLibGenres(!showAllLibGenres)}
                                        className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase transition-all border flex items-center justify-center gap-1 ${showAllLibGenres ? 'bg-gray-800 text-white border-gray-700' : 'bg-black/40 text-gray-500 border-gray-800'}`}
                                    >
                                        {showAllLibGenres ? <ChevronUp size={10}/> : <MoreHorizontal size={10}/>}
                                        {showAllLibGenres ? 'MENOS' : 'MÁS'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Plataformas</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(Platform).map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => toggleLibPlatform(p)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black transition-all border ${newLibPlatforms.includes(p) ? 'bg-secondary/20 text-secondary border-secondary shadow-lg shadow-secondary/10' : 'bg-black/40 text-gray-500 border-gray-800'}`}
                                        >
                                            <PlatformIcon p={p}/> {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Portada (URL)</label>
                                    <input type="text" value={newLibImageUrl} onChange={e => setNewLibImageUrl(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-primary transition-all placeholder:text-gray-800" placeholder="https://...jpg"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Enlace</label>
                                    <input type="text" value={newLibLink} onChange={e => setNewLibLink(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-primary transition-all placeholder:text-gray-800" placeholder="Store link..."/>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Descripción</label>
                                <textarea value={newLibDesc} onChange={e => setNewLibDesc(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-[10px] h-20 font-bold outline-none focus:border-primary transition-all resize-none placeholder:text-gray-800" placeholder="Descripción del juego..."/>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-900/60 flex gap-3 border-t border-gray-800">
                            <button onClick={closeLibModal} className="flex-1 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
                            <button onClick={handleSaveLibGame} disabled={isSavingLibGame || !newLibTitle} className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all">
                                {isSavingLibGame ? <Loader2 className="animate-spin mx-auto" size={16}/> : (editingLibId ? 'Guardar Cambios' : 'Añadir a Biblioteca')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
