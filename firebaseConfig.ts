import firebase from "firebase/compat/app";
import "firebase/compat/database";

// Helper para acceder a variables de entorno de forma segura
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env?.[key];
  } catch (e) {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL"), 
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  // Storage bucket eliminado para evitar conflictos de facturación
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

let app;
let db: firebase.database.Database | undefined;

try {
    if (firebaseConfig.apiKey) {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.database(); // Initialize Realtime Database
    } else {
        console.warn("⚠️ Firebase Config missing. Database will not work.");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { db };
export default app;