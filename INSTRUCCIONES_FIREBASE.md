# 🔧 Configuración OBLIGATORIA de Firebase (Realtime Database)

Para corregir los errores de guardado y hacer que el chat funcione sin pagar, usamos **Realtime Database**.

### 1. Activar Realtime Database

1.  Ve a tu consola de Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Entra en tu proyecto.
3.  En el menú lateral izquierdo, busca y haz clic en **Realtime Database**.
    *   **OJO:** No confundir con "Firestore Database". Son distintos.
4.  Haz clic en **Crear base de datos**.
5.  **Ubicación de la base de datos:** Selecciona **Estados Unidos (us-central1)**.
6.  **Reglas de seguridad:** IMPORTANTE: Selecciona **Comenzar en modo de prueba** (Start in Test Mode).
7.  Haz clic en **Habilitar**.

¡Listo! Con esto tu aplicación guardará salas, chats e imágenes (como texto) totalmente gratis.

---

### ¡Importante para Vercel!

Revisa que en tus variables de entorno en Vercel, la variable `VITE_FIREBASE_PROJECT_ID` coincida con el ID de tu proyecto.

A veces Realtime Database necesita una variable extra llamada `VITE_FIREBASE_DATABASE_URL` en Vercel.
Copia la URL que aparece en la cabecera de la sección "Datos" de Realtime Database (ej: `https://teamlobby-xyz.firebaseio.com/`) y agrégala a tus variables de entorno como `VITE_FIREBASE_DATABASE_URL`.