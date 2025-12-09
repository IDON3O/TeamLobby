# 📱 Cómo instalar TeamLobby en Móviles (PWA)

TeamLobby es una **Progressive Web App (PWA)**. Esto significa que puedes instalarla en tu teléfono sin pasar por la App Store o Google Play, funcionando como una aplicación nativa (pantalla completa, sin barra de navegador).

## 🤖 En Android (Chrome)

1.  Abre **Google Chrome** y ve a la URL de tu aplicación (ej: `https://tu-proyecto.vercel.app`).
2.  Espera unos segundos, a veces aparece un aviso automático en la parte inferior: **"Añadir TeamLobby a la pantalla de inicio"**.
3.  Si no aparece:
    *   Toca el menú de tres puntos (**⋮**) en la esquina superior derecha.
    *   Selecciona **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
4.  Confirma la instalación.
5.  ¡Listo! El icono de TeamLobby aparecerá en tu cajón de aplicaciones.

## 🍎 En iOS (iPhone/iPad - Safari)

1.  Abre **Safari** (es necesario usar Safari, no Chrome en iOS) y ve a la URL de tu aplicación.
2.  Toca el botón **Compartir** (el cuadrado con una flecha hacia arriba en la barra inferior).
3.  Desliza hacia abajo en el menú y busca la opción **"Añadir a la pantalla de inicio"** (Add to Home Screen).
4.  Toca **Añadir** en la esquina superior derecha.
5.  La app aparecerá en tu pantalla de inicio como una app más.

---

## 🛠️ Notas para el Desarrollador

*   **Iconos:** He configurado el `manifest.json` usando iconos SVG generados dinámicamente para que funcione "out-of-the-box". Para producción real, deberías generar tus propios iconos PNG (192x192 y 512x512) y guardarlos en la carpeta `public/`, actualizando el `manifest.json`.
*   **Offline:** Actualmente la app requiere internet para Firebase. Para hacerla 100% offline-capable, se necesitaría configurar un `Service Worker` avanzado (Workbox), pero el Manifest actual ya permite la instalación visual.
