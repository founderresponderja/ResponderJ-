import React, { useState } from 'react';
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
  FileText
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
import CRMPage from './CRMPage';
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
}

// Plan definitions map for easy access
const PLAN_LIMITS: Record<PlanId, number> = {
    trial: 10,
    regular: 50,
    pro: 150,
    agency: 500
};

// Mock data for App Updates
const APP_UPDATES = [
  {
    version: "2.5.0",
    date: "20 Jan 2025",
    title: "IA Mais Inteligente & Contabilidade",
    description: "Atualizámos o nosso modelo de IA para o Gemini 2.5 para respostas mais naturais e empáticas. Lançámos também o novo módulo de Contabilidade para ENI e Unipessoais.",
    tags: ["IA", "Novo Módulo"]
  },
  {
    version: "2.4.0",
    date: "10 Jan 2025",
    title: "CRM & Calendário Social",
    description: "Agora pode gerir os seus clientes no novo CRM integrado e planear os seus posts no Calendário de Redes Sociais.",
    tags: ["CRM", "Social"]
  },
  {
    version: "2.3.5",
    date: "05 Jan 2025",
    title: "Favoritos & Histórico",
    description: "Adicionámos a possibilidade de marcar respostas como favoritas e melhorámos a pesquisa no histórico.",
    tags: ["Melhoria"]
  }
];

