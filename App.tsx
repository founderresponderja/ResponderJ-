
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import LandingPage from './components/LandingPage';
import SofiaChat from './components/SofiaChat';
import { Language } from './utils/translations';
import PricingPage from './components/PricingPage';
import { createCheckoutSession, getSubscriptionStatus, redirectToCheckout } from './services/subscriptionService';
import { PlanId } from './types';
import BlogPage, { blogArticles } from './components/BlogPage';

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

type ViewState = 'landing' | 'login' | 'register' | 'app' | 'pricing' | 'about' | 'admin' | 'cookies' | 'invite' | 'privacy' | 'terms' | 'blog';
export type Theme = 'light' | 'dark';

// Loading fallback component
const PageLoader = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-[9999]">
    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
    <p className="text-slate-500 font-medium animate-pulse">A carregar módulo...</p>
  </div>
);

const TRIAL_DAYS = 7;
const TRIAL_LIMIT = 10;

type TrialState = {
  startedAt: string | null;
  endsAt: string | null;
  daysRemaining: number;
  responsesUsed: number;
  isActive: boolean;
  isExpired: boolean;
};

const defaultTrialState: TrialState = {
  startedAt: null,
  endsAt: null,
  daysRemaining: 0,
  responsesUsed: 0,
  isActive: false,
  isExpired: false,
};

