import { auth, googleProvider } from "../firebaseConfig";
import { User, Platform } from "../types";

const ADMIN_EMAIL = "jaomp3@gmail.com";

export const signInWithGoogle = async (): Promise<User | null> => {
    if (!auth || !googleProvider) throw new Error("Auth not initialized");
    
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const fbUser = result.user;
        
        if (!fbUser) return null;

        const isAdmin = fbUser.email === ADMIN_EMAIL;

        // Mapear usuario de Firebase a nuestro tipo User
        const newUser: User = {
            id: fbUser.uid,
            alias: fbUser.displayName || "Gamer",
            email: fbUser.email || "",
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
            platforms: [Platform.PC], // Default
            isReady: false,
            isGuest: false,
            isAdmin: isAdmin
        };

        return newUser;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
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