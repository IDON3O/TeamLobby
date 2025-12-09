import { db } from "../firebaseConfig";
import { Room, Game, User, Message } from "../types";

const ROOMS_REF = "rooms";

const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const createRoom = async (host: User): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    if (host.isGuest) throw new Error("Guests cannot create rooms");
    
    const code = generateRoomCode();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const snapshot = await roomRef.once('value');
    if (snapshot.exists()) return createRoom(host);

    const newRoom: Room = {
        code,
        hostId: host.id,
        members: [host],
        gameQueue: [],
        chatHistory: [{
            id: 'init',
            userId: 'system',
            userName: 'System',
            content: `Room ${code} created by ${host.alias}.`,
            timestamp: Date.now(),
            isSystem: true
        }],
    };

    await roomRef.set(newRoom);
    return code;
};

export const joinRoom = async (code: string, user: User): Promise<boolean> => {
    if (!db) throw new Error("Database not initialized");
    
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    const snapshot = await roomRef.once('value');
    
    if (!snapshot.exists()) return false;

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

    return true;
};

export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};

    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            const safeMembers = data.members 
                ? (Array.isArray(data.members) ? data.members : Object.values(data.members)) 
                : [];
            
            // Fix: ensure gameQueue items have votedBy array (migration from old number format)
            let safeQueue = data.gameQueue 
                ? (Array.isArray(data.gameQueue) ? data.gameQueue : Object.values(data.gameQueue)) 
                : [];
            
            safeQueue = safeQueue.map((g: any) => ({
                ...g,
                votedBy: Array.isArray(g.votedBy) ? g.votedBy : [] // Handle missing or legacy data
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

export const addGameToRoom = async (code: string, game: Game, user: User) => {
    if (!db) return;
    if (user.isGuest) {
        throw new Error("Guests cannot propose games.");
    }

    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    
    await queueRef.transaction((queue) => {
        if (queue) {
             const qArray = Array.isArray(queue) ? queue : Object.values(queue);
             qArray.push(game);
             return qArray;
        } else {
            return [game];
        }
    });
};

export const removeGameFromRoom = async (code: string, game: Game) => {
     if (!db) return;
     const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
     
     await queueRef.transaction((queue) => {
         if (!queue) return queue;
         const qArray = Array.isArray(queue) ? queue : Object.values(queue);
         return qArray.filter((g: Game) => g.id !== game.id);
     });
}

// Lógica de Voto Único por Usuario
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
                // Remove vote (Toggle off)
                game.votedBy = votes.filter((id: string) => id !== userId);
            } else {
                // Add vote
                game.votedBy = [...votes, userId];
            }
            
            // Sort by number of votes
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