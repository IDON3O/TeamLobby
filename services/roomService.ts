
import { db } from "../firebaseConfig";
import { Room, Game, User, Message, RoomSummary, Comment, ReadySession } from "../types";

const ROOMS_REF = "rooms";
const USERS_REF = "users";
const SETTINGS_REF = "settings";
const GLOBAL_LIBRARY_REF = "library";

// --- CONFIGURACIÓN GLOBAL ---
export const subscribeToSettings = (callback: (settings: any) => void) => {
    if (!db) return () => {};
    const ref = db.ref(SETTINGS_REF);
    const listener = ref.on('value', (snap) => {
        callback(snap.val() || { communityHubCode: "UC2PI" });
    });
    return () => ref.off('value', listener);
};

export const updateSettings = async (settings: any) => {
    if (!db) return;
    await db.ref(SETTINGS_REF).update(settings);
};

// --- GESTIÓN DE SALA ---
export const cleanupRoomMembers = async (code: string) => {
    if (!db) return;
    const membersRef = db.ref(`${ROOMS_REF}/${code}/members`);
    const snapshot = await membersRef.once('value');
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const updates: any = {};
    let hasChanges = false;
    Object.entries(data).forEach(([key, value]: [string, any]) => {
        if (!value || typeof value !== 'object' || !value.id || key !== value.id) {
            updates[key] = null;
            hasChanges = true;
        }
    });
    if (hasChanges) await membersRef.update(updates);
};

export const createRoom = async (host: User, roomName: string, password?: string): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const hostData = { ...host, nickname: host.nickname || host.alias || "Gamer", isReady: false };
    const newRoom: any = {
        code, name: roomName || `Room ${code}`, isPrivate: !!password, password: password || "", hostId: host.id,
        members: { [host.id]: hostData }, gameQueue: {}, createdAt: Date.now(),
        chatHistory: { 'init': { id: 'init', userId: 'system', userName: 'System', content: `Room created by ${hostData.nickname}.`, timestamp: Date.now(), isSystem: true } },
        readySession: { type: 'roulette', status: 'idle', suggestions: {}, votes: {}, active: false }
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
    if (roomData.isPrivate && roomData.hostId !== user.id && roomData.password !== passwordAttempt) return { success: false, message: "Invalid Password" };
    const userDataToStore = { ...user, nickname: user.nickname || user.alias || "Gamer", isReady: false };
    await cleanupRoomMembers(code);
    await db.ref(`${ROOMS_REF}/${code}/members/${user.id}`).set(userDataToStore); 
    return { success: true };
};

export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const parseCollection = (obj: any) => {
                if (!obj) return [];
                const items = Array.isArray(obj) ? obj : Object.values(obj);
                return items.filter(i => i && typeof i === 'object');
            };
            const membersList = parseCollection(data.members);
            const uniqueMembersMap = new Map();
            membersList.forEach((m: any) => { if (m?.id) uniqueMembersMap.set(m.id, m); });
            callback({ ...data, 
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

export const toggleUserReadyState = async (code: string, userId: string, forcedValue?: boolean) => {
    if (!db) return;
    const memberReadyRef = db.ref(`${ROOMS_REF}/${code}/members/${userId}/isReady`);
    if (forcedValue !== undefined) {
        await memberReadyRef.set(forcedValue);
    } else {
        const snap = await memberReadyRef.once('value');
        await memberReadyRef.set(!(snap.val() || false));
    }
};

// --- READY SESSION ACTIONS ---

export const startReadyActivity = async (code: string, type: 'roulette' | 'voting') => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/readySession`).set({
        type, status: 'collecting', suggestions: {}, votes: {}, active: true
    });
};

export const submitReadySuggestion = async (code: string, userId: string, userName: string, gameId: string, gameTitle: string) => {
    if (!db) return;
    // Forzar estado Ready al proponer
    await toggleUserReadyState(code, userId, true);
    // Un juego por usuario (sobreescribe si ya existe)
    await db.ref(`${ROOMS_REF}/${code}/readySession/suggestions/${userId}`).set({
        gameId, gameTitle, userName
    });
};

export const submitReadyVote = async (code: string, voterId: string, gameId: string) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/readySession/votes/${voterId}`).set(gameId);
};

export const resolveReadyActivity = async (code: string) => {
    if (!db) return;
    const ref = db.ref(`${ROOMS_REF}/${code}/readySession`);
    const snap = await ref.once('value');
    if (!snap.exists()) return;
    const session = snap.val() as ReadySession;
    const suggestions = Object.values(session.suggestions || {});
    
    if (suggestions.length === 0) {
        await ref.update({ status: 'idle', active: false });
        return;
    }

    if (session.type === 'roulette') {
        const winner = suggestions[Math.floor(Math.random() * suggestions.length)];
        await ref.update({ status: 'results', winner: winner.gameId });
    } else {
        // Lógica de Votación: No se cuenta el voto propio si existiera (aunque la UI lo bloquea)
        const votesMap = session.votes || {};
        const suggestionsMap = session.suggestions || {};
        const counts: Record<string, number> = {};
        
        Object.entries(votesMap).forEach(([voterId, gameId]) => {
            // Validación extra: no contar si votó por su propia sugerencia
            if (suggestionsMap[voterId]?.gameId !== gameId) {
                counts[gameId] = (counts[gameId] || 0) + 1;
            }
        });
        
        let max = 0;
        suggestions.forEach(s => { if ((counts[s.gameId] || 0) > max) max = counts[s.gameId] || 0; });
        
        // Manejo de empates: todos los que tengan el max de votos
        const winners = suggestions.filter(s => (counts[s.gameId] || 0) === max).map(s => s.gameId);
        
        // Si hay un solo ganador se guarda como string, si hay varios como array
        await ref.update({ 
            status: 'results', 
            winner: winners.length === 1 ? winners[0] : winners 
        });
    }
};

