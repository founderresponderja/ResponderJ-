import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import MainApp from './components/MainApp';
import { Language } from './utils/translations';

type ViewState = 'landing' | 'login' | 'app';
export type Theme = 'light' | 'dark';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');

  // Handle Dark Mode Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navigateToLogin = () => setCurrentView('login');
  const navigateToLanding = () => setCurrentView('landing');
  const handleLoginSuccess = () => setCurrentView('app');
  const handleLogout = () => setCurrentView('landing');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {currentView === 'landing' && (
        <LandingPage 
          onNavigateToLogin={navigateToLogin} 
          lang={currentLang} 
          setLang={setCurrentLang}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
      
      {currentView === 'login' && (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess} 
          onBack={navigateToLanding}
          lang={currentLang}
          theme={theme}
        />
      )}

      {currentView === 'app' && (
        <MainApp 
          onLogout={handleLogout}
          lang={currentLang}
          setLang={setCurrentLang}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;