
import React, { useState, useEffect } from 'react';
import { 
  MessageSquareText, 
  LayoutDashboard, 
  List, 
  LogOut, 
  Sun, 
  Moon, 
  CreditCard, 
  Zap, 
  X, 
  Calculator, 
  Activity, 
  ShieldCheck, 
  Store, 
  Calendar as CalendarIcon,
  Bot,
  Coins,
  Crown,
  History,
  ArrowRight,
  Menu,
  Users,
  Heart,
  GitBranch,
  CheckCircle2,
  Sparkles,
  FileText,
  Shield,
  Share2,
  UserCog,
  Compass
} from 'lucide-react';
import ReviewForm from './ReviewForm';
import ResponseCard from './ResponseCard';
import Dashboard from './Dashboard';
import PlatformList from './PlatformList';
import AssistantTip from './AssistantTip';
import PricingSection from './PricingSection';
import AccountingPage from './AccountingPage';
import InvoicingPage from './InvoicingPage';
import BillingPage from './BillingPage';
import BusinessProfilePage from './BusinessProfilePage';
import SocialMediaCalendar from './SocialMediaCalendar';
import SocialMediaManager from './SocialMediaManager';
import CRMPage from './CRMPage';
import AgencyTeamManagement from './AgencyTeamManagement';
import BusinessDiscoveryPage from './BusinessDiscoveryPage';
import { Logo } from './Logo';
import { generateResponse } from '../services/geminiService';
import { processReplitPayment } from '../services/paymentService';
import { ReviewData, PlanId, UserSubscription } from '../types';
import { translations, Language } from '../utils/translations';
import { Theme } from '../App';

interface MainAppProps {
  onLogout: () => void;
  onNavigateToAdmin?: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToTerms?: () => void;
}

// Plan definitions map for easy access
const PLAN_LIMITS: Record<PlanId, number> = {
    trial: 10,
    regular: 50,
    pro: 150,
    agency: 500
};

