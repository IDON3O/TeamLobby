import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Settings, Mic, MicOff, Ban, ShieldCheck, ArrowLeft, Loader2, 
  Clock, Check, X, UserCheck, Shield 
} from 'lucide-react';
import { User, Room, Game } from '../types';
import { 
  subscribeToAllUsers, getAllRooms, toggleBanUser, toggleMuteUser, 
  approveGame, updateUserProfile 
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

    useEffect(() => {
        const unsub = subscribeToAllUsers(setUsers);
        
        const loadRooms = async () => {
            const allRooms = await getAllRooms();
            setRooms(allRooms);
            
            // Extraer juegos pendientes de todas las salas
            const pending: Game[] = [];
            allRooms.forEach(r => {
                const queue = Array.isArray(r.gameQueue) ? r.gameQueue : Object.values(r.gameQueue || {});
                queue.forEach(g => {
                    if (g.status === 'pending') pending.push(g);
                });
            });
            setPendingGames(pending);
            setLoading(false);
        };
        
        loadRooms();
        return () => unsub();
    }, []);

    const handleApprove = async (game: Game) => {
        await approveGame(game);
        alert(`Juego ${game.title} aprobado.`);
        // Recargar salas para refrescar UI
        const allRooms = await getAllRooms();
        setRooms(allRooms);
    };

    const handleRoleUpdate = async (uid: string, isAdmin: boolean) => {
        await updateUserProfile(uid, { isAdmin: !isAdmin });
    };

    return (
        <div className="min-h-screen bg-background text-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex items-center justify-between border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-3 bg-surface hover:bg-gray-800 rounded-xl transition-colors border border-gray-800"><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                                <ShieldCheck className="text-yellow-500" size={32}/> {t('admin.dashboard')}
                            </h1>
                            <p className="text-gray-500 text-sm font-medium">{t('admin.roleAdmin')}: {currentUser.nickname || currentUser.alias}</p>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48}/></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Pendientes de Aprobación */}
                        <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Clock size={16}/> {t('admin.pending')} ({pendingGames.length})</h2>
                            <div className="bg-surface border border-gray-800 rounded-2xl p-6 min-h-[400px] flex flex-col gap-4">
                                {pendingGames.length === 0 ? (
                                    <p className="text-center text-gray-600 italic py-20">{t('admin.noPending')}</p>
                                ) : (
                                    pendingGames.map(g => (
                                        <div key={g.id} className="bg-black/40 border border-gray-800 p-4 rounded-xl space-y-3">
                                            <div className="flex gap-3">
                                                <img src={g.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-900"/>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate">{g.title}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold">{g.genre}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApprove(g)} className="flex-1 py-2 bg-green-500/10 text-green-500 text-[10px] font-black uppercase rounded-lg border border-green-500/20 hover:bg-green-500 hover:text-white transition-all">{t('admin.approve')}</button>
                                                <button className="flex-1 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-500/20">{t('admin.reject')}</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Gestión de Usuarios */}
                        <div className="lg:col-span-2 space-y-4">
                             <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> {t('admin.users')}</h2>
                             <div className="bg-surface border border-gray-800 rounded-2xl overflow-hidden">
                                 <div className="overflow-x-auto">
                                     <table className="w-full text-left">
                                         <thead>
                                             <tr className="bg-gray-900/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800">
                                                 <th className="px-6 py-4">User</th>
                                                 <th className="px-6 py-4">Role</th>
                                                 <th className="px-6 py-4 text-center">Actions</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-800/50">
                                             {users.map(u => (
                                                 <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                     <td className="px-6 py-4">
                                                         <div className="flex items-center gap-3">
                                                             <img src={u.avatarUrl} className="w-9 h-9 rounded-full border border-gray-700"/>
                                                             <div>
                                                                 <p className="font-bold text-sm">{u.nickname || u.alias}</p>
                                                                 <p className="text-[10px] text-gray-500">{u.email}</p>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td className="px-6 py-4">
                                                         <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${u.isAdmin ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                                             {u.isAdmin ? t('admin.roleAdmin') : t('admin.roleUser')}
                                                         </span>
                                                     </td>
                                                     <td className="px-6 py-4">
                                                         <div className="flex justify-center gap-2">
                                                             <button 
                                                                onClick={() => handleRoleUpdate(u.id, !!u.isAdmin)}
                                                                className={`p-2 rounded-lg transition-all ${u.isAdmin ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500 hover:text-white'}`}
                                                                title={t('admin.makeAdmin')}
                                                             >
                                                                 <Shield size={18}/>
                                                             </button>
                                                             <button 
                                                                onClick={() => toggleMuteUser(u.id, !!u.isMuted)} 
                                                                className={`p-2 rounded-lg transition-all ${u.isMuted ? 'bg-orange-500/20 text-orange-500' : 'bg-gray-800 text-gray-500'}`}
                                                             >
                                                                 {u.isMuted ? <MicOff size={18}/> : <Mic size={18}/>}
                                                             </button>
                                                             <button 
                                                                onClick={() => toggleBanUser(u.id, !!u.isBanned)} 
                                                                className={`p-2 rounded-lg transition-all ${u.isBanned ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-500'}`}
                                                             >
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
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;