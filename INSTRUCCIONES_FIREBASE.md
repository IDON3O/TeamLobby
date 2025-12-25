
# 🔧 Configuración PERMANENTE de Firebase (Realtime Database)

Si recibes el error `auth/admin-restricted-operation` al intentar entrar como invitado, significa que la **Autenticación Anónima** no está habilitada en tu consola de Firebase.

### 1. Corregir Error de Invitados (CRUCIAL)

1.  Ve a tu consola de Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Entra en la sección **Authentication** en el menú lateral.
3.  Haz clic en la pestaña superior **Sign-in method**.
4.  Haz clic en el botón **"Añadir nuevo proveedor"** (Add new provider).
5.  Busca **Anónimo** (Anonymous) en la lista.
6.  Activa el interruptor a **Habilitar** (Enabled) y dale a **Guardar**.
7.  **Refresca tu web** e intenta iniciar como invitado de nuevo.

### 2. Proveedores Recomendados

Asegúrate de tener estos dos habilitados para el funcionamiento total:
*   **Google**: Para que los usuarios reales guarden su progreso.
*   **Anónimo**: Para que los invitados puedan ver las salas y votar sin crearse cuenta.

### 3. Reglas de Seguridad de la Base de Datos

En la sección **Realtime Database** -> pestaña **Rules**, pega esto para permitir acceso a ambos tipos de usuarios:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "rooms": {
      ".indexOn": ["createdAt"]
    },
    "users": {
      "$uid": {
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() === true"
      }
    }
  }
}
```

---
*Nota: Sin habilitar "Anonymous" en la consola, Firebase bloquea cualquier intento de login anónimo por seguridad, devolviendo el error 400 que ves en consola.*
