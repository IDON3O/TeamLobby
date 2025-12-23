
import { db } from "../firebaseConfig";
import { Room, Game, User, Message, RoomSummary, Comment } from "../types";

const ROOMS_REF = "rooms";
const USERS_REF = "users";
const GLOBAL_LIBRARY_REF = "library";

// --- PERFIL USUARIO ---

export const updateUserProfile = async (userId: string, data: Partial<User>) => {
    if (!db || !userId) return;
    await db.ref(`${USERS_REF}/${userId}`).update(data);
};

export const subscribeToUserProfile = (userId: string, callback: (user: Partial<User>) => void) => {
    if (!db || !userId) return () => {};
    const ref = db.ref(`${USERS_REF}/${userId}`);
    const listener = ref.on('value', (snap) => {
        if (snap.exists()) callback(snap.val());
    });
    return () => ref.off('value', listener);
};

// --- GESTIÓN DE SALA ---

/**
 * Limpia duplicados en la base de datos para una sala específica.
 * Busca miembros que tengan el mismo ID pero diferentes llaves en Firebase.
 */
export const cleanupRoomMembers = async (code: string) => {
    if (!db) return;
    const membersRef = db.ref(`${ROOMS_REF}/${code}/members`);
    const snapshot = await membersRef.once('value');
    if (!snapshot.exists()) return;

    const data = snapshot.val();
    // Si es un array (error común de Firebase al ver llaves numéricas o push IDs), lo convertimos
    const rawEntries = Object.entries(data);
    const seenIds = new Set<string>();
    const updates: any = {};
    let hasChanges = false;

    // Iteramos para identificar duplicados y llaves incorrectas
    rawEntries.forEach(([key, value]: [string, any]) => {
        if (!value || !value.id) {
            updates[key] = null; // Borrar basura
            hasChanges = true;
            return;
        }

        // Si la llave no coincide con el ID del usuario, o si ya vimos este ID
        if (key !== value.id || seenIds.has(value.id)) {
            updates[key] = null; // Marcamos para borrar la entrada duplicada/incorrecta
            hasChanges = true;
        }
        
        // Aseguramos que la entrada correcta exista
        if (!seenIds.has(value.id)) {
            updates[value.id] = value;
            seenIds.add(value.id);
        }
    });

    if (hasChanges) {
        await membersRef.update(updates);
    }
};

export const createRoom = async (host: User, roomName: string, password?: string): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const hostData = {
        ...host,
        nickname: host.nickname || host.alias,
        isReady: false
    };

    const newRoom: any = {
        code,
        name: roomName || `Room ${code}`,
        isPrivate: !!password,
        password: password || "",
        hostId: host.id,
        members: {
            [host.id]: hostData
        },
        gameQueue: {},
        createdAt: Date.now(),
        chatHistory: {
            'init': {
                id: 'init',
                userId: 'system',
                userName: 'System',
                content: `Room created by ${hostData.nickname}.`,
                timestamp: Date.now(),
                isSystem: true
            }
        },
    };

    await roomRef.set(newRoom);
    db.ref(`${ROOMS_REF}/${code}/members/${host.id}/isReady`).onDisconnect().set(false);

    await updateVisitedRooms(host.id, {
        code,
        name: newRoom.name || '',
        hostAlias: hostData.nickname,
        lastVisited: Date.now(),
        savedPassword: password || ""
    });

    return code;
};

export const deleteRoom = async (code: string) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}`).remove();
};

export const leaveRoomCleanly = async (code: string, userId: string) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/members/${userId}`).update({ isReady: false });
};

const updateVisitedRooms = async (userId: string, summary: RoomSummary) => {
    if (!db || !userId || userId.startsWith('guest')) return;
    await db.ref(`${USERS_REF}/${userId}/visitedRooms/${summary.code}`).set(summary);
};

export const joinRoom = async (code: string, user: User, passwordAttempt?: string): Promise<{success: boolean, message?: string}> => {
    if (!db) throw new Error("Database not initialized");
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) return { success: false, message: "Room not found" };

    const roomData = snapshot.val();
    
    if (roomData.isPrivate && roomData.hostId !== user.id) {
        if (roomData.password !== passwordAttempt) {
            return { success: false, message: "Invalid Password" };
        }
    }

    const userDataToStore = {
        ...user,
        nickname: user.nickname || user.alias,
        isReady: false 
    };

    // Al unirse, forzamos limpieza de duplicados previos
    await cleanupRoomMembers(code);

    const memberRef = db.ref(`${ROOMS_REF}/${code}/members/${user.id}`);
    await memberRef.set(userDataToStore); 
    memberRef.child('isReady').onDisconnect().set(false);

    await updateVisitedRooms(user.id, {
        code,
        name: roomData.name || '',
        hostAlias: roomData.members?.[roomData.hostId]?.nickname || 'Host',
        lastVisited: Date.now(),
        savedPassword: passwordAttempt || ""
    });

    return { success: true };
};

export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Transformación robusta: Firebase a veces devuelve arrays si las llaves son numéricas
            const parseCollection = (obj: any) => {
                if (!obj) return [];
                if (Array.isArray(obj)) return obj.filter(Boolean);
                return Object.values(obj);
            };

            const membersList = parseCollection(data.members);
            
            // Deduplicación en caliente para el estado de la UI
            const uniqueMembersMap = new Map();
            membersList.forEach((m: any) => {
                if (m && m.id) uniqueMembersMap.set(m.id, m);
            });

            callback({
                ...data,
                members: Array.from(uniqueMembersMap.values()),
                gameQueue: parseCollection(data.gameQueue),
                chatHistory: parseCollection(data.chatHistory)
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
    const isAutoApproved = user.allowGlobalLibrary || user.isAdmin;
    const status = isAutoApproved ? 'approved' : 'pending';
    const gameId = game.id || `game-${Date.now()}`;
    const gameWithMeta: Game = { ...game, id: gameId, proposedBy: user.id, status: status, votedBy: [user.id] };
    
    await db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}`).set(gameWithMeta);
    if (isAutoApproved) await approveGame(gameWithMeta);
};

export const updateGameInRoom = async (code: string, gameId: string, updatedData: Partial<Game>) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}`).update(updatedData);
};