const MainApp: React.FC<MainAppProps> = ({ onLogout, onNavigateToAdmin, lang, setLang, theme, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'analytics' | 'platforms' | 'pricing' | 'accounting' | 'invoicing' | 'business-profile' | 'calendar' | 'crm'>('overview');
  const [currentReview, setCurrentReview] = useState<ReviewData | null>(null);
  const [history, setHistory] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Subscription State
  const [subscription, setSubscription] = useState<UserSubscription>({
      planId: 'trial',
      creditsUsed: 0,
      startDate: new Date()
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const t = translations[lang].app;
  const nav = translations[lang].nav;

  // Derived state
  const creditLimit = PLAN_LIMITS[subscription.planId];
  const creditsLeft = creditLimit - subscription.creditsUsed;
  const usagePercentage = Math.min((subscription.creditsUsed / creditLimit) * 100, 100);

  const handleGenerate = async (data: Omit<ReviewData, 'id' | 'createdAt'>) => {
    // Check Limits
    if (subscription.creditsUsed >= creditLimit) {
        setShowUpgradeModal(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentReview(null);

    // Create temp review object
    const tempReview: ReviewData = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
      isFavorite: false
    };

    try {
      const responseText = await generateResponse(tempReview);
      const finishedReview = { ...tempReview, generatedResponse: responseText };
      
      setCurrentReview(finishedReview);
      setHistory(prev => [finishedReview, ...prev]);
      
      // Deduct credit
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

  const handleUpgrade = async (planId: PlanId) => {
      setIsProcessingPayment(true);
      try {
          const success = await processReplitPayment(planId);
          if (success) {
              setSubscription(prev => ({
                  ...prev,
                  planId: planId,
                  // We don't reset credits used, just increase the limit implied by planId
                  // unless it's a new billing cycle, but for demo simplicity:
              }));
              setShowUpgradeModal(false);
              setActiveTab('generate'); // Go back to work
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

  // Determine assistant status
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        activeTab === tab && !onClick
          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex">
      
      {/* Sidebar for Desktop */}
      <nav className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
              <Logo className="w-8 h-8" />
              Responder Já
            </h1>
            <p className="text-xs text-slate-400 mt-1">IA para Gestão de Reviews</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <NavButton tab="overview" icon={LayoutDashboard} label="Visão Geral" />
          <NavButton tab="generate" icon={MessageSquareText} label={nav.menu.generate} />
          <NavButton tab="analytics" icon={Activity} label={nav.menu.dashboard} />
          <NavButton tab="crm" icon={Users} label={nav.menu.crm} />
          <NavButton tab="calendar" icon={CalendarIcon} label={nav.menu.calendar} />
          <NavButton tab="business-profile" icon={Store} label={nav.menu.profile} />
          <NavButton tab="platforms" icon={List} label={nav.menu.platforms} />
          <NavButton tab="invoicing" icon={FileText} label="Faturação" />
          <NavButton tab="accounting" icon={Calculator} label={nav.menu.accounting} />
          <NavButton tab="pricing" icon={CreditCard} label={nav.menu.plans} />
          
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <NavButton icon={GitBranch} label="Novidades" onClick={() => setShowChangelog(true)} />
          </div>

          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 mt-1"
            >
              <ShieldCheck size={20} />
              Admin
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-4">
             {/* Usage Bar */}
             <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{nav.usage}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{subscription.creditsUsed}/{creditLimit}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${usagePercentage > 90 ? 'bg-red-500' : 'bg-brand-500'}`}
                        style={{ width: `${usagePercentage}%` }}
                    ></div>
                </div>
                {subscription.planId === 'trial' && (
                    <button 
                        onClick={() => setActiveTab('pricing')}
                        className="mt-2 w-full text-xs flex items-center justify-center gap-1 bg-gradient-to-r from-brand-600 to-indigo-600 text-white py-1.5 rounded hover:shadow-md transition-all font-bold"
                    >
                        <Zap size={12} fill="currentColor" /> {nav.upgrade}
                    </button>
                )}
             </div>

             <div className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg">
                <button 
                    onClick={toggleTheme}
                    className="p-1.5 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    {theme === 'light' ? <Moon size={16}/> : <Sun size={16} />}
                </button>
                <div className="flex gap-1">
                    {(['pt', 'en', 'es'] as Language[]).map((l) => (
                        <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lang === l ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
             </div>

            <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
            >
                <LogOut size={20} />
                {nav.logout}
            </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 dark:text-slate-300">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
              <Logo className="w-6 h-6" />
              Responder Já
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex flex-col items-end mr-2">
               <span className="text-[10px] uppercase font-bold text-slate-400">Créditos</span>
               <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{creditsLeft}</span>
             </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-8 justify-between items-center sticky top-0 z-30 shadow-sm">
           <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {activeTab === 'overview' && 'Visão Geral'}
                {activeTab === 'generate' && 'Gerar Resposta'}
                {activeTab === 'analytics' && 'Estatísticas'}
                {activeTab === 'crm' && 'Gestão de Clientes'}
                {activeTab === 'calendar' && 'Calendário Social'}
                {activeTab === 'business-profile' && 'Perfil de Negócio'}
                {activeTab === 'platforms' && 'Aplicações Conectadas'}
                {activeTab === 'invoicing' && 'Faturação'}
                {activeTab === 'accounting' && 'Contabilidade'}
                {activeTab === 'pricing' && 'Planos e Faturação'}
              </h2>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
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
                 <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                    US
                 </div>
              </div>
           </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold mb-2">Bem-vindo ao Responder Já</h2>
                  <p className="text-brand-100 max-w-xl text-lg">
                    A sua central de inteligência artificial para gestão de reputação. 
                    Você tem <span className="font-bold text-white">{creditsLeft} créditos</span> disponíveis para usar hoje.
                  </p>
                  <button 
                    onClick={() => setActiveTab('generate')}
                    className="mt-6 bg-white text-brand-600 px-6 py-2.5 rounded-lg font-bold hover:bg-brand-50 transition-colors shadow-md inline-flex items-center gap-2"
                  >
                    Começar a Gerar <ArrowRight size={18} />
                  </button>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10">
                  <Bot size={200} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                      <Coins className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      Disponível
                    </span>
                  </div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Créditos</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{creditsLeft}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                      <MessageSquareText className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Respostas Geradas</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{history.length}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                      <Bot className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                      v2.5
                    </span>
                  </div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Modelo IA</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">Gemini</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                      <Crown className="w-6 h-6" />
                    </div>
                    <button onClick={() => setActiveTab('pricing')} className="text-xs font-bold text-brand-600 hover:underline">
                      Gerir
                    </button>
                  </div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Plano Ativo</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white capitalize">{subscription.planId}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Ações Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button 
                    onClick={() => setActiveTab('generate')}
                    className="group p-6 bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-purple-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                      <MessageSquareText size={24} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Gerar Resposta</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Crie respostas inteligentes para as suas reviews em segundos.</p>
                  </button>

                  <button 
                    onClick={() => setActiveTab('analytics')}
                    className="group p-6 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-blue-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                      <History size={24} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Histórico</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Consulte e analise todas as respostas geradas anteriormente.</p>
                  </button>

                  <button 
                    onClick={() => setActiveTab('business-profile')}
                    className="group p-6 bg-gradient-to-br from-green-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-green-100 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 transition-all text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-4 group-hover:scale-110 transition-transform">
                      <Store size={24} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Perfil de Negócio</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure a voz e informações da sua empresa para a IA.</p>
                  </button>
                </div>
              </div>

              {/* Admin Card if applicable */}
              {onNavigateToAdmin && (
                <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-lg">
                      <ShieldCheck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Área de Administração</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Gerir utilizadores, planos e configurações do sistema.</p>
                    </div>
                  </div>
                  <button 
                    onClick={onNavigateToAdmin}
                    className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Aceder
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="space-y-6">
                
                {/* Header section with Assistant */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">{t.generatorTitle}</h2>
                  <AssistantTip status={assistantStatus} />
                </div>

                {/* Limit Alert */}
                {subscription.creditsUsed >= creditLimit && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3">
                        <Zap className="text-amber-500 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400">{t.limitReachedTitle}</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t.limitReachedDesc}</p>
                            <button 
                              onClick={() => setShowUpgradeModal(true)}
                              className="mt-3 text-sm font-bold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
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
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg text-sm border border-red-200 dark:border-red-900">
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
            <div className="space-y-8 animate-fade-in">
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
                    <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
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
                     <p className="text-slate-400 dark:text-slate-500 italic">{t.noHistory}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <CRMPage />
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
              <BillingPage theme={theme} />
          )}

        </main>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setShowUpgradeModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-2 z-10"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
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
              {APP_UPDATES.map((update, index) => (
                <div key={index} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 bg-brand-500"></div>
                  
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">v{update.version}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">• {update.date}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{update.title}</h4>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    {update.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {update.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-brand-500" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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