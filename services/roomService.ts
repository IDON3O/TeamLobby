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

export const subscribeToUserProfile = (userId: string, callback: (user: Partial<User>) => void) => {
    if (!db) return () => {};
    const ref = db.ref(`${USERS_REF}/${userId}`);
    const listener = ref.on('value', (snap) => {
        if (snap.exists()) callback(snap.val());
    });
    return () => ref.off('value', listener);
};

// --- GESTIÓN DE SALA ---

export const createRoom = async (host: User, roomName: string, password?: string): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const hostData = {
        ...host,
        nickname: host.nickname || host.alias,
        isReady: false
    };

    const newRoom: Room = {
        code,
        name: roomName || `Room ${code}`,
        isPrivate: !!password,
        password: password || "",
        hostId: host.id,
        members: [hostData],
        gameQueue: [],
        createdAt: Date.now(),
        chatHistory: [{
            id: 'init',
            userId: 'system',
            userName: 'System',
            content: `Room created by ${hostData.nickname}.`,
            timestamp: Date.now(),
            isSystem: true
        }],
    };

    await roomRef.set(newRoom);
    await updateVisitedRooms(host.id, {
        code,
        name: newRoom.name || '',
        hostAlias: hostData.nickname,
        lastVisited: Date.now()
    });

    return code;
};

export const deleteRoom = async (code: string) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}`).remove();
};

const updateVisitedRooms = async (userId: string, summary: RoomSummary) => {
    if (!db || userId.startsWith('guest')) return;
    await db.ref(`${USERS_REF}/${userId}/visitedRooms/${summary.code}`).set(summary);
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

    const userDataToStore = {
        ...user,
        nickname: user.nickname || user.alias
    };

    const membersRef = roomRef.child('members');
    await membersRef.transaction((members) => {
        const mArray = Array.isArray(members) ? members : Object.values(members || {});
        const index = mArray.findIndex((m: User) => m.id === user.id);
        if (index === -1) {
            mArray.push(userDataToStore);
        } else {
            // Actualizar solo datos de perfil, mantener estado de "listo" si ya estaba
            mArray[index] = { ...mArray[index], ...userDataToStore };
        }
        return mArray;
    });

    await updateVisitedRooms(user.id, {
        code,
        name: roomData.name || '',
        hostAlias: (roomData.members?.[0]?.nickname || roomData.members?.[0]?.alias || 'Host'),
        lastVisited: Date.now()
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

// --- GESTIÓN DE JUEGOS ---

export const addGameToRoom = async (code: string, game: Game, user: User) => {
    if (!db) return;
    
    // Si permite contribución global, pasa aprobado a la biblioteca automáticamente
    const isAutoApproved = user.allowGlobalLibrary || user.isAdmin;
    const status = isAutoApproved ? 'approved' : 'pending';
    
    const gameWithMeta: Game = { 
        ...game, 
        proposedBy: user.id, 
        status: status,
        votedBy: [user.id] 
    };

    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    await queueRef.transaction((queue) => {
        const qArray = Array.isArray(queue) ? queue : Object.values(queue || {});
        qArray.push(gameWithMeta);
        return qArray;
    });

    if (isAutoApproved) {
        await approveGame(gameWithMeta);
    }
};

export const updateGameInRoom = async (code: string, gameId: string, updatedData: Partial<Game>) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    await queueRef.transaction((queue) => {
        const qArray = Array.isArray(queue) ? queue : Object.values(queue || {});
        return qArray.map((g: Game) => g.id === gameId ? { ...g, ...updatedData } : g);
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
    if (!snap.exists()) return [];
    const data = snap.val();
    return (Object.values(data) as RoomSummary[]).sort((a, b) => b.lastVisited - a.lastVisited);
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