function computeTrialState(metadata: Record<string, any> | null | undefined): TrialState {
  if (!metadata) return defaultTrialState;

  const startedAt = typeof metadata.trialStartedAt === 'string' ? metadata.trialStartedAt : null;
  const endsAt = typeof metadata.trialEndsAt === 'string' ? metadata.trialEndsAt : null;
  const responsesUsed = Number(metadata.trialResponsesUsed || 0);
  if (!startedAt || !endsAt) return defaultTrialState;

  const now = Date.now();
  const endTime = new Date(endsAt).getTime();
  const diffMs = endTime - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;
  const isActive = !isExpired;

  return {
    startedAt,
    endsAt,
    daysRemaining,
    responsesUsed,
    isActive,
    isExpired,
  };
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [returnView, setReturnView] = useState<ViewState>('landing');
  const [currentLang, setCurrentLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [trial, setTrial] = useState<TrialState>(defaultTrialState);
  const [isCheckingTrial, setIsCheckingTrial] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const canonicalUrl = `https://responder-ja.vercel.app${path}`;
    const defaultTitle = 'Responder Já | Gestão de Reviews com IA para PME';
    const defaultDescription =
      'Responder reviews Google com IA, gestão reputação online Portugal e automatizar respostas avaliações para PME.';
    const defaultOgImage = 'https://responder-ja.vercel.app/og-image-1200x630.svg';

    let title = defaultTitle;
    let description = defaultDescription;

    if (path === '/blog') {
      title = 'Blog | Responder Já';
      description =
        'Conteúdos sobre responder reviews Google, SEO local para PME em Portugal e gestão de reputação online.';
    } else if (path.startsWith('/blog/')) {
      const slug = path.replace('/blog/', '');
      const article = blogArticles.find((item) => item.slug === slug);
      if (article) {
        title = `${article.title} | Blog Responder Já`;
        description = article.description;
      }
    } else if (currentView === 'app') {
      title = 'Dashboard | Responder Já';
      description = 'Gestão de reviews, respostas IA e reputação online num só dashboard.';
    }

    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', defaultOgImage);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', defaultOgImage);
    setLink('canonical', canonicalUrl);
  }, [currentView]);

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
    } else if (path === '/agency') {
      setCurrentView('app');
    } else if (path === '/blog' || path.startsWith('/blog/')) {
      setCurrentView('blog');
    } else if (path === '/about') {
      setCurrentView('about');
    } else if (path === '/privacy') {
      setCurrentView('privacy');
    } else if (path === '/terms') {
      setCurrentView('terms');
    } else if (path === '/cookies') {
      setCurrentView('cookies');
    } else if (path === '/pricing') {
      setCurrentView('pricing');
    } else if (path === '/login') {
      setCurrentView('login');
    } else if (path === '/register') {
      setCurrentView('register');
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) {
        setHasActiveSubscription(false);
        return;
      }

      setIsCheckingSubscription(true);
      try {
        const status = await getSubscriptionStatus(user?.id, user?.primaryEmailAddress?.emailAddress || undefined);
        setHasActiveSubscription(!!status.active);
      } catch {
        setHasActiveSubscription(false);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    run();
  }, [isLoaded, isSignedIn, user?.id, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    const ensureTrial = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        setTrial(defaultTrialState);
        return;
      }

      setIsCheckingTrial(true);
      try {
        const metadata = (user.unsafeMetadata || {}) as Record<string, any>;
        if (!metadata.trialStartedAt || !metadata.trialEndsAt) {
          const now = new Date();
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + TRIAL_DAYS);

          const updated = {
            ...metadata,
            trialStartedAt: now.toISOString(),
            trialEndsAt: endDate.toISOString(),
            trialResponsesUsed: 0,
          };
          await user.update({ unsafeMetadata: updated });
          setTrial(computeTrialState(updated));
        } else {
          setTrial(computeTrialState(metadata));
        }
      } catch (error) {
        console.error('Erro ao inicializar trial:', error);
        setTrial(defaultTrialState);
      } finally {
        setIsCheckingTrial(false);
      }
    };

    ensureTrial();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const checkout = query.get('checkout');
    if (!checkout || !isSignedIn) return;

    if (checkout === 'success') {
      setHasActiveSubscription(true);
      setCheckoutError(null);
    } else if (checkout === 'cancelled') {
      setCheckoutError('Pagamento cancelado. Podes tentar novamente.');
    }

    query.delete('checkout');
    query.delete('session_id');
    const cleanQuery = query.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      if (currentView === 'landing' || currentView === 'login' || currentView === 'register' || currentView === 'pricing') {
        setCurrentView('app');
      }
      return;
    }

    if (currentView === 'app' || currentView === 'admin') {
      setCurrentView('login');
    }
  }, [isLoaded, isSignedIn, currentView]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNavigation = (view: ViewState) => {
    const protectedViews: ViewState[] = ['app', 'admin'];
    if (protectedViews.includes(view) && !isSignedIn) {
      setCurrentView('login');
      return;
    }

    setIsTransitioning(true);
    // Smooth navigation with minimal delay for performance
    requestAnimationFrame(() => {
      const routeMap: Record<ViewState, string> = {
        landing: '/',
        login: '/login',
        register: '/register',
        app: '/app',
        pricing: '/pricing',
        about: '/about',
        admin: '/admin',
        cookies: '/cookies',
        invite: window.location.pathname,
        privacy: '/privacy',
        terms: '/terms',
        blog: '/blog',
      };
      const nextPath = routeMap[view];
      if (nextPath && nextPath !== window.location.pathname && view !== 'invite') {
        window.history.pushState({}, '', nextPath);
      }
      setCurrentView(view);
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'trial') {
      try {
        if (isSignedIn) {
          await signOut();
        }
      } catch (error) {
        console.warn('Erro ao terminar sessão para trial:', error);
      }
      handleNavigation('register');
      return;
    }

    try {
      setCheckoutError(null);
      setIsStartingCheckout(true);
      const session = await createCheckoutSession({
        clerkUserId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        planId,
      });
      await redirectToCheckout(session.url);
    } catch (error: any) {
      setCheckoutError(error.message || 'Falha ao iniciar pagamento.');
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const handleTrialResponseUsed = async () => {
    if (!user) return;
    try {
      const metadata = (user.unsafeMetadata || {}) as Record<string, any>;
      const nextUsed = Number(metadata.trialResponsesUsed || 0) + 1;
      const updated = {
        ...metadata,
        trialResponsesUsed: nextUsed,
      };
      await user.update({ unsafeMetadata: updated });
      setTrial((prev) => ({ ...prev, responsesUsed: nextUsed }));
    } catch (error) {
      console.error('Erro ao atualizar uso do trial:', error);
    }
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

          {currentView === 'app' && isSignedIn && (
            isCheckingSubscription || isCheckingTrial ? (
              <PageLoader />
            ) : hasActiveSubscription || trial.isActive ? (
              <MainApp 
                onLogout={() => handleNavigation('landing')}
                onNavigateToAdmin={() => handleNavigation('admin')}
                lang={currentLang}
                setLang={setCurrentLang}
                theme={theme}
                toggleTheme={toggleTheme}
                onNavigateToPrivacy={() => navigateToLeaf('privacy')}
                onNavigateToTerms={() => navigateToLeaf('terms')}
                isTrialActive={!hasActiveSubscription && trial.isActive}
                trialDaysRemaining={trial.daysRemaining}
                trialResponsesUsed={trial.responsesUsed}
                trialLimit={TRIAL_LIMIT}
                onTrialResponseUsed={handleTrialResponseUsed}
              />
            ) : (
              <>
                <PricingPage
                  isLoading={isStartingCheckout}
                  onSelectPlan={handleSelectPlan}
                  error={checkoutError}
                />
                {trial.isExpired && !hasActiveSubscription && (
                  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                      <h3 className="text-xl font-bold mb-2">O teu trial terminou</h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-5">
                        O período gratuito de 7 dias terminou. Para continuar, faz upgrade para o plano Starter.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => handleSelectPlan('starter')}
                          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg"
                        >
                          Upgrade para Starter
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          )}

          {currentView === 'about' && <AboutPage onBack={handleLeafBack} theme={theme} />}
          {currentView === 'blog' && <BlogPage onBackToHome={() => handleNavigation('landing')} />}
          {currentView === 'cookies' && <CookieManagementPage onBack={handleLeafBack} />}
          {currentView === 'privacy' && <PrivacyPolicyPage onBack={handleLeafBack} />}
          {currentView === 'terms' && <TermsAndConditionsPage onBack={handleLeafBack} />}
          {currentView === 'admin' && isSignedIn && hasActiveSubscription && <AdminDashboard onBack={() => handleNavigation('app')} theme={theme} />}

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

      <SofiaChat lang={currentLang} />
    </div>
  );
}

export default App;
