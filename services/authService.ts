import { auth, googleProvider, db } from "../firebaseConfig";
import { User, Platform } from "../types";

const ADMIN_EMAIL = "jaomp3@gmail.com";

// Escuchar cambios de autenticación
export const onAuthStateChange = (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            // Sincronizar con DB para obtener estado de baneo/muteo actualizado
            const userRef = db?.ref(`users/${firebaseUser.uid}`);
            const snapshot = await userRef?.once('value');
            const dbUser = snapshot?.val();

            if (dbUser && dbUser.isBanned) {
                // Si está baneado, forzar logout visual (o manejar en UI)
                const bannedUser: User = { ...dbUser, id: firebaseUser.uid };
                callback(bannedUser);
                return;
            }

            const isAdmin = firebaseUser.email === ADMIN_EMAIL;
            const user: User = {
                id: firebaseUser.uid,
                alias: firebaseUser.displayName || "Gamer",
                email: firebaseUser.email || "",
                avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                platforms: dbUser?.platforms || [Platform.PC],
                isReady: false,
                isGuest: false,
                isAdmin: isAdmin,
                isBanned: dbUser?.isBanned || false,
                isMuted: dbUser?.isMuted || false
            };
            
            // Actualizar registro de usuario en DB global
            await userRef?.update({
                alias: user.alias,
                email: user.email,
                avatarUrl: user.avatarUrl,
                isAdmin,
                lastLogin: Date.now()
            });

            callback(user);
        } else {
            callback(null);
        }
    });
};

export const signInWithGoogle = async (): Promise<void> => {
    if (!auth || !googleProvider) throw new Error("Auth not initialized");
    await auth.setPersistence(JSON.stringify({ type: 'LOCAL' })); // Asegurar persistencia local
    await auth.signInWithPopup(googleProvider);
};

export const logout = async () => {
    if (!auth) return;
    await auth.signOut();
};

export const createGuestUser = (): User => {
    const guestId = `guest-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    return {
        id: guestId,
        alias: `Guest ${guestId.slice(-4)}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
        platforms: [Platform.PC],
        isReady: false,
        isGuest: true,
        isAdmin: false
    };
};