
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es';

const translations = {
  en: {
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.error': 'Error',
    'common.or': 'or',
    'common.update': 'Update',
    'common.back': 'Back',
    
    'auth.subtitle': 'Sign in to sync, vote, and lead your squad.',
    'auth.google': 'Sign in with Google',
    'auth.guest': 'Continue as Guest',
    'auth.loginFailed': 'Login failed.',
    
    'home.admin': 'Admin',
    'home.signOut': 'Sign Out',
    'home.getStarted': 'Get Started',
    'home.subHeader': 'Join a squad or start your own.',
    'home.createBtn': 'CREATE SQUAD',
    'home.guestMode': 'Guest Login Mode',
    'home.joinOr': 'OR JOIN',
    'home.enterCode': 'ENTER CODE',
    'home.password': 'Password',
    'home.joinBtn': 'JOIN ROOM',
    'home.recent': 'Recent Rooms',
    'home.noHistory': 'No recent history.',
    'home.modalTitle': 'Create New Squad',
    // Added missing Home translations
    'home.roomName': 'Room Name',
    'home.roomNamePlace': 'e.g. Pro Gamers',
    'home.private': 'Private',
    'home.public': 'Public',
    'home.secretKey': 'Secret Key',
    'home.creating': 'Creating...',
    'home.create': 'Create',
    
    'lobby.roomNotExist': 'Room does not exist.',
    'lobby.copied': 'Copied!',
    'lobby.menu': 'MENU',
    'lobby.chat': 'CHAT',
    'lobby.viewLobby': 'Lobby',
    'lobby.viewLibrary': 'Library',
    'lobby.squad': 'SQUAD',
    'lobby.ready': 'READY',
    'lobby.setReady': 'I AM READY',
    'lobby.notReady': 'Waiting...',
    'lobby.addGame': 'Add Game',
    'lobby.votedGames': 'Voted Games',
    'lobby.aiSuggest': 'AI SUGGEST',
    'lobby.queueEmpty': 'Queue is empty. Add from Library!',
    'lobby.searchLib': 'Search library...',
    'lobby.addToQueue': 'ADD TO QUEUE',
    'lobby.modalTitle': 'Add Game',
    'lobby.uploading': 'Uploading...',
    'lobby.filterAll': 'All',
    'lobby.filterVoted': 'Most Voted',
    'lobby.filterRecent': 'Latest',
    'lobby.comments': 'Comments',
    'lobby.noComments': 'No comments yet.',
    'lobby.addComment': 'Write a comment...',
    // Added missing Lobby translations
    'lobby.coverImage': 'Cover Image',
    'lobby.uploadImg': 'Upload Image',
    'lobby.pasteUrl': 'Paste image URL...',
    'lobby.gameTitle': 'Game Title',
    
    'profile.title': 'Profile Settings',
    'profile.nickname': 'Nickname',
    'profile.nicknameHint': 'How others will see you',
    'profile.updated': 'Profile updated!',
    
    'admin.dashboard': 'Admin Dashboard',
    'admin.users': 'User Management',
    'admin.rooms': 'Active Rooms',
    'admin.pending': 'Pending Approval',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.noPending': 'No pending games.',
    'admin.roleUser': 'User',
    'admin.roleAdmin': 'Admin',
    'admin.makeAdmin': 'Promote to Admin',
    
    'chat.placeholder': 'Type message...',
    'chat.title': 'SQUAD_CHAT',
    'chat.aiTyping': 'AI SYSTEM'
  },
  es: {
    'common.loading': 'Cargando...',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.error': 'Error',
    'common.or': 'o',
    'common.update': 'Actualizar',
    'common.back': 'Volver',
    
    'auth.subtitle': 'Inicia sesión para sincronizar, votar y liderar.',
    'auth.google': 'Entrar con Google',
    'auth.guest': 'Continuar como Invitado',
    'auth.loginFailed': 'Fallo al iniciar sesión.',
    
    'home.admin': 'Admin',
    'home.signOut': 'Salir',
    'home.getStarted': 'Empezar',
    'home.subHeader': 'Únete a un equipo o crea el tuyo.',
    'home.createBtn': 'CREAR EQUIPO',
    'home.guestMode': 'Modo Invitado',
    'home.joinOr': 'O ÚNETE',
    'home.enterCode': 'CÓDIGO',
    'home.password': 'Contraseña',
    'home.joinBtn': 'ENTRAR',
    'home.recent': 'Salas Recientes',
    'home.noHistory': 'Sin historial reciente.',
    'home.modalTitle': 'Crear Nuevo Equipo',
    // Added missing Home translations
    'home.roomName': 'Nombre de la Sala',
    'home.roomNamePlace': 'ej. Escuadrón Épico',
    'home.private': 'Privada',
    'home.public': 'Pública',
    'home.secretKey': 'Clave Secreta',
    'home.creating': 'Creando...',
    'home.create': 'Crear',
    
    'lobby.roomNotExist': 'La sala no existe.',
    'lobby.copied': '¡Copiado!',
    'lobby.menu': 'MENÚ',
    'lobby.chat': 'CHAT',
    'lobby.viewLobby': 'Lobby',
    'lobby.viewLibrary': 'Biblioteca',
    'lobby.squad': 'EQUIPO',
    'lobby.ready': 'LISTO',
    'lobby.setReady': 'ESTOY LISTO',
    'lobby.notReady': 'Esperando...',
    'lobby.addGame': 'Añadir Juego',
    'lobby.votedGames': 'Juegos Votados',
    'lobby.aiSuggest': 'IA SUGERIR',
    'lobby.queueEmpty': 'Cola vacía. ¡Añade desde la Biblioteca!',
    'lobby.searchLib': 'Buscar en biblioteca...',
    'lobby.addToQueue': 'AÑADIR A COLA',
    'lobby.modalTitle': 'Añadir Juego',
    'lobby.uploading': 'Subiendo...',
    'lobby.filterAll': 'Todos',
    'lobby.filterVoted': 'Más Votados',
    'lobby.filterRecent': 'Últimos',
    'lobby.comments': 'Comentarios',
    'lobby.noComments': 'Sin comentarios aún.',
    'lobby.addComment': 'Escribe un comentario...',
    // Added missing Lobby translations
    'lobby.coverImage': 'Imagen de Portada',
    'lobby.uploadImg': 'Subir Imagen',
    'lobby.pasteUrl': 'Pegar URL...',
    'lobby.gameTitle': 'Título del Juego',
    
    'profile.title': 'Ajustes de Perfil',
    'profile.nickname': 'Apodo / Nickname',
    'profile.nicknameHint': 'Cómo te verán los demás',
    'profile.updated': '¡Perfil actualizado!',
    
    'admin.dashboard': 'Panel de Administración',
    'admin.users': 'Gestión de Usuarios',
    'admin.rooms': 'Salas Activas',
    'admin.pending': 'Pendientes de Aprobación',
    'admin.approve': 'Aprobar',
    'admin.reject': 'Rechazar',
    'admin.noPending': 'No hay juegos pendientes.',
    'admin.roleUser': 'Usuario',
    'admin.roleAdmin': 'Admin',
    'admin.makeAdmin': 'Hacer Admin',
    
    'chat.placeholder': 'Escribe mensaje...',
    'chat.title': 'CHAT_EQUIPO',
    'chat.aiTyping': 'SISTEMA IA'
  }
};

type TranslationKey = keyof typeof translations['en'];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
      setLanguageState(savedLang);
    } else {
      const browserLang = navigator.language.split('-')[0];
      setLanguageState(browserLang === 'es' ? 'es' : 'en');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
