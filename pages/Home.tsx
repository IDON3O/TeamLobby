import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, LogOut, ShieldCheck, Plus, Clock, Loader2, Ban } from 'lucide-react';
import { User, RoomSummary } from '../types';
import { createRoom, joinRoom, getUserRooms } from '../services/roomService';
import { logout } from '../services/authService';

interface HomeProps {
    currentUser: User;
}

const Home: React.FC<HomeProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    
    // Create Room State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isRoomPrivate, setIsRoomPrivate] = useState(false);
    const [newRoomPassword, setNewRoomPassword] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    // History
    const [history, setHistory] = useState<RoomSummary[]>([]);

    useEffect(() => {
        if (!currentUser.isGuest) {
            getUserRooms(currentUser.id).then(setHistory);
        }
    }, [currentUser]);

    const handleLogout = async () => {
        await logout();
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) return alert("Room name required");
        if (isRoomPrivate && !newRoomPassword) return alert("Password required");
        
        setIsCreatingRoom(true);
        try {
            const code = await createRoom(currentUser, newRoomName, isRoomPrivate ? newRoomPassword : undefined);
            navigate(`/room/${code}`);
        } catch(e) {
            alert("Error creating room");
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinCode) return;
        setIsJoiningRoom(true);
        try {
            const result = await joinRoom(joinCode.toUpperCase(), currentUser, joinPassword);
            if (result.success) {
                navigate(`/room/${joinCode.toUpperCase()}`);
            } else if (result.message === "Invalid Password") {
                setShowPasswordInput(true);
                alert("Password required");
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert("Connection error");
        } finally {
            setIsJoiningRoom(false);
        }
    };

    if (currentUser.isBanned) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-danger p-6 text-center">
            <Ban size={64} className="mb-4" />
            <h1 className="text-3xl font-bold mb-2">ACCESS DENIED</h1>
            <button onClick={handleLogout} className="mt-8 px-6 py-2 bg-gray-800 text-white rounded">Sign Out</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-gray-100 flex flex-col p-4 relative overflow-y-auto">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8 z-10 max-w-6xl mx-auto w-full">
                <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                    <Gamepad2 className="text-primary"/> TeamLobby
                </h1>
                <div className="flex items-center gap-3">
                    {currentUser.isAdmin && (
                        <button onClick={() => navigate('/admin')} className="px-3 py-1.5 bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 rounded-lg text-sm font-bold flex items-center gap-2">
                            <ShieldCheck size={16}/> Admin
                        </button>
                    )}
                    <div className="flex items-center gap-3 bg-surface/50 border border-gray-800 pr-4 pl-2 py-1.5 rounded-full">
                        <img src={currentUser.avatarUrl} className="w-8 h-8 rounded-full bg-gray-700" />
                        <div className="text-sm hidden md:block">
                            <p className="font-bold leading-none">{currentUser.alias}</p>
                        </div>
                        <button onClick={handleLogout} className="ml-2 text-gray-500 hover:text-white"><LogOut size={16}/></button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create / Join */}
                <div className="bg-surface/80 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 h-fit">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold">Get Started</h2>
                        <p className="text-gray-400 text-sm">Join a squad or start your own.</p>
                    </div>

                    {!currentUser.isGuest ? (
                        <button onClick={() => setShowCreateModal(true)} className="w-full bg-primary hover:bg-violet-600 active:scale-95 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                            <Plus size={24} /> CREATE SQUAD
                        </button>
                    ) : (
                        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-xl text-center text-gray-500 text-sm">Guest Login Mode</div>
                    )}

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                        <div className="relative flex justify-center text-xs font-bold tracking-widest"><span className="px-4 bg-surface text-gray-600">OR JOIN</span></div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <input type="text" placeholder="ENTER CODE" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-4 text-center tracking-widest font-mono text-lg uppercase focus:border-accent outline-none" />
                        {showPasswordInput && (
                            <input type="password" placeholder="Password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-center text-white focus:border-danger outline-none" />
                        )}
                        <button onClick={handleJoinRoom} disabled={isJoiningRoom || !joinCode} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl transition-colors font-bold flex items-center justify-center gap-2">
                            {isJoiningRoom ? <Loader2 className="animate-spin" /> : "JOIN ROOM"}
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-300"><Clock size={20}/> Recent Rooms</h3>
                    {history.length > 0 ? (
                        <div className="space-y-3">
                            {history.map(hist => (
                                <div key={hist.code} onClick={() => navigate(`/room/${hist.code}`)} className="group bg-surface border border-gray-800 p-4 rounded-xl hover:border-primary transition-colors cursor-pointer flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{hist.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">Code: {hist.code}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500">Host: {hist.hostAlias}</p>
                                        <p className="text-[10px] text-gray-600">{new Date(hist.lastVisited).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-40 border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">No recent history.</div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-gray-700 w-full max-w-md rounded-2xl p-6 space-y-4">
                        <h3 className="text-xl font-bold">Create New Squad</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Room Name</label>
                            <input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white" placeholder="e.g. Friday Night Gaming"/>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                            <div onClick={() => setIsRoomPrivate(!isRoomPrivate)} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isRoomPrivate ? 'bg-primary' : 'bg-gray-700'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isRoomPrivate ? 'translate-x-6' : 'translate-x-0'}`}/>
                            </div>
                            <span className="text-sm font-medium">{isRoomPrivate ? 'Private' : 'Public Room'}</span>
                        </div>
                        {isRoomPrivate && (
                             <input type="password" value={newRoomPassword} onChange={e => setNewRoomPassword(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white" placeholder="Secret Key"/>
                        )}
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-lg font-bold text-gray-400 hover:bg-gray-800">Cancel</button>
                            <button onClick={handleCreateRoom} disabled={isCreatingRoom || !newRoomName} className="flex-1 py-3 rounded-lg font-bold bg-primary text-white">
                                {isCreatingRoom ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;