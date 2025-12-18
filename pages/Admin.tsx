
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldCheck, ArrowLeft, Loader2, 
  Clock, Shield, Layout, Trash2, ExternalLink, MessageCircle, Ban
} from 'lucide-react';
import { User, Room, Game } from '../types';
import { 
  subscribeToAllUsers, getAllRooms, toggleBanUser, toggleMuteUser, 
  approveGame, updateUserProfile, deleteRoom 
} from '../services/roomService';
import { useLanguage } from '../services/i18n';

interface AdminProps {
    currentUser: User;
}

const Admin: React.FC<AdminProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [pendingGames, setPendingGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'rooms' | 'pending'>('users');

    const loadData = async () => {
        setLoading(true);
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
        setLoading(false);
    };

    useEffect(() => {
        const unsub = subscribeToAllUsers(setUsers);
        loadData();
        return () => unsub();
    }, []);

    const handleApprove = async (game: Game) => {
        await approveGame(game);
        alert(`Game ${game.title} approved globally.`);
        loadData();
    };

    const handleRoleUpdate = async (u: User) => {
        await updateUserProfile(u.id, { isAdmin: !u.isAdmin });
    };

    const handleDeleteRoom = async (code: string) => {
        if (window.confirm(`Delete room ${code}? This cannot be undone.`)) {
            await deleteRoom(code);
            loadData();
        }
    };

    return (
        <div className="min-h-screen bg-background text-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-3 bg-surface hover:bg-gray-800 rounded-xl transition-colors border border-gray-800">
                            <ArrowLeft size={20}/>
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 italic uppercase">
                                <ShieldCheck className="text-yellow-500" size={32}/> {t('admin.dashboard')}
                            </h1>
                        </div>
                    </div>
                    
                    <nav className="flex bg-surface p-1 rounded-2xl border border-gray-800">
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}>Users</button>
                        <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'rooms' ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}>Rooms</button>
                        <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'pending' ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}>Pending ({pendingGames.length})</button>
                    </nav>
                </header>

                {loading ? (
                    <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48}/></div>
                ) : (
                    <div className="space-y-6">
                        {activeTab === 'users' && (
                            <div className="bg-surface border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-900/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800">
                                                <th className="px-6 py-4">User</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-center">Admin Controls</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/50">
                                            {users.map(u => (
                                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={u.avatarUrl} className="w-10 h-10 rounded-xl border border-gray-700 bg-gray-900"/>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm truncate">{u.nickname || u.alias}</p>
                                                                <p className="text-[10px] text-gray-500 font-mono">{u.id.slice(0, 10)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            {u.isAdmin && <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black uppercase tracking-widest">Admin</span>}
                                                            {u.isBanned && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest">Banned</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                onClick={() => handleRoleUpdate(u)}
                                                                className={`p-2.5 rounded-xl transition-all ${u.isAdmin ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500 hover:text-white'}`}
                                                                title="Toggle Admin"
                                                            >
                                                                <Shield size={18}/>
                                                            </button>
                                                            <button 
                                                                onClick={() => toggleBanUser(u.id, !u.isBanned)} 
                                                                className={`p-2.5 rounded-xl transition-all ${u.isBanned ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-800 text-gray-500 hover:text-red-500'}`}
                                                                title="Ban User"
                                                            >
                                                                {/* Added Ban icon import */}
                                                                <Ban size={18}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'rooms' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rooms.map(r => (
                                    <div key={r.code} className="bg-surface border border-gray-800 rounded-3xl p-6 space-y-4 hover:border-primary/40 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-black text-lg text-white group-hover:text-primary transition-colors">{r.name}</h3>
                                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">#{r.code}</span>
                                            </div>
                                            <button onClick={() => handleDeleteRoom(r.code)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className="bg-black/30 p-3 rounded-2xl border border-gray-800/50">
                                                <p className="text-[9px] font-black text-gray-600 uppercase mb-1 flex items-center gap-1"><Users size={10}/> Members</p>
                                                <p className="text-sm font-black text-gray-300">{r.members?.length || 0}</p>
                                            </div>
                                            <div className="bg-black/30 p-3 rounded-2xl border border-gray-800/50">
                                                <p className="text-[9px] font-black text-gray-600 uppercase mb-1 flex items-center gap-1"><Layout size={10}/> Games</p>
                                                <p className="text-sm font-black text-gray-300">{r.gameQueue?.length || 0}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate(`/room/${r.code}`)} className="w-full py-3 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary flex items-center justify-center gap-2">
                                            Inspect <ExternalLink size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'pending' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingGames.length === 0 ? (
                                    <div className="col-span-full h-64 border-2 border-dashed border-gray-800 rounded-3xl flex items-center justify-center text-gray-600 italic uppercase tracking-widest">No games waiting for approval</div>
                                ) : (
                                    pendingGames.map(g => (
                                        <div key={g.id} className="bg-surface border border-gray-800 rounded-3xl p-5 space-y-4">
                                            <div className="flex gap-4">
                                                <img src={g.imageUrl || 'https://via.placeholder.com/100'} className="w-16 h-16 rounded-2xl object-cover bg-gray-900"/>
                                                <div className="min-w-0">
                                                    <p className="font-black text-white truncate">{g.title}</p>
                                                    <p className="text-[10px] font-black text-primary uppercase">{g.genre}</p>
                                                    <p className="text-[9px] text-gray-500 font-bold mt-1 line-clamp-1 italic">"{g.description}"</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApprove(g)} className="flex-1 py-3 bg-green-500 text-black text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all">Approve</button>
                                                <button className="flex-1 py-3 bg-gray-800 text-red-500 text-[10px] font-black uppercase rounded-2xl hover:bg-red-500 hover:text-white transition-all">Reject</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;