const MainApp: React.FC<MainAppProps> = ({ 
  onLogout, 
  onNavigateToAdmin, 
  lang, 
  setLang, 
  theme, 
  toggleTheme, 
  onNavigateToPrivacy,
  onNavigateToTerms 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'analytics' | 'platforms' | 'pricing' | 'accounting' | 'invoicing' | 'business-profile' | 'calendar' | 'crm' | 'social-manager' | 'team' | 'discovery'>('overview');
  const [currentReview, setCurrentReview] = useState<ReviewData | null>(null);
  const [history, setHistory] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [subscription, setSubscription] = useState<UserSubscription>({
      planId: 'trial',
      creditsUsed: 0,
      startDate: new Date()
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // Load persistence
  useEffect(() => {
    const savedHistory = localStorage.getItem('responderja_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const hydrated = parsed.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
        }));
        setHistory(hydrated);
      } catch (e) { console.error("Failed to load history", e); }
    }

    const savedSub = localStorage.getItem('responderja_subscription');
    if (savedSub) {
      try {
        const parsed = JSON.parse(savedSub);
        setSubscription({
            ...parsed,
            startDate: new Date(parsed.startDate)
        });
      } catch (e) { console.error("Failed to load subscription", e); }
    }
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('responderja_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('responderja_subscription', JSON.stringify(subscription));
  }, [subscription]);

  const t = translations[lang].app;
  const nav = translations[lang].nav;

  // Derived state
  const creditLimit = PLAN_LIMITS[subscription.planId];
  const creditsLeft = creditLimit - subscription.creditsUsed;
  const usagePercentage = Math.min((subscription.creditsUsed / creditLimit) * 100, 100);

  const handleGenerate = async (data: Omit<ReviewData, 'id' | 'createdAt'>) => {
    if (subscription.creditsUsed >= creditLimit) {
        setShowUpgradeModal(true);
        return;
    }

    setIsLoading(true);
    setError(null);

    const tempReview: ReviewData = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
      isFavorite: false
    };

    try {
      let businessContext = undefined;
      const savedProfile = localStorage.getItem('demo_business_profile');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          businessContext = {
            businessName: profile.businessName,
            businessType: profile.businessType,
            description: profile.description,
            responseGuidelines: profile.responseGuidelines
          };
        } catch (e) {
          console.warn("Failed to parse business profile");
        }
      }

      const result = await generateResponse(tempReview, businessContext);
      
      const finishedReview: ReviewData = { 
        ...tempReview, 
        generatedResponse: result.response,
        sentiment: result.sentiment,
        keywords: result.keywords
      };
      
      setCurrentReview(finishedReview);
      setHistory(prev => [finishedReview, ...prev]);
      
      setSubscription(prev => ({
          ...prev,
          creditsUsed: prev.creditsUsed + 1
      }));

    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao gerar resposta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateResponse = (id: string, newResponse: string) => {
    if (currentReview && currentReview.id === id) {
      setCurrentReview({ ...currentReview, generatedResponse: newResponse });
    }
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, generatedResponse: newResponse } : item
    ));
  };

  const handleRegenerate = () => {
    if (currentReview) {
       const { id, createdAt, generatedResponse, isFavorite, sentiment, keywords, ...rest } = currentReview;
       handleGenerate(rest);
    }
  };

  const handleUpgrade = async (planId: PlanId) => {
      setIsProcessingPayment(true);
      try {
          const success = await processReplitPayment(planId);
          if (success) {
              setSubscription(prev => ({
                  ...prev,
                  planId: planId,
              }));
              setShowUpgradeModal(false);
              setActiveTab('generate');
          }
      } catch (e) {
          alert("Erro no pagamento.");
      } finally {
          setIsProcessingPayment(false);
      }
  };

  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
    
    if (currentReview && currentReview.id === id) {
      setCurrentReview(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  let assistantStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  if (isLoading) assistantStatus = 'loading';
  else if (error) assistantStatus = 'error';
  else if (currentReview) assistantStatus = 'success';

  const NavButton = ({ tab, icon: Icon, label, onClick }: { tab?: typeof activeTab, icon: any, label: string, onClick?: () => void }) => (
    <button
      onClick={() => {
        if (onClick) onClick();
        else if (tab) setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
        activeTab === tab && !onClick
          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {activeTab === tab && !onClick && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full" />
      )}
      <Icon size={20} className={`transition-transform duration-300 ${activeTab === tab ? 'scale-110' : 'group-hover:scale-105'}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex overflow-hidden">
      
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 flex items-center gap-2">
              <Logo className="w-8 h-8 text-brand-600 dark:text-brand-400" />
              Responder Já
            </h1>
            <p className="text-xs text-slate-400 mt-1 pl-10">IA para Gestão de Reviews</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <NavButton tab="overview" icon={LayoutDashboard} label={nav.menu.overview} />
          <NavButton tab="generate" icon={MessageSquareText} label={nav.menu.generate} />
          <NavButton tab="social-manager" icon={Share2} label={nav.menu.social} />
          <NavButton tab="discovery" icon={Compass} label={nav.menu.discovery} />
          <NavButton tab="analytics" icon={Activity} label={nav.menu.dashboard} />
          <NavButton tab="crm" icon={Users} label={nav.menu.crm} />
          <NavButton tab="team" icon={UserCog} label={nav.menu.team} />
          <NavButton tab="calendar" icon={CalendarIcon} label={nav.menu.calendar} />
          <NavButton tab="business-profile" icon={Store} label={nav.menu.profile} />
          <NavButton tab="platforms" icon={List} label={nav.menu.platforms} />
          <NavButton tab="invoicing" icon={FileText} label={nav.menu.invoicing} />
          <NavButton tab="accounting" icon={Calculator} label={nav.menu.accounting} />
          <NavButton tab="pricing" icon={CreditCard} label={nav.menu.plans} />
          
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <NavButton icon={GitBranch} label={nav.menu.news} onClick={() => setShowChangelog(true)} />
          </div>

          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 mt-1 group"
            >
              <ShieldCheck size={20} className="group-hover:text-indigo-500 transition-colors" />
              Admin
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-4 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
             {/* Usage Bar */}
             <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{nav.usage}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{subscription.creditsUsed}/{creditLimit}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-700 ease-out ${usagePercentage > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-brand-500 to-indigo-500'}`}
                        style={{ width: `${usagePercentage}%` }}
                    ></div>
                </div>
                {subscription.planId === 'trial' && (
                    <button 
                        onClick={() => setActiveTab('pricing')}
                        className="mt-3 w-full text-xs flex items-center justify-center gap-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2 rounded-lg hover:opacity-90 transition-all font-bold shadow-sm"
                    >
                        <Zap size={12} fill="currentColor" /> {nav.upgrade}
                    </button>
                )}
             </div>

             <div className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                <button 
                    onClick={toggleTheme}
                    className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                    {theme === 'light' ? <Moon size={16}/> : <Sun size={16} />}
                </button>
                <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    {(['pt', 'en', 'es'] as Language[]).map((l) => (
                        <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${lang === l ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
             </div>

             <div className="flex justify-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
                <button onClick={onNavigateToPrivacy} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1">
                  Privacidade
                </button>
                <span>•</span>
                {onNavigateToTerms ? (
                  <button onClick={onNavigateToTerms} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Termos</button>
                ) : (
                  <button className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Termos</button>
                )}
             </div>

            <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
            >
                <LogOut size={16} />
                {nav.logout}
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 dark:text-slate-300 active:scale-95 transition-transform">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
              <Logo className="w-6 h-6" />
              Responder Já
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
               <Coins size={14} className="text-amber-500" />
               <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{creditsLeft}</span>
             </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 py-4 px-8 justify-between items-center sticky top-0 z-30 transition-all duration-300">
           <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {activeTab === 'overview' && nav.menu.overview}
                {activeTab === 'generate' && nav.menu.generate}
                {activeTab === 'social-manager' && nav.menu.social}
                {activeTab === 'discovery' && nav.menu.discovery}
                {activeTab === 'analytics' && nav.menu.dashboard}
                {activeTab === 'crm' && nav.menu.crm}
                {activeTab === 'team' && nav.menu.team}
                {activeTab === 'calendar' && nav.menu.calendar}
                {activeTab === 'business-profile' && nav.menu.profile}
                {activeTab === 'platforms' && nav.menu.platforms}
                {activeTab === 'invoicing' && nav.menu.invoicing}
                {activeTab === 'accounting' && nav.menu.accounting}
                {activeTab === 'pricing' && nav.menu.plans}
              </h2>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                 <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-700">
                    <Crown className={`w-4 h-4 ${subscription.planId === 'trial' ? 'text-amber-500' : 'text-purple-500'}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{subscription.planId}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{creditsLeft}</span>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-brand-900 dark:to-indigo-900 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-sm shadow-inner border border-white dark:border-slate-700">
                    US
                 </div>
              </div>
           </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          
          <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-brand-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold mb-2 tracking-tight">{t.welcome}</h2>
                  <p className="text-brand-100 max-w-xl text-lg mb-8">
                    {t.welcomeSubtitle}
                    Tem <span className="font-bold text-white border-b border-white/30">{creditsLeft}</span> disponíveis.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                        onClick={() => setActiveTab('generate')}
                        className="bg-white text-brand-600 px-6 py-3 rounded-xl font-bold hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 inline-flex items-center gap-2"
                    >
                        {nav.menu.generate} <ArrowRight size={18} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('discovery')}
                        className="bg-brand-700/50 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all border border-brand-500 inline-flex items-center gap-2 hover:border-white/50"
                    >
                        {nav.menu.discovery} <Compass size={18} />
                    </button>
                  </div>
                </div>
                <div className="absolute right-8 bottom-[-20px] opacity-10 transform rotate-12 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                  <Bot size={220} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Créditos", value: creditsLeft, icon: Coins, color: "text-green-600", bg: "bg-green-100", darkBg: "dark:bg-green-900/30", darkText: "dark:text-green-400", sub: "Disponível" },
                  { title: "Respostas", value: history.length, icon: MessageSquareText, color: "text-blue-600", bg: "bg-blue-100", darkBg: "dark:bg-blue-900/30", darkText: "dark:text-blue-400", sub: "Geradas total" },
                  { title: "Modelo IA", value: "Gemini 2.5", icon: Bot, color: "text-purple-600", bg: "bg-purple-100", darkBg: "dark:bg-purple-900/30", darkText: "dark:text-purple-400", sub: "Latest ver." },
                  { title: "Plano", value: subscription.planId, icon: Crown, color: "text-amber-600", bg: "bg-amber-100", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-400", sub: "Ativo", capitalize: true }
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 ${stat.bg} ${stat.darkBg} rounded-xl ${stat.color} ${stat.darkText}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      {stat.title === "Plano" ? (
                        <button onClick={() => setActiveTab('pricing')} className="text-xs font-bold text-brand-600 hover:underline">Gerir</button>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.bg} ${stat.color} ${stat.darkBg} ${stat.darkText} bg-opacity-50`}>{stat.sub}</span>
                      )}
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.title}</h3>
                    <p className={`text-3xl font-bold text-slate-900 dark:text-white mt-1 ${stat.capitalize ? 'capitalize' : ''}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t.quickActions}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: nav.menu.generate, desc: "Crie respostas inteligentes em segundos.", icon: MessageSquareText, color: "purple", action: () => setActiveTab('generate') },
                    { title: nav.menu.discovery, desc: "Encontre novos clientes potenciais com IA.", icon: Compass, color: "indigo", action: () => setActiveTab('discovery') },
                    { title: nav.menu.profile, desc: "Configure a voz da sua empresa.", icon: Store, color: "green", action: () => setActiveTab('business-profile') }
                  ].map((action, i) => (
                    <button 
                      key={i}
                      onClick={action.action}
                      className={`group p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-${action.color}-300 dark:hover:border-${action.color}-700 transition-all text-left shadow-sm hover:shadow-lg`}
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-${action.color}-50 dark:bg-${action.color}-900/20 flex items-center justify-center text-${action.color}-600 dark:text-${action.color}-400 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon size={24} />
                      </div>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">{action.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Card if applicable */}
              {onNavigateToAdmin && (
                <div className="mt-8 p-6 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                      <ShieldCheck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Área de Administração</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Gerir utilizadores, planos e configurações do sistema.</p>
                    </div>
                  </div>
                  <button 
                    onClick={onNavigateToAdmin}
                    className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg"
                  >
                    Aceder
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                
                {/* Header section with Assistant */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">{t.generatorTitle}</h2>
                  <AssistantTip status={assistantStatus} />
                </div>

                {/* Limit Alert */}
                {subscription.creditsUsed >= creditLimit && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                        <Zap className="text-amber-500 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400">{t.limitReachedTitle}</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t.limitReachedDesc}</p>
                            <button 
                              onClick={() => setShowUpgradeModal(true)}
                              className="mt-3 text-sm font-bold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                            >
                                {t.upgradeNow}
                            </button>
                        </div>
                    </div>
                )}

                <ReviewForm 
                  onGenerate={handleGenerate} 
                  isLoading={isLoading} 
                  lang={lang} 
                />
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg text-sm border border-red-200 dark:border-red-900 animate-slide-in-right">
                    {error}
                  </div>
                )}
              </div>

              <div className="lg:sticky lg:top-24 space-y-6">
                 {currentReview ? (
                    <>
                      <ResponseCard 
                        review={currentReview} 
                        lang={lang} 
                        onToggleFavorite={() => toggleFavorite(currentReview.id)}
                        onUpdate={handleUpdateResponse}
                        onRegenerate={handleRegenerate}
                        isRegenerating={isLoading}
                      />
                    </>
                 ) : (
                   <div className="hidden lg:flex flex-col items-center justify-center h-[500px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-600 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                      <Logo size={48} className="mb-4 opacity-30 grayscale" />
                      <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400">{t.waitingInput}</h3>
                      <p className="max-w-xs mt-2 text-sm">{t.waitingDesc}</p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.dashboardTitle}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t.dashboardDesc}</p>
              </div>
              <Dashboard history={history} />
              
              <div className="mt-8">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  {t.recentHistory}
                </h3>
                <div className="space-y-4">
                  {history.map((review) => (
                    <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded">
                            {review.platform}
                          </span>
                          {review.isFavorite && (
                            <Heart size={14} className="text-rose-500" fill="currentColor" />
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {review.createdAt.toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => toggleFavorite(review.id)}
                            className={`text-slate-400 hover:text-rose-500 transition-colors ${review.isFavorite ? 'text-rose-500' : ''}`}
                          >
                            <Heart size={16} fill={review.isFavorite ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        {review.rating} ★ - {review.customerName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 italic">
                        "{review.reviewText}"
                      </p>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-sm text-slate-700 dark:text-slate-300 text-sm border-l-4 border-brand-400">
                        {review.generatedResponse}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                     <p className="text-slate-400 dark:text-slate-500 italic text-center py-8">{t.noHistory}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <CRMPage lang={lang} />
          )}

          {activeTab === 'team' && (
            <AgencyTeamManagement />
          )}

          {activeTab === 'social-manager' && (
            <SocialMediaManager lang={lang} />
          )}

          {activeTab === 'discovery' && (
            <BusinessDiscoveryPage lang={lang} />
          )}

          {activeTab === 'calendar' && (
            <SocialMediaCalendar lang={lang} />
          )}

          {activeTab === 'platforms' && (
            <PlatformList lang={lang} />
          )}

          {activeTab === 'accounting' && (
            <AccountingPage />
          )}

          {activeTab === 'invoicing' && (
            <InvoicingPage />
          )}

          {activeTab === 'business-profile' && (
            <BusinessProfilePage />
          )}

          {activeTab === 'pricing' && (
              <BillingPage theme={theme} lang={lang} />
          )}
          </div>

        </main>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
                  <button 
                    onClick={() => setShowUpgradeModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-2 z-10 transition-colors"
                  >
                      <X size={24} />
                  </button>
                  <div className="p-4 md:p-8">
                    <PricingSection 
                        lang={lang} 
                        currentPlanId={subscription.planId} 
                        onSelectPlan={handleUpgrade}
                        isProcessing={isProcessingPayment}
                    />
                  </div>
              </div>
          </div>
      )}

      {/* Changelog Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Novidades da Plataforma</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Fique a par das últimas atualizações</p>
                </div>
              </div>
              <button onClick={() => setShowChangelog(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 bg-brand-500"></div>
                  
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">v2.7.0</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">• 01 Fev 2025</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Descoberta de Negócios IA</h4>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    Nova ferramenta para encontrar leads qualificados na sua região usando Inteligência Artificial.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-brand-500" />
                        IA
                      </span>
                  </div>
                </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setShowChangelog(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MainApp;