export const resetReadyActivity = async (code: string) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/readySession`).update({
        status: 'idle', active: false, suggestions: {}, votes: {}, winner: null
    });
};

// --- GESTIÓN DE JUEGOS ---
export const addGameToRoom = async (code: string, game: Game, user: User) => {
    if (!db) return;
    const gameId = game.id || `game-${Date.now()}`;
    const gameWithMeta: Game = { ...game, id: gameId, proposedBy: user.id, status: user.isAdmin ? 'approved' : 'pending', votedBy: [user.id] };
    await db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}`).set(gameWithMeta);
};

export const voteForGame = async (code: string, gameId: string, userId: string) => {
    if (!db) return;
    const votesRef = db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}/votedBy`);
    const snap = await votesRef.once('value');
    const votes = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];
    if (votes.includes(userId)) await votesRef.set(votes.filter((id: string) => id !== userId));
    else await votesRef.set([...votes, userId]);
};

export const sendChatMessage = async (code: string, message: Message) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/chatHistory/${message.id}`).set(message);
};

export const leaveRoomCleanly = async (code: string, userId: string) => {
    if (!db) return;
    await db.ref(`${ROOMS_REF}/${code}/members/${userId}/isReady`).set(false);
};

export const deleteRoom = async (code: string) => { if (db) await db.ref(`${ROOMS_REF}/${code}`).remove(); };
export const updateUserProfile = async (userId: string, data: Partial<User>) => { if (db) await db.ref(`${USERS_REF}/${userId}`).update(data); };
export const subscribeToUserProfile = (userId: string, callback: (user: Partial<User>) => void) => { if (!db) return () => {}; const ref = db.ref(`${USERS_REF}/${userId}`); const listener = ref.on('value', snap => { if (snap.exists()) callback(snap.val()); }); return () => ref.off('value', listener); };
export const approveGame = async (game: Game) => { if (db) await db.ref(`${GLOBAL_LIBRARY_REF}/${game.id}`).set({ ...game, status: 'approved' }); };
export const updateGameInRoom = async (code: string, gameId: string, data: Partial<Game>) => { if (db) await db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}`).update(data); };
export const addCommentToGame = async (roomCode: string, gameId: string, comment: Comment) => { if (db) await db.ref(`${ROOMS_REF}/${roomCode}/gameQueue/${gameId}/comments/${comment.id}`).set(comment); };
export const removeGameFromRoom = async (code: string, gameId: string, userId: string, isAdmin: boolean) => { if (!db) return; const ref = db.ref(`${ROOMS_REF}/${code}/gameQueue/${gameId}`); const snap = await ref.once('value'); if (snap.exists() && (isAdmin || snap.val().proposedBy === userId)) await ref.remove(); };
export const getAllRooms = async (): Promise<Room[]> => { if (!db) return []; const snap = await db.ref(ROOMS_REF).once('value'); if (!snap.exists()) return []; return Object.values(snap.val()).map((r: any) => ({ ...r, members: Object.values(r.members || {}), gameQueue: Object.values(r.gameQueue || {}), chatHistory: Object.values(r.chatHistory || {}) })); };
export const toggleBanUser = async (userId: string, isBanned: boolean) => { if (db) await db.ref(`${USERS_REF}/${userId}`).update({ isBanned }); };
export const toggleMuteUser = async (userId: string, isMuted: boolean) => { if (db) await db.ref(`${USERS_REF}/${userId}`).update({ isMuted }); };
export const subscribeToAllUsers = (callback: (users: User[]) => void) => { if (!db) return () => {}; const ref = db.ref(USERS_REF); const listener = ref.on('value', snap => { const data = snap.val(); if (!data) { callback([]); return; } const userList = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id: id })).filter(u => (u.alias || u.nickname) && u.avatarUrl); callback(userList); }); return () => ref.off('value', listener); };
export const getUserRooms = async (userId: string): Promise<RoomSummary[]> => { if (!db || !userId) return []; const snap = await db.ref(`${USERS_REF}/${userId}/visitedRooms`).once('value'); if (!snap.exists()) return []; const data = snap.val(); return Object.values(data) as RoomSummary[]; };

export const getFeaturedRooms = async (limit: number = 4): Promise<Room[]> => {
    if (!db) return [];
    const snap = await db.ref(ROOMS_REF).limitToLast(20).once('value');
    if (!snap.exists()) return [];
    const rooms = Object.values(snap.val()).map((r: any) => {
        const members = Object.values(r.members || {});
        const gameQueue = Object.values(r.gameQueue || {});
        return {
            ...r,
            members,
            gameQueue,
            chatHistory: Object.values(r.chatHistory || {}),
            popularityScore: (members.length * 5) + (gameQueue.length * 2)
        };
    }) as Room[];
    
    return rooms
        .sort((a, b) => ((b as any).popularityScore || 0) - ((a as any).popularityScore || 0))
        .slice(0, limit);
};
