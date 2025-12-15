
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import MainApp from './components/MainApp';
import AboutPage from './components/AboutPage';
import AdminDashboard from './components/AdminDashboard';
import CookieManagementPage from './components/CookieManagementPage';
import InvitePage from './components/InvitePage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsAndConditionsPage from './components/TermsAndConditionsPage';
import SofiaChat from './components/SofiaChat'; // Nova importação
import { Language } from './utils/translations';

type ViewState = 'landing' | 'login' | 'register' | 'app' | 'about' | 'admin' | 'cookies' | 'invite' | 'privacy' | 'terms';
export type Theme = 'light' | 'dark';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle Dark Mode Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handle URL routing for invitations
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/convite/')) {
      const token = path.split('/convite/')[1];
      if (token) {
        setInviteToken(token);
        setCurrentView('invite');
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNavigation = (view: ViewState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (view === 'landing') {
        window.history.pushState({}, '', '/');
      }
      setCurrentView(view);
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200); // Pequeno delay para permitir uma animação de saída se implementada no futuro
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 relative`}>
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentView === 'landing' && (
          <LandingPage 
            onNavigateToLogin={() => handleNavigation('login')} 
            onNavigateToAbout={() => handleNavigation('about')}
            onNavigateToCookies={() => handleNavigation('cookies')}
            onNavigateToPrivacy={() => handleNavigation('privacy')}
            onNavigateToTerms={() => handleNavigation('terms')}
            lang={currentLang} 
            setLang={setCurrentLang}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}
        
        {currentView === 'login' && (
          <LoginPage 
            onLoginSuccess={() => handleNavigation('app')} 
            onBack={() => handleNavigation('landing')}
            onRegister={() => handleNavigation('register')}
            lang={currentLang}
            theme={theme}
          />
        )}

        {currentView === 'register' && (
          <RegisterPage 
            onRegisterSuccess={() => handleNavigation('app')} 
            onLoginClick={() => handleNavigation('login')}
            lang={currentLang}
            theme={theme}
          />
        )}

        {currentView === 'app' && (
          <MainApp 
            onLogout={() => handleNavigation('landing')}
            onNavigateToAdmin={() => handleNavigation('admin')}
            lang={currentLang}
            setLang={setCurrentLang}
            theme={theme}
            toggleTheme={toggleTheme}
            onNavigateToPrivacy={() => handleNavigation('privacy')}
            onNavigateToTerms={() => handleNavigation('terms')}
          />
        )}

        {currentView === 'about' && (
          <AboutPage 
            onBack={() => handleNavigation('landing')}
            theme={theme}
          />
        )}

        {currentView === 'cookies' && (
          <CookieManagementPage 
            onBack={() => handleNavigation('landing')}
          />
        )}

        {currentView === 'privacy' && (
          <PrivacyPolicyPage 
            onBack={() => handleNavigation('landing')}
          />
        )}

        {currentView === 'terms' && (
          <TermsAndConditionsPage 
            onBack={() => handleNavigation('landing')}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard 
            onBack={() => handleNavigation('app')} 
            theme={theme}
          />
        )}

        {currentView === 'invite' && inviteToken && (
          <InvitePage
            token={inviteToken}
            onNavigateToLogin={() => handleNavigation('login')}
            onSuccess={() => handleNavigation('app')}
            theme={theme}
          />
        )}
      </div>

      {/* Sofia Chatbot Global Component */}
      <SofiaChat />
    </div>
  );
}

export default App;
