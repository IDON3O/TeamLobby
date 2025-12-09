import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Loader2, Gamepad2, Languages } from 'lucide-react';
import { User } from './types';
import { onAuthStateChange, signInWithGoogle, createGuestUser } from './services/authService';
import { LanguageProvider, useLanguage } from './services/i18n';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Admin from './pages/Admin';

// Componente Wrapper interno para usar el hook useLanguage
const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
        setCurrentUser(user);
        setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
      try { await signInWithGoogle(); } catch (e) { alert(t('auth.loginFailed')); }
  };

  const handleGuestLogin = () => {
      setCurrentUser(createGuestUser());
  };

  const toggleLang = () => {
      setLanguage(language === 'en' ? 'es' : 'en');
  }

  if (isAuthChecking) {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={48} />
          </div>
      )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas / Auth */}
        {!currentUser ? (
             <Route path="*" element={
                <div className="min-h-screen bg-background text-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
                    <div className="absolute top-4 right-4 z-50">
                        <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-gray-800 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                            <Languages size={14}/> {language.toUpperCase()}
                        </button>
                    </div>
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="max-w-sm w-full bg-surface border border-gray-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 z-10">
                        <div className="flex justify-center mb-4">
                            <div className="bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-lg shadow-primary/30">
                                <Gamepad2 size={40} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter mb-2">TeamLobby</h1>
                            <p className="text-gray-400 text-sm">{t('auth.subtitle')}</p>
                        </div>
                        <div className="space-y-3 pt-4">
                            <button onClick={handleLogin} className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" /> {t('auth.google')}
                            </button>
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                                <div className="relative flex justify-center text-xs font-bold uppercase"><span className="px-2 bg-surface text-gray-600">{t('common.or')}</span></div>
                            </div>
                            <button onClick={handleGuestLogin} className="w-full bg-gray-800 text-gray-400 hover:text-white font-medium py-3 rounded-xl transition-colors text-sm border border-gray-700 hover:border-gray-600">
                                {t('auth.guest')}
                            </button>
                        </div>
                    </div>
                </div>
             } />
        ) : (
            /* Rutas Protegidas */
            <Route element={<Outlet context={{ currentUser }} />}>
                <Route path="/" element={<Home currentUser={currentUser} />} />
                <Route path="/room/:code" element={<Lobby currentUser={currentUser} />} />
                <Route path="/admin" element={currentUser.isAdmin ? <Admin currentUser={currentUser} /> : <Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
};

export default App;