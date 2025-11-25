import firebase from "firebase/compat/app";
import "firebase/compat/database";

// Helper para acceder a variables de entorno en Vite
const getEnv = (key: string) => {
  // @ts-ignore
  return import.meta.env[key];
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL"), 
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

let app;
let db: firebase.database.Database | undefined;

// Verificación de seguridad en consola (sin mostrar las claves reales)
const isConfigured = firebaseConfig.apiKey && firebaseConfig.databaseURL;

if (isConfigured) {
    try {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log("✅ Conectado a Firebase Realtime Database");
    } catch (error) {
        console.error("❌ Error inicializando Firebase:", error);
    }
} else {
    console.warn("⚠️ Faltan credenciales de Firebase.");
    console.log("Estado de variables:", {
        hasApiKey: !!firebaseConfig.apiKey,
        hasDbUrl: !!firebaseConfig.databaseURL,
        hasProjectId: !!firebaseConfig.projectId,
        projectId: firebaseConfig.projectId // Este no es sensible, ayuda a depurar
    });
}

export { db };
export default app;