export const approveGame = async (game: Game) => {
    if (!db) return;
    const libRef = db.ref(`${GLOBAL_LIBRARY_REF}/${game.id}`);
    await libRef.set({ ...game, status: 'approved' });
};

export const addCommentToGame = async (roomCode: string, gameId: string, comment: Comment) => {
    if (!db) return;
    const commentId = comment.id || `comment-${Date.now()}`;
    await db.ref(`${ROOMS_REF}/${roomCode}/gameQueue/${gameId}/comments/${commentId}`).set(comment);
};

export const toggleUserReadyState = async (code: string, userId: string) => {
    if (!db) return;
    const memberReadyRef = db.ref(`${ROOMS_REF}/${code}/members/${userId}/isReady`);
    const snap = await memberReadyRef.once('value');
    const currentStatus = snap.val() || false;
    
    // Primero limpiamos posibles duplicados para que el toggle sea sobre el nodo correcto
    await cleanupRoomMembers(code);
    await memberReadyRef.set(!currentStatus);
};

// --- HELPERS ADMIN & PUBLIC ---

export const getFeaturedRooms = async (limit: number = 4): Promise<Room[]> => {
    if (!db) return [];
    const snapshot = await db.ref(ROOMS_REF).once('value');
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    const allRooms = Object.values(data).map((r: any) => ({
        ...r,
        members: r.members ? Object.values(r.members) : [],
        gameQueue: r.gameQueue ? Object.values(r.gameQueue) : []
    })) as Room[];

    const scoredRooms = allRooms
        .filter(r => !r.isPrivate)
        .map(room => {
            const memberCount = room.members?.length || 0;
            const nonSelfVotes = room.gameQueue.reduce((acc, game) => {
                const votes = game.votedBy?.length || 0;
                return acc + Math.max(0, votes - 1);
            }, 0);
            
            const popularityScore = (memberCount * 5) + nonSelfVotes;
            return { ...room, popularityScore };
        });

    return scoredRooms
        .sort((a: any, b: any) => (b.popularityScore || 0) - (a.popularityScore || 0))
        .slice(0, limit);
};

export const subscribeToAllUsers = (callback: (users: User[]) => void) => {
    if (!db) return () => {};
    const ref = db.ref(USERS_REF);
    const listener = ref.on('value', snap => {
        const data = snap.val();
        if (!data) { callback([]); return; }
        const userList = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id: id })).filter(u => (u.alias || u.nickname) && u.avatarUrl);
        callback(userList);
    });
    return () => ref.off('value', listener);
};

export const getUserRooms = async (userId: string): Promise<RoomSummary[]> => {
    if (!db || !userId) return [];
    const snap = await db.ref(`${USERS_REF}/${userId}/visitedRooms`).once('value');
    if (!snap.exists()) return [];
    const data = snap.val();
    const summaries = Object.values(data) as RoomSummary[];
    const validSummaries: RoomSummary[] = [];
    for (const s of summaries) {
        const rSnap = await db.ref(`${ROOMS_REF}/${s.code}`).once('value');
        if (rSnap.exists()) { validSummaries.push(s); } else { await db.ref(`${USERS_REF}/${userId}/visitedRooms/${s.code}`).remove(); }
    }
    return validSummaries.sort((a, b) => b.lastVisited - a.lastVisited);
};

export const voteForGame = async (code: string, gameId: string, userId: string) => {
    if (!db) return;
    const votesRef = db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}/votedBy`);
    const snap = await votesRef.once('value');
    const votes = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];
    
    if (votes.includes(userId)) {
        await votesRef.set(votes.filter((id: string) => id !== userId));
    } else {
        await votesRef.set([...votes, userId]);
    }
};

export const sendChatMessage = async (code: string, message: Message) => {
    if (!db) return;
    const msgId = message.id || `msg-${Date.now()}`;
    await db.ref(`${ROOMS_REF}/${code}/chatHistory/${msgId}`).set(message);
};

export const removeGameFromRoom = async (code: string, gameId: string, userId: string, isAdmin: boolean) => {
    if (!db) return;
    const gameRef = db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}`);
    const snap = await gameRef.once('value');
    if (snap.exists()) {
        const game = snap.val();
        if (isAdmin || game.proposedBy === userId) {
            await gameRef.remove();
        }
    }
};

export const getAllRooms = async (): Promise<Room[]> => {
    if (!db) return [];
    const snapshot = await db.ref(ROOMS_REF).once('value');
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).map((r: any) => ({
        ...r,
        members: r.members ? Object.values(r.members) : [],
        gameQueue: r.gameQueue ? Object.values(r.gameQueue) : [],
        chatHistory: r.chatHistory ? Object.values(r.chatHistory) : []
    }));
};

export const toggleBanUser = async (userId: string, isBanned: boolean) => {
    if (!db || !userId) return;
    await db.ref(`${USERS_REF}/${userId}`).update({ isBanned });
};

export const toggleMuteUser = async (userId: string, isMuted: boolean) => {
    if (!db || !userId) return;
    await db.ref(`${USERS_REF}/${userId}`).update({ isMuted });
};
