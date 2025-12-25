
# 🔧 Configuración PERMANENTE de Firebase (Realtime Database)

Para que los invitados puedan entrar y leer datos bajo la regla `auth != null`, debes habilitar la **Autenticación Anónima**.

### 1. Habilitar Proveedores de Autenticación

1.  Ve a tu consola de Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Entra en la sección **Authentication**.
3.  Haz clic en la pestaña **Sign-in method**.
4.  Asegúrate de tener habilitado:
    *   **Google** (Para miembros de escuadra).
    *   **Anónimo (Anonymous)** (Para invitados). **¡Este es Crucial!**

### 2. Reglas de Seguridad Permanentes

Copia y pega estas reglas en la pestaña **Rules** de **Realtime Database**:

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

### 3. ¿Por qué Anónimo?
Sin autenticación anónima, los invitados no tienen un "token" de usuario, por lo que Firebase los bloquea al intentar leer cualquier dato bajo la regla `auth != null`. Al habilitarlo, Firebase les asigna un ID temporal permitiéndoles interactuar con la app de forma segura.
