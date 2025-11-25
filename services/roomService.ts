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

// CORREGIDO: Uso de transacción para evitar "Race Conditions" en los votos
export const voteForGame = async (code: string, gameId: string, _unusedQueue?: Game[]) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);

    await queueRef.transaction((queue) => {
        if (!queue) return queue;

        // Encontrar índice del juego
        const index = queue.findIndex((g: Game) => g.id === gameId);
        
        if (index !== -1) {
            // Incrementar voto
            queue[index].votes = (queue[index].votes || 0) + 1;
            
            // Reordenar la lista por votos (Descendente)
            // Es seguro hacerlo aquí porque la transacción bloquea la escritura hasta terminar
            queue.sort((a: Game, b: Game) => (b.votes || 0) - (a.votes || 0));
        }
        
        return queue;
    });
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

export const toggleUserReadyState = async (code: string, userId: string, _unusedMembers?: User[]) => {
    if (!db) return;
    const membersRef = db.ref(`${ROOMS_REF}/${code}/members`);
    
    await membersRef.transaction((members) => {
        if (!members) return members;
        
        return members.map((m: User) => {
            if (m.id === userId) return { ...m, isReady: !m.isReady };
            return m;
        });
    });
};