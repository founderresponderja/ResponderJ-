
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import LandingPage from './components/LandingPage';
import SofiaChat from './components/SofiaChat';
import { Language } from './utils/translations';

// Lazy loading components for performance
const LoginPage = lazy(() => import('./components/LoginPage'));
const RegisterPage = lazy(() => import('./components/RegisterPage'));
const MainApp = lazy(() => import('./components/MainApp'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const CookieManagementPage = lazy(() => import('./components/CookieManagementPage'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const TermsAndConditionsPage = lazy(() => import('./components/TermsAndConditionsPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const InvitePage = lazy(() => import('./components/InvitePage'));

type ViewState = 'landing' | 'login' | 'register' | 'app' | 'about' | 'admin' | 'cookies' | 'invite' | 'privacy' | 'terms';
export type Theme = 'light' | 'dark';

// Loading fallback component
const PageLoader = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-[9999]">
    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
    <p className="text-slate-500 font-medium animate-pulse">A carregar módulo...</p>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [returnView, setReturnView] = useState<ViewState>('landing');
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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
    // Smooth navigation with minimal delay for performance
    requestAnimationFrame(() => {
      if (view === 'landing') {
        window.history.pushState({}, '', '/');
      }
      setCurrentView(view);
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  };

  const navigateToLeaf = (view: ViewState) => {
    setReturnView(currentView === 'login' || currentView === 'register' ? 'landing' : currentView);
    handleNavigation(view);
  };

  const handleLeafBack = () => {
    handleNavigation(returnView);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 relative`}>
      <Suspense fallback={<PageLoader />}>
        <div className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {currentView === 'landing' && (
            <LandingPage 
              onNavigateToLogin={() => handleNavigation('login')} 
              onNavigateToAbout={() => navigateToLeaf('about')}
              onNavigateToCookies={() => navigateToLeaf('cookies')}
              onNavigateToPrivacy={() => navigateToLeaf('privacy')}
              onNavigateToTerms={() => navigateToLeaf('terms')}
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
              onBack={() => handleNavigation('login')}
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
              onNavigateToPrivacy={() => navigateToLeaf('privacy')}
              onNavigateToTerms={() => navigateToLeaf('terms')}
            />
          )}

          {currentView === 'about' && <AboutPage onBack={handleLeafBack} theme={theme} />}
          {currentView === 'cookies' && <CookieManagementPage onBack={handleLeafBack} />}
          {currentView === 'privacy' && <PrivacyPolicyPage onBack={handleLeafBack} />}
          {currentView === 'terms' && <TermsAndConditionsPage onBack={handleLeafBack} />}
          {currentView === 'admin' && <AdminDashboard onBack={() => handleNavigation('app')} theme={theme} />}

          {currentView === 'invite' && inviteToken && (
            <InvitePage
              token={inviteToken}
              onNavigateToLogin={() => handleNavigation('login')}
              onSuccess={() => handleNavigation('app')}
              theme={theme}
            />
          )}
        </div>
      </Suspense>

      <SofiaChat />
    </div>
  );
}

export default App;
