import React, { useState } from 'react';
import { MessageSquareText, LayoutDashboard, List, LogOut, Sun, Moon, CreditCard, Zap, X, Calculator, Activity, ShieldCheck } from 'lucide-react';
import ReviewForm from './ReviewForm';
import ResponseCard from './ResponseCard';
import Dashboard from './Dashboard';
import PlatformList from './PlatformList';
import AssistantTip from './AssistantTip';
import PricingSection from './PricingSection';
import AccountingPage from './AccountingPage';
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

const MainApp: React.FC<MainAppProps> = ({ onLogout, onNavigateToAdmin, lang, setLang, theme, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'dashboard' | 'platforms' | 'pricing' | 'accounting'>('generate');
  const [currentReview, setCurrentReview] = useState<ReviewData | null>(null);
  const [history, setHistory] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Subscription State
  const [subscription, setSubscription] = useState<UserSubscription>({
      planId: 'trial',
      creditsUsed: 0,
      startDate: new Date()
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // Determine assistant status
  let assistantStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  if (isLoading) assistantStatus = 'loading';
  else if (error) assistantStatus = 'error';
  else if (currentReview) assistantStatus = 'success';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 md:pb-0 transition-colors duration-300">
      
      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <nav className="fixed md:left-0 md:top-0 md:h-screen md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 md:flex flex-col z-50 hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
            <Logo className="w-8 h-8" />
            Responder Já
          </h1>
          <p className="text-xs text-slate-400 mt-1">IA para Gestão de Reviews</p>
        </div>

        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('generate')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'generate' 
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquareText size={20} />
            {nav.menu.generate}
          </button>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard size={20} />
            {nav.menu.dashboard}
          </button>

          <button
            onClick={() => setActiveTab('platforms')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'platforms' 
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <List size={20} />
            {nav.menu.platforms}
          </button>

          <button
            onClick={() => setActiveTab('accounting')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'accounting' 
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Calculator size={20} />
            {nav.menu.accounting}
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pricing' 
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard size={20} />
            {nav.menu.plans}
          </button>

          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 mt-4 border-t border-slate-100 dark:border-slate-800"
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

      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40 flex justify-between items-center">
        <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
          <Logo className="w-6 h-6" />
          Responder Já
        </h1>
        <div className="flex gap-2">
             <button onClick={toggleTheme} className="text-slate-400 dark:text-slate-500">
                {theme === 'light' ? <Moon size={20}/> : <Sun size={20} />}
             </button>
            <button onClick={onLogout} className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400">
                <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="md:ml-64 p-4 md:p-8 max-w-5xl mx-auto">
        
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

            <div className="lg:sticky lg:top-8 space-y-6">
               {currentReview ? (
                  <>
                    <ResponseCard review={currentReview} lang={lang} />
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

        {activeTab === 'dashboard' && (
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
                  <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded">
                        {review.platform}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {review.createdAt.toLocaleDateString()}
                      </span>
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

        {activeTab === 'platforms' && (
          <PlatformList lang={lang} />
        )}

        {activeTab === 'accounting' && (
          <AccountingPage />
        )}

        {activeTab === 'pricing' && (
            <div className="animate-fade-in">
                 <PricingSection 
                    lang={lang} 
                    currentPlanId={subscription.planId} 
                    onSelectPlan={handleUpgrade} 
                    isProcessing={isProcessingPayment}
                 />
            </div>
        )}

      </main>

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

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 md:hidden z-50">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${activeTab === 'generate' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <MessageSquareText size={24} />
            Gerar
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${activeTab === 'dashboard' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <LayoutDashboard size={24} />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('accounting')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${activeTab === 'accounting' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <Calculator size={24} />
            Contab
          </button>
      </div>

    </div>
  );
}

export default MainApp;