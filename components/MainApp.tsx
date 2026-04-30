
import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { 
  MessageSquareText, 
  LayoutDashboard, 
  List, 
  LogOut, 
  Sun, 
  Moon, 
  CreditCard, 
  Activity, 
  Store, 
  Bot,
  Coins,
  Crown,
  History,
  ArrowRight,
  Menu,
  Users,
  Share2,
  Building2,
  Lock
} from 'lucide-react';

import ReviewForm from './ReviewForm';
import ResponseCard from './ResponseCard';
import AssistantTip from './AssistantTip';
import { Logo } from './Logo';
import { useGenerateResponse } from '../services/geminiService';
import UpgradeModal from './UpgradeModal';
import { PLAN_CAPABILITIES, normalizePlan } from '../shared/planCapabilities';
import { processReplitPayment } from '../services/paymentService';
import { ReviewData, UserSubscription } from '../types';
import { translations, Language } from '../utils/translations';
import { Theme } from '../App';
import { useSubscription } from '../hooks/useSubscription';

// Lazy load heavy tab components
const Dashboard = lazy(() => import('./Dashboard'));
const PlatformList = lazy(() => import('./PlatformList'));
const AccountingPage = lazy(() => import('./AccountingPage'));
const BillingPage = lazy(() => import('./BillingPage'));
const BusinessProfilePage = lazy(() => import('./BusinessProfilePage'));
const CRMPage = lazy(() => import('./CRMPage'));
const AgencyOverviewPage = lazy(() => import('./AgencyOverviewPage'));

type AgencyClient = {
  id: number;
  name: string;
  logoUrl?: string | null;
  type?: string | null;
  brandTone?: string | null;
  responseGuidelines?: string | null;
  platformIds?: string[] | null;
  connectedPlatforms?: string[];
};

interface MainAppProps {
  onLogout: () => void;
  onNavigateToAdmin?: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToTerms?: () => void;
  isTrialActive?: boolean;
  trialDaysRemaining?: number;
  trialResponsesUsed?: number;
  trialLimit?: number;
  onTrialResponseUsed?: () => Promise<void> | void;
}

// Internal Skeleton for Tabs
const TabSkeleton = () => (
  <div className="space-y-6 animate-fade-in w-full">
    <div className="h-8 w-64 skeleton rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 skeleton rounded-xl"></div>)}
    </div>
    <div className="h-96 w-full skeleton rounded-xl"></div>
  </div>
);

