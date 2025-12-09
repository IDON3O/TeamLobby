import { db } from "../firebaseConfig";
import { Room, Game, User, Message, RoomSummary } from "../types";

const ROOMS_REF = "rooms";
const USERS_REF = "users";

const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// --- CREACIÓN Y UNIÓN ---

export const createRoom = async (host: User, roomName: string, password?: string): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    if (host.isGuest) throw new Error("Guests cannot create rooms");
    
    const code = generateRoomCode();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const snapshot = await roomRef.once('value');
    if (snapshot.exists()) return createRoom(host, roomName, password);

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
            content: `Room created by ${host.alias}.`,
            timestamp: Date.now(),
            isSystem: true
        }],
    };

    await roomRef.set(newRoom);
    await saveRoomToHistory(host.id, newRoom);
    return code;
};

export const checkRoomPassword = async (code: string, passwordAttempt: string): Promise<boolean> => {
    if (!db) return false;
    const snapshot = await db.ref(`${ROOMS_REF}/${code}`).once('value');
    if (!snapshot.exists()) return false;
    const room = snapshot.val();
    if (!room.isPrivate) return true;
    return room.password === passwordAttempt;
};

export const joinRoom = async (code: string, user: User, passwordAttempt?: string): Promise<{success: boolean, message?: string}> => {
    if (!db) throw new Error("Database not initialized");
    
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const snapshot = await roomRef.once('value');
    
    if (!snapshot.exists()) return { success: false, message: "Room not found" };

    const roomData = snapshot.val();

    // Validar contraseña si es privada y no es el host reconectando
    if (roomData.isPrivate && roomData.hostId !== user.id) {
        if (roomData.password !== passwordAttempt) {
             return { success: false, message: "Invalid Password" };
        }
    }

    await roomRef.child('members').transaction((members) => {
        if (members) {
            const membersArray = Array.isArray(members) ? members : Object.values(members);
            const exists = membersArray.some((m: User) => m.id === user.id);
            if (!exists) {
                if (Array.isArray(members)) members.push(user);
                else return [...membersArray, user];
            }
        } else {
            return [user];
        }
        return members;
    });

    if (!user.isGuest) {
        await saveRoomToHistory(user.id, roomData);
    }

    return { success: true };
};

// --- HISTORIAL ---

const saveRoomToHistory = async (userId: string, room: Room) => {
    if (!db) return;
    const historyRef = db.ref(`${USERS_REF}/${userId}/visitedRooms/${room.code}`);
    await historyRef.set({
        code: room.code,
        name: room.name || room.code,
        lastVisited: Date.now(),
        hostAlias: room.members[0]?.alias || 'Unknown'
    });
};

export const getUserRooms = async (userId: string): Promise<RoomSummary[]> => {
    if (!db) return [];
    const snapshot = await db.ref(`${USERS_REF}/${userId}/visitedRooms`).once('value');
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).sort((a: any, b: any) => b.lastVisited - a.lastVisited) as RoomSummary[];
};

// --- GESTIÓN DE JUEGOS ---

export const addGameToRoom = async (code: string, game: Game, user: User) => {
    if (!db) return;
    if (user.isGuest) throw new Error("Guests cannot propose games.");

    // Aseguramos que tenga el proposedBy
    const gameWithProposer = { ...game, proposedBy: user.id };

    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    await queueRef.transaction((queue) => {
        if (queue) {
             const qArray = Array.isArray(queue) ? queue : Object.values(queue);
             qArray.push(gameWithProposer);
             return qArray;
        } else {
            return [gameWithProposer];
        }
    });
};

