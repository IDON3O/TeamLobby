import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldCheck, ArrowLeft, Loader2, 
  Shield, Layout, Trash2, ExternalLink, Ban
} from 'lucide-react';
import { User, Room, Game } from '../types';
import { 
  subscribeToAllUsers, getAllRooms, toggleBanUser, 
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
        const unsub = subscribeToAllUsers((updatedUsers) => {
            setUsers(updatedUsers || []);
        });
        loadData();
        return () => unsub();
    }, []);

    const handleApprove = async (game: Game) => {
        await approveGame(game);
        alert(`Game "${game.title}" approved globally.`);
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
                    
                    <nav className="flex bg-surface p-1 rounded-2xl border border-gray-800 shadow-xl">
                        <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>Users</button>
                        <button onClick={() => setActiveTab('rooms')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'rooms' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>Rooms</button>
                        <button onClick={() => setActiveTab('pending')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'pending' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>Pending ({pendingGames.length})</button>
                    </nav>
                </header>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={48}/>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing Database...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeTab === 'users' && (
                            <div className="bg-surface border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-900/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800">
                                                <th className="px-6 py-5">User</th>
                                                <th className="px-6 py-5">Status</th>
                                                <th className="px-6 py-5 text-center">Admin Controls</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/50">
                                            {users.map(u => (
                                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <img src={u.avatarUrl} className="w-12 h-12 rounded-2xl border border-gray-700 bg-gray-900 object-cover"/>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-sm text-white truncate">{u.nickname || u.alias}</p>
                                                                <p className="text-[10px] text-gray-500 font-mono tracking-tighter">ID: {u.id?.slice(0, 10) || 'N/A'}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex gap-2">
                                                            {u.isAdmin && <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black uppercase tracking-widest">Admin</span>}
                                                            {u.isBanned && <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest">Banned</span>}
                                                            {!u.isAdmin && !u.isBanned && <span className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 text-[9px] font-black uppercase tracking-widest">Active</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex justify-center gap-3">
                                                            <button 
                                                                onClick={() => handleRoleUpdate(u)}
                                                                className={`p-3 rounded-2xl transition-all ${u.isAdmin ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-gray-800 text-gray-500 hover:text-white border border-gray-700'}`}
                                                                title="Promote/Demote Admin"
                                                            >
                                                                <Shield size={20}/>
                                                            </button>
                                                            <button 
                                                                onClick={() => toggleBanUser(u.id, !u.isBanned)} 
                                                                className={`p-3 rounded-2xl transition-all ${u.isBanned ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-800 text-gray-500 hover:text-red-500 border border-gray-700'}`}
                                                                title="Ban/Unban User"
                                                            >
                                                                <Ban size={20}/>
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
                                    <div key={r.code} className="bg-surface border border-gray-800 rounded-[2rem] p-6 space-y-5 hover:border-primary/40 transition-all group shadow-xl">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <h3 className="font-black text-lg text-white group-hover:text-primary transition-colors truncate">{r.name}</h3>
                                                <span className="text-[10px] font-mono text-primary/70 font-black uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">#{r.code}</span>
                                            </div>
                                            <button onClick={() => handleDeleteRoom(r.code)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/40 p-4 rounded-2xl border border-gray-800/50">
                                                <p className="text-[10px] font-black text-gray-600 uppercase mb-2 flex items-center gap-2"><Users size={12}/> Members</p>
                                                <p className="text-xl font-black text-white">{r.members?.length || 0}</p>
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-2xl border border-gray-800/50">
                                                <p className="text-[10px] font-black text-gray-600 uppercase mb-2 flex items-center gap-2"><Layout size={12}/> Games</p>
                                                <p className="text-xl font-black text-white">{r.gameQueue?.length || 0}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate(`/room/${r.code}`)} className="w-full py-4 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-3">
                                            Enter Room <ExternalLink size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'pending' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingGames.length === 0 ? (
                                    <div className="col-span-full h-80 border-2 border-dashed border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-700 italic uppercase tracking-[0.2em] bg-surface/20">
                                        <Layout size={48} className="mb-4 opacity-10"/>
                                        No pending submissions
                                    </div>
                                ) : (
                                    pendingGames.map(g => (
                                        <div key={g.id} className="bg-surface border border-gray-800 rounded-[2.5rem] p-6 space-y-5 shadow-2xl">
                                            <div className="flex gap-5">
                                                <img src={g.imageUrl || 'https://via.placeholder.com/150'} className="w-20 h-20 rounded-[1.2rem] object-cover bg-gray-900 border border-gray-800 shadow-lg"/>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-white truncate text-base">{g.title}</p>
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">{g.genre}</p>
                                                    <p className="text-[11px] text-gray-500 font-bold mt-2 line-clamp-2 italic leading-relaxed">"{g.description}"</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => handleApprove(g)} className="flex-1 py-4 bg-green-500 text-black text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all tracking-widest">Approve</button>
                                                <button className="flex-1 py-4 bg-gray-800 text-red-500 text-[10px] font-black uppercase rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-gray-700 tracking-widest">Reject</button>
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