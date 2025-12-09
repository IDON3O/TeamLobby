import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings, Mic, MicOff, Ban, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { User, Room } from '../types';
import { subscribeToAllUsers, getAllRooms, toggleBanUser, toggleMuteUser } from '../services/roomService';

interface AdminProps {
    currentUser: User;
}

const Admin: React.FC<AdminProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeToAllUsers((data) => {
            setUsers(data);
            setLoading(false);
        });
        getAllRooms().then(setRooms);
        return () => unsub();
    }, []);

    const handleBan = (uid: string, current: boolean) => toggleBanUser(uid, current);
    const handleMute = (uid: string, current: boolean) => toggleMuteUser(uid, current);

    return (
        <div className="min-h-screen bg-background text-gray-100 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-800 rounded-full"><ArrowLeft/></button>
                        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-yellow-500"/> Admin Dashboard</h1>
                    </div>
                </header>

                {loading ? <Loader2 className="animate-spin mx-auto"/> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Users */}
                        <div className="bg-surface border border-gray-800 rounded-xl p-6">
                             <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users size={20}/> User Management</h2>
                             <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                 {users.map(u => (
                                     <div key={u.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                         <div className="flex items-center gap-3">
                                             <img src={u.avatarUrl} className="w-8 h-8 rounded-full"/>
                                             <div>
                                                 <p className="font-bold text-sm">{u.alias} {u.isAdmin && <span className="text-yellow-500">(Admin)</span>}</p>
                                                 <p className="text-xs text-gray-500">{u.email}</p>
                                             </div>
                                         </div>
                                         <div className="flex gap-2">
                                             {!u.isAdmin && (
                                                 <>
                                                    <button onClick={() => handleMute(u.id, !!u.isMuted)} className={`p-2 rounded ${u.isMuted ? 'bg-orange-500/20 text-orange-500' : 'bg-gray-800 text-gray-400'}`}>
                                                        {u.isMuted ? <MicOff size={16}/> : <Mic size={16}/>}
                                                    </button>
                                                    <button onClick={() => handleBan(u.id, !!u.isBanned)} className={`p-2 rounded ${u.isBanned ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                                                        <Ban size={16}/>
                                                    </button>
                                                 </>
                                             )}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                        {/* Rooms */}
                        <div className="bg-surface border border-gray-800 rounded-xl p-6">
                             <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20}/> Active Rooms</h2>
                             <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {rooms.map(r => (
                                    <div key={r.code} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                        <div>
                                            <p className="font-bold text-sm">{r.name || r.code}</p>
                                            <p className="text-xs text-gray-500">Members: {(Array.isArray(r.members) ? r.members : Object.values(r.members || {})).length}</p>
                                        </div>
                                        <button onClick={() => navigate(`/room/${r.code}`)} className="px-3 py-1 bg-primary text-white text-xs font-bold rounded">Inspect</button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;