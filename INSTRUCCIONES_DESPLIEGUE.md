# 🚀 Guía de Despliegue Actualizada: TeamLobby

Esta guía te ayudará a configurar Firebase y desplegar en Vercel usando **Vite**.

---

## 🟢 PASO 1: Configurar Firebase

1.  Ve a [console.firebase.google.com](https://console.firebase.google.com/).
2.  Crea un proyecto.
3.  Activa **Realtime Database** (ver archivo `INSTRUCCIONES_FIREBASE.md`).
4.  Registra una App Web (icono `</>`) para obtener tus credenciales.

---

## 🟡 PASO 2: Variables en Vercel

Cuando configures el proyecto en Vercel (Settings -> Environment Variables), añade estas variables:

| Nombre (Key) | Valor (Value de Firebase) |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | (Tu apiKey) |
| `VITE_FIREBASE_AUTH_DOMAIN` | (Tu authDomain) |
| `VITE_FIREBASE_PROJECT_ID` | (Tu projectId) |
| `VITE_FIREBASE_DATABASE_URL` | (La URL de tu Realtime Database, ej: `https://xxx.firebaseio.com`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (Tu messagingSenderId) |
| `VITE_FIREBASE_APP_ID` | (Tu appId) |

**Variable para la IA (Gemini):**
| Nombre (Key) | Valor |
| :--- | :--- |
| `VITE_API_KEY` | (Tu clave de Google Gemini API) |

---

## 🔴 PASO 3: Desplegar

1.  Sube todos los archivos a tu repositorio o arrástralos a Vercel.
2.  Vercel detectará automáticamente que es un proyecto **Vite**.
3.  Dale a **Deploy**.
