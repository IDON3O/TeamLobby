
import { auth, googleProvider, db } from "../firebaseConfig";
import { User, Platform } from "../types";

const ADMIN_EMAIL = "jaomp3@gmail.com";

export const onAuthStateChange = (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            const userRef = db?.ref(`users/${firebaseUser.uid}`);
            const snapshot = await userRef?.once('value');
            const dbUser = snapshot?.val();

            if (dbUser && dbUser.isBanned) {
                const bannedUser: User = { ...dbUser, id: firebaseUser.uid };
                callback(bannedUser);
                return;
            }

            const isGuest = firebaseUser.isAnonymous;
            const isAdmin = !isGuest && firebaseUser.email === ADMIN_EMAIL;
            
            const user: User = {
                id: firebaseUser.uid,
                alias: isGuest ? (dbUser?.alias || `Guest ${firebaseUser.uid.slice(-4)}`) : (firebaseUser.displayName || "Gamer"),
                email: firebaseUser.email || "",
                avatarUrl: isGuest 
                    ? (dbUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`)
                    : (firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`),
                platforms: dbUser?.platforms || [Platform.PC],
                isReady: false,
                isGuest: isGuest,
                isAdmin: isAdmin,
                isBanned: dbUser?.isBanned || false,
                isMuted: dbUser?.isMuted || false
            };
            
            await userRef?.update({
                alias: user.alias,
                email: user.email,
                avatarUrl: user.avatarUrl,
                isAdmin,
                isGuest,
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
    await auth.setPersistence('local'); 
    await auth.signInWithPopup(googleProvider);
};

export const createGuestUser = async (): Promise<void> => {
    if (!auth) throw new Error("Auth not initialized");
    await auth.signInAnonymously();
};

export const logout = async () => {
    if (!auth) return;
    await auth.signOut();
};