const MainApp: React.FC<MainAppProps> = ({ 
  onLogout, 
  onNavigateToAdmin, 
  lang, 
  setLang, 
  theme, 
  toggleTheme, 
  onNavigateToPrivacy,
  onNavigateToTerms,
  isTrialActive = false,
  trialDaysRemaining = 0,
  trialResponsesUsed = 0,
  trialLimit = 10,
  onTrialResponseUsed
}) => {
  const { signOut } = useClerk();
  const generateResponse = useGenerateResponse();
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'analytics' | 'platforms' | 'pricing' | 'accounting' | 'business-profile' | 'crm' | 'social-manager' | 'team' | 'agency'>('overview');
  const [currentReview, setCurrentReview] = useState<ReviewData | null>(null);
  const [history, setHistory] = useState<ReviewData[]>([]);
  const [agencyClients, setAgencyClients] = useState<AgencyClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [agencyOverview, setAgencyOverview] = useState<Array<{
    clientId: number;
    clientName: string;
    logoUrl?: string | null;
    pendingReviews: number;
    averageRating: number;
    responsesThisWeek: number;
    connectedPlatforms: string[];
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Subscription state vem do hook useSubscription (Fase 4.3b parte 2).
  // Não há mais useState local nem localStorage — fonte única de verdade na BD.
  const subscription = useSubscription();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("Faz upgrade para desbloquear esta funcionalidade.");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Persistence hooks optimized
  useEffect(() => {
    const savedHistory = localStorage.getItem(`responderja_history_${selectedClientId ?? 'default'}`);
    if (savedHistory) {
      try {
        const hydrated = JSON.parse(savedHistory).map((item: any) => ({
            ...item, createdAt: new Date(item.createdAt)
        }));
        setHistory(hydrated);
      } catch (e) { console.error(e); }
    } else {
      setHistory([]);
    }
  }, [selectedClientId]);

  useEffect(() => {
    localStorage.setItem(`responderja_history_${selectedClientId ?? 'default'}`, JSON.stringify(history));
  }, [history, selectedClientId]);

  const t = translations[lang].app;
  const nav = translations[lang].nav;
  const normalizedPlan = normalizePlan(subscription.planId);
  const planCapabilities = PLAN_CAPABILITIES[normalizedPlan];
  const isAgencyPlan = planCapabilities.hasClientManagement;

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/agency') setActiveTab('agency');
    if (path === '/leads') setActiveTab('crm');
  }, []);

  useEffect(() => {
    const loadAgencyData = async () => {
      if (!isAgencyPlan) return;
      try {
        const [clientsRes, overviewRes] = await Promise.all([
          fetch('/api/agency/clients'),
          fetch('/api/agency/overview'),
        ]);
        if (clientsRes.ok) {
          const clients = await clientsRes.json();
          setAgencyClients(clients || []);
          if (!selectedClientId && clients?.length > 0) {
            setSelectedClientId(clients[0].id);
          }
        }
        if (overviewRes.ok) {
          const overview = await overviewRes.json();
          setAgencyOverview(overview.clients || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados de agência:', error);
      }
    };
    loadAgencyData();
  }, [isAgencyPlan, selectedClientId]);

  // Memoized stats to prevent re-calculations on re-renders
  const { creditLimit, creditsLeft, usagePercentage } = useMemo(() => {
    const limitFromPlan = planCapabilities.maxResponses;
    const limit = limitFromPlan < 0 ? Number.MAX_SAFE_INTEGER : limitFromPlan;
    // creditsLeft vem directamente do hook (subscription.creditsRemaining)
    // — é o saldo real na BD, não calculado.
    const left = subscription.creditsRemaining ?? 0;
    const used = subscription.creditsUsedThisPeriod ?? 0;
    return {
      creditLimit: limit,
      creditsLeft: left,
      usagePercentage: limit === Number.MAX_SAFE_INTEGER ? 0 : Math.min((used / limit) * 100, 100)
    };
  }, [subscription, planCapabilities]);

  const handleGenerate = async (data: Omit<ReviewData, 'id' | 'createdAt'>) => {
    console.log('button clicked');
    if (isTrialActive && trialResponsesUsed >= trialLimit) {
      setError("Limite de 10 respostas do trial atingido. Faz upgrade para continuar.");
      setShowUpgradeModal(true);
      return;
    }

    if (subscription.creditsRemaining <= 0 && subscription.creditsTotal !== -1) {
        setShowUpgradeModal(true);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const selectedClient = agencyClients.find((c) => c.id === selectedClientId);
      const businessContext = selectedClient ? {
        businessName: selectedClient.name,
        businessType: selectedClient.type || undefined,
        location: '',
        localSeoKeywords: selectedClient.platformIds || [],
      } : undefined;
      const result = await generateResponse({ ...data, id: 'temp', createdAt: new Date() }, businessContext);
      const finishedReview: ReviewData = { 
        ...data, id: Date.now().toString(), createdAt: new Date(), isFavorite: false,
        generatedResponse: result.response, sentiment: result.sentiment, keywords: result.keywords,
        establishmentId: selectedClientId || undefined,
        establishmentName: selectedClient?.name
      };
      setCurrentReview(finishedReview);
      setHistory(prev => [finishedReview, ...prev]);
      if (isTrialActive && onTrialResponseUsed) {
        await onTrialResponseUsed();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao gerar resposta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromReview = async (review: ReviewData) => {
    await handleGenerate({
      platform: review.platform,
      customerName: review.customerName,
      rating: review.rating,
      reviewText: review.reviewText,
      tone: review.tone,
      language: review.language,
      extraInstructions: review.extraInstructions,
      responseType: review.responseType,
    });
    setActiveTab('generate');
  };

  const openUpgradeModal = (description: string) => {
    setUpgradeModalMessage(description);
    setShowUpgradeModal(true);
  };

  const NavButton = ({ tab, icon: Icon, label, onClick, locked = false }: { tab?: typeof activeTab, icon: any, label: string, onClick?: () => void, locked?: boolean }) => (
    <button
      onClick={() => {
        if (locked) {
          openUpgradeModal("O teu plano atual não inclui esta funcionalidade.");
          return;
        }
        if (onClick) onClick();
        else if (tab) setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
        activeTab === tab && !onClick && !locked
          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {activeTab === tab && !onClick && !locked && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full" />
      )}
      <Icon size={18} className={`${activeTab === tab ? 'scale-110 text-brand-600' : 'group-hover:scale-105'}`} />
      {label}
      {locked && <Lock size={14} className="ml-auto text-amber-500" />}
    </button>
  );

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex overflow-hidden">
      
      {/* Sidebar optimized for repaint */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Logo className="w-8 h-8 text-brand-600" />
            <h1 className="text-xl font-bold tracking-tight">Responder Já</h1>
          </div>
          <p className="text-[10px] text-slate-400 font-medium pl-10 uppercase tracking-widest">AI Command Center</p>
        </div>

        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <NavButton tab="overview" icon={LayoutDashboard} label={nav.menu.overview} />
          <NavButton tab="generate" icon={MessageSquareText} label={nav.menu.generate} />
          <NavButton tab="social-manager" icon={Share2} label={nav.menu.social} />
          <NavButton tab="analytics" icon={Activity} label={nav.menu.dashboard} locked={!planCapabilities.hasAnalytics} />
          {isAgencyPlan && <NavButton tab="crm" icon={Users} label={nav.menu.crm} />}
          <NavButton tab="business-profile" icon={Store} label={nav.menu.profile} />
          <NavButton tab="platforms" icon={List} label={nav.menu.platforms} />
          {isAgencyPlan && <NavButton tab="agency" icon={Building2} label="Agency" />}
          <NavButton tab="pricing" icon={CreditCard} label={nav.menu.plans} />
        </div>

        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
             <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1.5 px-1">
                    <span>{nav.usage}</span>
                    <span>{subscription.creditsUsedThisPeriod}/{creditLimit}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${usagePercentage}%` }}></div>
                </div>
             </div>

             <div className="flex items-center justify-between gap-2">
                <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                    {theme === 'light' ? <Moon size={16}/> : <Sun size={16} />}
                </button>
                <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
                    {['pt', 'en'].map((l) => (
                        <button key={l} onClick={() => setLang(l as Language)} className={`text-[10px] font-bold px-2 py-1 rounded ${lang === l ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}>
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                    <LogOut size={16} />
                </button>
             </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2"><Menu size={20} /></button>
            <div className="flex items-center gap-2"><Logo size={20} /><span className="font-bold">Responder Já</span></div>
            <div className="w-10"></div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* Banner Trial sem créditos — Fase 4.3c */}
          {subscription.isTrialing && subscription.creditsRemaining <= 0 && (
            <div
              role="alert"
              className="sticky top-0 z-30 mb-6 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-gradient-to-r from-brand-600 to-indigo-700 text-white shadow-md"
            >
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0" aria-hidden="true">🎯</span>
                  <div className="text-sm leading-snug">
                    <strong className="font-semibold">
                      Já usaste todas as {subscription.creditsTotal} respostas do trial.
                    </strong>
                    <span className="block opacity-90">
                      {subscription.daysUntilPeriodEnd && subscription.daysUntilPeriodEnd > 0
                        ? `Tens ${subscription.daysUntilPeriodEnd} ${subscription.daysUntilPeriodEnd === 1 ? 'dia' : 'dias'} para experimentar o resto da app.`
                        : 'O período de trial está prestes a terminar.'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className="self-start sm:self-auto bg-white text-brand-700 hover:bg-brand-50 transition-colors px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm"
                >
                  Ver planos →
                </button>
              </div>
            </div>
          )}
          {isAgencyPlan && (
            <div className="mb-4 flex items-center justify-end">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Negócio:</span>
                <select
                  value={selectedClientId || ''}
                  onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {agencyClients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <Suspense fallback={<TabSkeleton />}>
            <div key={activeTab} className="animate-fade-in">
              {isTrialActive && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    {trialDaysRemaining} dias restantes do teu trial
                    {" "}({trialResponsesUsed}/{trialLimit} respostas usadas)
                  </p>
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h2 className="text-3xl font-bold mb-2">{t.welcome}</h2>
                      <p className="text-brand-100 max-w-xl mb-8">{t.welcomeSubtitle}</p>
                      <button onClick={() => setActiveTab('generate')} className="bg-white text-brand-700 px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
                        {nav.menu.generate} <ArrowRight size={18} />
                      </button>
                    </div>
                    <Bot size={200} className="absolute -right-10 -bottom-10 opacity-10 rotate-12" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { label: "Créditos", val: creditsLeft, icon: Coins, color: "text-amber-500" },
                      { label: "Histórico", val: history.length, icon: History, color: "text-blue-500" },
                      { label: "Saúde IA", val: "Optimal", icon: Activity, color: "text-emerald-500" },
                      { label: "Plano", val: subscription.planId, icon: Crown, color: "text-purple-500", cap: true }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <stat.icon className={`mb-3 ${stat.color}`} size={24} />
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-2xl font-black mt-1 ${stat.cap ? 'capitalize' : ''}`}>{stat.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'generate' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <AssistantTip status={isLoading ? 'loading' : currentReview ? 'success' : 'idle'} />
                    <ReviewForm onGenerate={handleGenerate} isLoading={isLoading} lang={lang} />
                  </div>
                  <div className="lg:sticky lg:top-8">
                    {currentReview ? (
                      <ResponseCard review={currentReview} lang={lang} onUpdate={() => {}} onRegenerate={() => handleGenerate(currentReview)} isRegenerating={isLoading} />
                    ) : (
                      <div className="h-96 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <MessageSquareText size={48} className="mb-4 opacity-20" />
                        <p className="font-medium">{t.waitingInput}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <Dashboard
                  history={history}
                  currentPlan={subscription.planId}
                  responsesRemaining={Math.max(0, creditLimit - subscription.creditsUsedThisPeriod)}
                  onGenerateFromReview={handleGenerateFromReview}
                />
              )}
              {activeTab === 'crm' && isAgencyPlan && <CRMPage lang={lang} />}
              {activeTab === 'social-manager' && <PlatformList lang={lang} establishmentId={selectedClientId} planId={subscription.planId} />}
              {activeTab === 'platforms' && <PlatformList lang={lang} establishmentId={selectedClientId} planId={subscription.planId} />}
              {activeTab === 'business-profile' && <BusinessProfilePage />}
              {activeTab === 'agency' && isAgencyPlan && <AgencyOverviewPage clients={agencyOverview} />}
              {activeTab === 'pricing' && <BillingPage lang={lang} />}
              {activeTab === 'accounting' && <AccountingPage />}
            </div>
          </Suspense>
        </main>
      </div>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        description={upgradeModalMessage}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          setActiveTab('pricing');
        }}
      />
    </div>
  );
}

export default MainApp;
