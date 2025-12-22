
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
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.showMore': 'More',
    'common.showLess': 'Less',
    
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
    'home.roomName': 'Room Name',
    'home.roomNamePlace': 'e.g. Pro Gamers',
    'home.private': 'Private',
    'home.public': 'Public',
    'home.secretKey': 'Secret Key',
    'home.creating': 'Creating...',
    'home.create': 'Create',
    
    'lobby.roomNotExist': 'Room does not exist.',
    'lobby.copied': 'Copied!',
    'lobby.viewLobby': 'Lobby',
    'lobby.viewLibrary': 'Library',
    'lobby.squad': 'SQUAD',
    'lobby.ready': 'READY',
    'lobby.setReady': 'I AM READY',
    'lobby.notReady': 'Waiting...',
    'lobby.addGame': 'Add Game',
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
    'lobby.coverImage': 'Cover Image',
    'lobby.gameTitle': 'Game Title',
    'lobby.leave': 'Leave Lobby',
    
    'genre.Action': 'Action',
    'genre.Adventure': 'Adventure',
    'genre.RPG': 'RPG',
    'genre.Shooter': 'Shooter',
    'genre.Strategy': 'Strategy',
    'genre.Simulation': 'Simulation',
    'genre.Sports': 'Sports',
    'genre.Racing': 'Racing',
    'genre.Platformer': 'Platformer',
    'genre.Fighting': 'Fighting',
    'genre.Horror': 'Horror',
    'genre.Survival': 'Survival',
    'genre.Puzzle': 'Puzzle',
    'genre.Sandbox': 'Sandbox',
    'genre.Roguelike': 'Roguelike',
    'genre.Indie': 'Indie',
    'genre.Multiplayer': 'Multiplayer',
    'genre.Casual': 'Casual',

    'profile.title': 'Profile Settings',
    'profile.nickname': 'Nickname',
    'profile.nicknameHint': 'How others will see you',
    'profile.updated': 'Profile updated!',
    'profile.contributions': 'Public Contributions',
    'profile.contributionsDesc': 'Your proposed games can be reviewed for the Global Library.',
    
    'admin.dashboard': 'Admin Dashboard',
    'admin.users': 'Users',
    'admin.rooms': 'Rooms',
    'admin.pending': 'Pending',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    
    'chat.placeholder': 'Type message...',
    'chat.title': 'Squad_Channel',
    'chat.welcome.title': 'Squad Communications Hub',
    'chat.welcome.text': 'Welcome to the lobby! Coordinate with your team here. Suggest games, vote for your favorites, and get ready for the session.',
    'chat.system.sync': 'End-to-end synchronized',
    'chat.status.thinking': 'AI is thinking...',
    'chat.you': 'YOU'
  },
  es: {
    'common.loading': 'Cargando...',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.error': 'Error',
    'common.or': 'o',
    'common.update': 'Actualizar',
    'common.back': 'Volver',
    'common.confirm': 'Confirmar',
    'common.delete': 'Eliminar',
    'common.showMore': 'Más',
    'common.showLess': 'Menos',
    
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
    'home.roomName': 'Nombre de la Sala',
    'home.roomNamePlace': 'ej. Escuadrón Épico',
    'home.private': 'Privada',
    'home.public': 'Pública',
    'home.secretKey': 'Clave Secreta',
    'home.creating': 'Creando...',
    'home.create': 'Crear',
    
    'lobby.roomNotExist': 'La sala no existe.',
    'lobby.copied': '¡Copiado!',
    'lobby.viewLobby': 'Lobby',
    'lobby.viewLibrary': 'Biblioteca',
    'lobby.squad': 'EQUIPO',
    'lobby.ready': 'LISTO',
    'lobby.setReady': 'ESTOY LISTO',
    'lobby.notReady': 'Esperando...',
    'lobby.addGame': 'Añadir Juego',
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
    'lobby.coverImage': 'Imagen de Portada',
    'lobby.gameTitle': 'Título del Juego',
    'lobby.leave': 'Salir de la Sala',
    
    'genre.Action': 'Acción',
    'genre.Adventure': 'Aventura',
    'genre.RPG': 'RPG',
    'genre.Shooter': 'Shooter',
    'genre.Strategy': 'Estrategia',
    'genre.Simulation': 'Simulación',
    'genre.Sports': 'Deportes',
    'genre.Racing': 'Carreras',
    'genre.Platformer': 'Plataformas',
    'genre.Fighting': 'Pelea',
    'genre.Horror': 'Terror',
    'genre.Survival': 'Supervivencia',
    'genre.Puzzle': 'Puzzle',
    'genre.Sandbox': 'Sandbox',
    'genre.Roguelike': 'Roguelike',
    'genre.Indie': 'Indie',
    'genre.Multiplayer': 'Multijugador',
    'genre.Casual': 'Casual',

    'profile.title': 'Ajustes de Perfil',
    'profile.nickname': 'Apodo / Nickname',
    'profile.nicknameHint': 'Cómo te verán los demás',
    'profile.updated': '¡Perfil actualizado!',
    'profile.contributions': 'Contribuciones Públicas',
    'profile.contributionsDesc': 'Tus juegos propuestos pueden ser revisados para la Biblioteca Global.',
    
    'admin.dashboard': 'Panel de Administración',
    'admin.users': 'Usuarios',
    'admin.rooms': 'Salas',
    'admin.pending': 'Pendientes',
    'admin.approve': 'Aprobar',
    'admin.reject': 'Rechazar',
    
    'chat.placeholder': 'Escribe mensaje...',
    'chat.title': 'Canal_Escuadrón',
    'chat.welcome.title': 'Centro de Comunicaciones',
    'chat.welcome.text': '¡Bienvenido a la sala! Coordínate con tu equipo aquí. Sugiere juegos, vota por tus favoritos y prepárate para la sesión.',
    'chat.system.sync': 'Sincronizado punto a punto',
    'chat.status.thinking': 'La IA está pensando...',
    'chat.you': 'TÚ'
  }
};

export type TranslationKey = keyof typeof translations['en'];

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
