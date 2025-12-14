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
import { Language } from './utils/translations';

type ViewState = 'landing' | 'login' | 'register' | 'app' | 'about' | 'admin' | 'cookies' | 'invite' | 'privacy' | 'terms';
export type Theme = 'light' | 'dark';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

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

  const navigateToLogin = () => setCurrentView('login');
  const navigateToRegister = () => setCurrentView('register');
  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('landing');
  };
  const navigateToAbout = () => setCurrentView('about');
  const navigateToCookies = () => setCurrentView('cookies');
  const navigateToPrivacy = () => setCurrentView('privacy');
  const navigateToTerms = () => setCurrentView('terms');
  const handleLoginSuccess = () => setCurrentView('app');
  const handleLogout = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('landing');
  };
  const navigateToAdmin = () => setCurrentView('admin');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {currentView === 'landing' && (
        <LandingPage 
          onNavigateToLogin={navigateToLogin} 
          onNavigateToAbout={navigateToAbout}
          onNavigateToCookies={navigateToCookies}
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToTerms={navigateToTerms}
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
          onRegister={navigateToRegister}
          lang={currentLang}
          theme={theme}
        />
      )}

      {currentView === 'register' && (
        <RegisterPage 
          onRegisterSuccess={handleLoginSuccess} 
          onLoginClick={navigateToLogin}
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
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToTerms={navigateToTerms}
        />
      )}

      {currentView === 'about' && (
        <AboutPage 
          onBack={navigateToLanding}
          theme={theme}
        />
      )}

      {currentView === 'cookies' && (
        <CookieManagementPage 
          onBack={navigateToLanding}
        />
      )}

      {currentView === 'privacy' && (
        <PrivacyPolicyPage 
          onBack={navigateToLanding}
        />
      )}

      {currentView === 'terms' && (
        <TermsAndConditionsPage 
          onBack={navigateToLanding}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard 
          onBack={handleLoginSuccess} // Back to app
          theme={theme}
        />
      )}

      {currentView === 'invite' && inviteToken && (
        <InvitePage
          token={inviteToken}
          onNavigateToLogin={navigateToLogin}
          onSuccess={handleLoginSuccess}
          theme={theme}
        />
      )}
    </div>
  );
}

export default App;