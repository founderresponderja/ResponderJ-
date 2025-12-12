import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import MainApp from './components/MainApp';
import AboutPage from './components/AboutPage';
import AdminDashboard from './components/AdminDashboard';
import { Language } from './utils/translations';

type ViewState = 'landing' | 'login' | 'app' | 'about' | 'admin';
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
  const navigateToAbout = () => setCurrentView('about');
  const handleLoginSuccess = () => setCurrentView('app');
  const handleLogout = () => setCurrentView('landing');
  const navigateToAdmin = () => setCurrentView('admin');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {currentView === 'landing' && (
        <LandingPage 
          onNavigateToLogin={navigateToLogin} 
          onNavigateToAbout={navigateToAbout}
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
          onNavigateToAdmin={navigateToAdmin}
          lang={currentLang}
          setLang={setCurrentLang}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentView === 'about' && (
        <AboutPage 
          onBack={navigateToLanding}
          theme={theme}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard 
          onBack={handleLoginSuccess} // Back to app
          theme={theme}
        />
      )}
    </div>
  );
}

export default App;