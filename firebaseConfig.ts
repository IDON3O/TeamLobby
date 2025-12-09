import firebase from "firebase/compat/app";
import "firebase/compat/database";
import "firebase/compat/auth";

// Helper para acceder a variables de entorno en Vite
const getEnv = (key: string) => {
  // @ts-ignore
  return import.meta.env[key];
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || getEnv("VITE_APP_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL"), 
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

let app;
let db: firebase.database.Database | undefined;
let auth: firebase.auth.Auth | undefined;
let googleProvider: firebase.auth.GoogleAuthProvider | undefined;

// Verificación de seguridad en consola (sin mostrar las claves reales)
const isConfigured = firebaseConfig.apiKey && firebaseConfig.databaseURL;

if (isConfigured) {
    try {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        console.log("✅ Conectado a Firebase (Database + Auth)");
    } catch (error) {
        console.error("❌ Error inicializando Firebase:", error);
    }
} else {
    console.warn("⚠️ Faltan credenciales de Firebase.");
    console.log("[Firebase Config Check]", {
        apiKey: !!firebaseConfig.apiKey ? "OK" : "MISSING",
        databaseURL: !!firebaseConfig.databaseURL ? "OK" : "MISSING"
    });
}

export { db, auth, googleProvider };
export default app;