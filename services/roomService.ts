import { db } from "../firebaseConfig";
import { Room, Game, User, Message } from "../types";

const ROOMS_REF = "rooms";

// Generar código aleatorio de 5 caracteres
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
    
    const code = generateRoomCode();
    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    // Verificar si existe
    const snapshot = await roomRef.once('value');
    if (snapshot.exists()) return createRoom(host); // Reintentar si colisiona

    const newRoom: Room = {
        code,
        hostId: host.id,
        members: [host],
        gameQueue: [],
        chatHistory: [{
            id: 'init',
            userId: 'system',
            userName: 'System',
            content: `Room ${code} created. Waiting for squad...`,
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

    // Usamos una transacción para añadir el miembro de forma segura
    await roomRef.child('members').transaction((members) => {
        if (members) {
            const exists = members.some((m: User) => m.id === user.id);
            if (!exists) {
                members.push(user);
            }
        } else {
            members = [user];
        }
        return members;
    });

    return true;
};

// Escucha en tiempo real (Realtime Database)
export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};

    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Asegurar que los arrays existan aunque estén vacíos
            const room: Room = {
                ...data,
                members: data.members || [],
                gameQueue: data.gameQueue || [],
                chatHistory: data.chatHistory || []
            };
            callback(room);
        }
    });

    // Función de limpieza
    return () => roomRef.off('value', listener);
};

export const addGameToRoom = async (code: string, game: Game) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
    
    await queueRef.transaction((queue) => {
        if (queue) {
            queue.push(game);
        } else {
            queue = [game];
        }
        return queue;
    });
};

export const removeGameFromRoom = async (code: string, game: Game) => {
     if (!db) return;
     const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);
     
     await queueRef.transaction((queue) => {
         if (!queue) return queue;
         return queue.filter((g: Game) => g.id !== game.id);
     });
}

export const voteForGame = async (code: string, gameId: string, currentQueue: Game[]) => {
    if (!db) return;
    
    // Realtime DB permite actualizar toda la lista fácilmente
    const updatedQueue = currentQueue.map(g => {
        if (g.id === gameId) return { ...g, votes: (g.votes || 0) + 1 };
        return g;
    });

    // Ordenar por votos
    updatedQueue.sort((a, b) => b.votes - a.votes);

    await db.ref(`${ROOMS_REF}/${code}/gameQueue`).set(updatedQueue);
};

export const sendChatMessage = async (code: string, message: Message) => {
    if (!db) return;
    const chatRef = db.ref(`${ROOMS_REF}/${code}/chatHistory`);
    
    await chatRef.transaction((history) => {
        if (history) {
            history.push(message);
        } else {
            history = [message];
        }
        return history;
    });
};

export const toggleUserReadyState = async (code: string, userId: string, currentMembers: User[]) => {
    if (!db) return;
    
    const updatedMembers = currentMembers.map(m => {
        if (m.id === userId) return { ...m, isReady: !m.isReady };
        return m;
    });

    await db.ref(`${ROOMS_REF}/${code}/members`).set(updatedMembers);
};