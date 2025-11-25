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
            // Manejo de arrays que Firebase devuelve como objetos
            const membersArray = Array.isArray(members) ? members : Object.values(members);
            const exists = membersArray.some((m: User) => m.id === user.id);
            if (!exists) {
                // Si es array, push. Si es objeto/null, recrear array.
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

// Escucha en tiempo real (Realtime Database)
export const subscribeToRoom = (code: string, callback: (room: Room) => void) => {
    if (!db) return () => {};

    const roomRef = db.ref(`${ROOMS_REF}/${code}`);
    
    const listener = roomRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // PROTECCIÓN: Firebase a veces devuelve Arrays como Objetos si las claves son numéricas no secuenciales
            const safeMembers = data.members 
                ? (Array.isArray(data.members) ? data.members : Object.values(data.members)) 
                : [];
            
            const safeQueue = data.gameQueue 
                ? (Array.isArray(data.gameQueue) ? data.gameQueue : Object.values(data.gameQueue)) 
                : [];

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

    // Función de limpieza
    return () => roomRef.off('value', listener);
};

export const addGameToRoom = async (code: string, game: Game) => {
    if (!db) return;
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

// CORREGIDO: Uso de transacción para evitar "Race Conditions" en los votos
export const voteForGame = async (code: string, gameId: string, _unusedQueue?: Game[]) => {
    if (!db) return;
    const queueRef = db.ref(`${ROOMS_REF}/${code}/gameQueue`);

    await queueRef.transaction((queue) => {
        if (!queue) return queue;

        // Convertir a array si firebase devolvió objeto
        const qArray = Array.isArray(queue) ? queue : Object.values(queue);
        
        // Encontrar índice del juego
        const index = qArray.findIndex((g: Game) => g.id === gameId);
        
        if (index !== -1) {
            // Incrementar voto
            qArray[index].votes = (qArray[index].votes || 0) + 1;
            
            // Reordenar la lista por votos (Descendente)
            qArray.sort((a: Game, b: Game) => (b.votes || 0) - (a.votes || 0));
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

export const toggleUserReadyState = async (code: string, userId: string, _unusedMembers?: User[]) => {
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