
# 🔧 Configuración PERMANENTE de Firebase (Realtime Database)

Si tu periodo de prueba de 30 días ha terminado o recibes errores de acceso, debes actualizar las **Reglas de Seguridad** para que la base de datos sea permanente y solo accesible para tus usuarios.

### 1. Actualizar Reglas de Seguridad

1.  Ve a tu consola de Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Entra en la sección **Realtime Database**.
3.  Haz clic en la pestaña **Reglas** (Rules).
4.  Borra todo el contenido actual y pega estas reglas permanentes (reemplazan las reglas de tiempo limitado):

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

*Nota: Esto asegura que solo usuarios logueados lean/escriban, y que los usuarios solo puedan editar su propio perfil (a menos que seas admin).*

5.  Haz clic en **Publicar**.

---

### 2. Verificar URL de la Base de Datos

Asegúrate de que en Vercel (o tu entorno local) tengas configurada la URL correcta:
`VITE_FIREBASE_DATABASE_URL` = `https://tu-proyecto-id.firebaseio.com/` (Incluye el https y la barra final).

---

### ¿Por qué se bloqueó mi base de datos?
Firebase por defecto aplica reglas de "Modo de Prueba" que caducan a los 30 días para protegerte de cobros accidentales. Al usar `auth != null`, eliminamos esa fecha límite y aseguramos que solo la lógica de tu aplicación pueda interactuar con los datos de forma indefinida.
