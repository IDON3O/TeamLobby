
import { db } from "../firebaseConfig";
import { Room, Game, User, Message, RoomSummary, Comment } from "../types";

const ROOMS_REF = "rooms";
const USERS_REF = "users";
const GLOBAL_LIBRARY_REF = "library";

// --- PERFIL USUARIO ---

export const updateUserProfile = async (userId: string, data: Partial<User>) => {
    if (!db) return;
    await db.ref(`${USERS_REF}/${userId}`).update(data);
};

// --- GESTIÓN DE SALA ---

export const createRoom = async (host: User, roomName: string, password?: string): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const newRoom: Room = {
        code,
        name: roomName || `Room ${code}`,
        isPrivate: !!password,
        password: password || "",
        hostId: host.id,
        members: [host],
        gameQueue: [],
        createdAt: Date.now(),
        chatHistory: [{
            id: 'init',
            userId: 'system',
            userName: 'System',
            content: `Room created by ${host.nickname || host.alias}.`,
            timestamp: Date.now(),
            isSystem: true
        }],
    };

    await roomRef.set(newRoom);
    
    return code;
};

export const joinRoom = async (code: string, user: User, passwordAttempt?: string): Promise<{success: boolean, message?: string}> => {
    if (!db) throw new Error("Database not initialized");
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) return { success: false, message: "Room not found" };

    const roomData = snapshot.val();
    if (roomData.isPrivate && roomData.hostId !== user.id && roomData.password !== passwordAttempt) {
        return { success: false, message: "Invalid Password" };
    }

    const membersRef = roomRef.child('members');
    
    await membersRef.transaction((members) => {
        const mArray = Array.isArray(members) ? members : Object.values(members || {});
        const exists = mArray.some((m: User) => m.id === user.id);
        if (!exists) mArray.push(user);
        return mArray;
    });

    // Cleanup on disconnect
    membersRef.on('value', (snap) => {
        const mArray = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val() || {});
        const index = mArray.findIndex((m: User) => m.id === user.id);
        if (index !== -1) {
            membersRef.child(index.toString()).onDisconnect().remove();
        }
    });

    return { success: true };
};

export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            callback({
                ...data,
                members: Array.isArray(data.members) ? data.members : Object.values(data.members || {}),
                gameQueue: Array.isArray(data.gameQueue) ? data.gameQueue : Object.values(data.gameQueue || {}),
                chatHistory: Array.isArray(data.chatHistory) ? data.chatHistory : Object.values(data.chatHistory || {})
            });
        } else {
            // @ts-ignore
            callback(null);
        }
    });
    return () => roomRef.off('value', listener);
};

// --- GESTIÓN DE JUEGOS & APROBACIÓN ---

export const addGameToRoom = async (code: string, game: Game, user: User) => {
    if (!db) return;
    const gameWithMeta: Game = { 
        ...game, 
        proposedBy: user.id, 
        status: user.isAdmin ? 'approved' : 'pending',
        votedBy: [user.id] 
    };

    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    await queueRef.transaction((queue) => {
        const qArray = Array.isArray(queue) ? queue : Object.values(queue || {});
        qArray.push(gameWithMeta);
        return qArray;
    });
};

export const approveGame = async (game: Game) => {
    if (!db) return;
    const libRef = db.ref(`${GLOBAL_LIBRARY_REF}/${game.id}`);
    await libRef.set({ ...game, status: 'approved' });
};

export const addCommentToGame = async (roomCode: string, gameId: string, comment: Comment) => {
    if (!db) return;
    const roomRef = db.ref(`${ROOMS_REF}/${roomCode}/gameQueue`);
    await roomRef.transaction((queue) => {
        const qArray = Array.isArray(queue) ? queue : Object.values(queue || {});
        return qArray.map((g: Game) => {
            if (g.id === gameId) {
                const comments = Array.isArray(g.comments) ? g.comments : Object.values(g.comments || {});
                comments.push(comment);
                return { ...g, comments };
            }
            return g;
        });
    });
};

export const toggleUserReadyState = async (code: string, userId: string) => {
    if (!db) return;
    const membersRef = db.ref(`${ROOMS_REF}/${code}/members`);
    await membersRef.transaction((members) => {
        const mArray = Array.isArray(members) ? members : Object.values(members || {});
        return mArray.map((m: User) => {
            if (m.id === userId) return { ...m, isReady: !m.isReady };
            return m;
        });
    });
};

// --- HELPERS ADMIN ---

export const subscribeToAllUsers = (callback: (users: User[]) => void) => {
    if (!db) return () => {};
    const ref = db.ref(USERS_REF);
    const listener = ref.on('value', snap => {
        const data = snap.val();
        callback(data ? Object.values(data) : []);
    });
    return () => ref.off('value', listener);
};

export const getUserRooms = async (userId: string): Promise<RoomSummary[]> => {
    if (!db) return [];
    const snap = await db.ref(`${USERS_REF}/${userId}/visitedRooms`).once('value');
    return snap.exists() ? Object.values(snap.val()) : [];
};

export const voteForGame = async (code: string, gameId: string, userId: string) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    await queueRef.transaction((queue) => {
        const qArray = Array.isArray(queue) ? queue : Object.values(queue || {});
        return qArray.map((g: Game) => {
            if (g.id === gameId) {
                const votes = Array.isArray(g.votedBy) ? g.votedBy : Object.values(g.votedBy || {});
                const hasVoted = votes.includes(userId);
                return { ...g, votedBy: hasVoted ? votes.filter(id => id !== userId) : [...votes, userId] };
            }
            return g;
        });
    });
};

export const sendChatMessage = async (code: string, message: Message) => {
    if (!db) return;
    const chatRef = db.ref(`${ROOMS_REF}/${code}/chatHistory`);
    await chatRef.transaction((history) => {
        const hArray = Array.isArray(history) ? history : Object.values(history || {});
        hArray.push(message);
        return hArray;
    });
};

export const removeGameFromRoom = async (code: string, gameId: string, userId: string, isAdmin: boolean) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    await queueRef.transaction((queue) => {
        const qArray = Array.isArray(queue) ? queue : Object.values(queue || {});
        const game = qArray.find((g: Game) => g.id === gameId);
        if (isAdmin || game?.proposedBy === userId) {
            return qArray.filter((g: Game) => g.id !== gameId);
        }
        return qArray;
    });
};

export const getAllRooms = async (): Promise<Room[]> => {
    if (!db) return [];
    const snapshot = await db.ref(ROOMS_REF).once('value');
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).map((r: any) => ({
        ...r,
        members: Array.isArray(r.members) ? r.members : Object.values(r.members || {}),
        gameQueue: Array.isArray(r.gameQueue) ? r.gameQueue : Object.values(r.gameQueue || {}),
        chatHistory: Array.isArray(r.chatHistory) ? r.chatHistory : Object.values(r.chatHistory || {})
    }));
};

export const toggleBanUser = async (userId: string, isBanned: boolean) => {
    if (!db) return;
    await db.ref(`${USERS_REF}/${userId}`).update({ isBanned });
};

export const toggleMuteUser = async (userId: string, isMuted: boolean) => {
    if (!db) return;
    await db.ref(`${USERS_REF}/${userId}`).update({ isMuted });
};