export const removeGameFromRoom = async (code: string, gameId: string, userId: string, isAdmin: boolean) => {
     if (!db) return;
     const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
     
     await queueRef.transaction((queue) => {
         if (!queue) return queue;
         const qArray = Array.isArray(queue) ? queue : Object.values(queue);
         
         const game = qArray.find((g: Game) => g.id === gameId);
         if (!game) return qArray;

         // Regla: Solo el que lo propuso o un Admin puede borrarlo
         // Nota: Manejamos juegos antiguos sin 'proposedBy' permitiendo al admin borrarlos o a cualquiera (fallback)
         const canDelete = isAdmin || game.proposedBy === userId || !game.proposedBy;

         if (canDelete) {
             return qArray.filter((g: Game) => g.id !== gameId);
         }
         return qArray;
     });
}

// --- CORE ---

export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};

    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            const safeMembers = data.members 
                ? (Array.isArray(data.members) ? data.members : Object.values(data.members)) 
                : [];
            
            let safeQueue = data.gameQueue 
                ? (Array.isArray(data.gameQueue) ? data.gameQueue : Object.values(data.gameQueue)) 
                : [];
            
            safeQueue = safeQueue.map((g: any) => ({
                ...g,
                votedBy: Array.isArray(g.votedBy) ? g.votedBy : [] 
            }));

            const safeChat = data.chatHistory 
                ? (Array.isArray(data.chatHistory) ? data.chatHistory : Object.values(data.chatHistory)) 
                : [];

            const room: Room = {
                ...data,
                members: safeMembers,
                gameQueue: safeQueue,
                chatHistory: safeChat
            };
            callback(room);
        }
    });

    return () => roomRef.off('value', listener);
};

export const voteForGame = async (code: string, gameId: string, userId: string) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);

    await queueRef.transaction((queue) => {
        if (!queue) return queue;

        const qArray = Array.isArray(queue) ? queue : Object.values(queue);
        const index = qArray.findIndex((g: Game) => g.id === gameId);
        
        if (index !== -1) {
            const game = qArray[index];
            const votes = Array.isArray(game.votedBy) ? game.votedBy : [];
            const hasVoted = votes.includes(userId);
            if (hasVoted) {
                game.votedBy = votes.filter((id: string) => id !== userId);
            } else {
                game.votedBy = [...votes, userId];
            }
            qArray.sort((a: Game, b: Game) => {
                const lenA = a.votedBy ? a.votedBy.length : 0;
                const lenB = b.votedBy ? b.votedBy.length : 0;
                return lenB - lenA;
            });
        }
        return qArray;
    });
};

export const sendChatMessage = async (code: string, message: Message) => {
    if (!db) return;
    const chatRef = db.ref(`${ROOMS_REF}/${code}/chatHistory`);
    
    await chatRef.transaction((history) => {
        if (history) {
            const hArray = Array.isArray(history) ? history : Object.values(history);
            hArray.push(message);
            return hArray;
        } else {
            return [message];
        }
    });
};

export const toggleUserReadyState = async (code: string, userId: string) => {
    if (!db) return;
    const membersRef = db.ref(`${ROOMS_REF}/${code}/members`);
    await membersRef.transaction((members) => {
        if (!members) return members;
        const mArray = Array.isArray(members) ? members : Object.values(members);
        return mArray.map((m: User) => {
            if (m.id === userId) return { ...m, isReady: !m.isReady };
            return m;
        });
    });
};

// --- ADMIN FEATURES ---

export const subscribeToAllUsers = (callback: (users: User[]) => void) => {
    if (!db) return () => {};
    const usersRef = db.ref(USERS_REF);
    const listener = usersRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const usersList = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            callback(usersList);
        } else {
            callback([]);
        }
    });
    return () => usersRef.off('value', listener);
};

export const toggleBanUser = async (userId: string, currentStatus: boolean) => {
    if (!db) return;
    await db.ref(`${USERS_REF}/${userId}`).update({ isBanned: !currentStatus });
};

export const toggleMuteUser = async (userId: string, currentStatus: boolean) => {
    if (!db) return;
    await db.ref(`${USERS_REF}/${userId}`).update({ isMuted: !currentStatus });
};

export const getAllRooms = async (): Promise<Room[]> => {
    if (!db) return [];
    const snapshot = await db.ref(ROOMS_REF).once('value');
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as Room[];
    }
    return [];
}