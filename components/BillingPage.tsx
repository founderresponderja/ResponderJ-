
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Euro, 
  Download, 
  Zap, 
  Briefcase, 
  Shield, 
  Activity,
  FileText,
  Clock,
  CreditCard,
  Plus,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Theme } from '../App';
import { translations, Language } from '../utils/translations';

interface BillingPageProps {
  theme?: Theme;
  lang: Language;
}

const BillingPage: React.FC<BillingPageProps> = ({ theme, lang }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const t = translations[lang].app.billing;

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/billing/info');
      
      if (!res.ok) {
        if (res.status === 401) {
             throw new Error("Sessão expirada. Por favor faça login novamente.");
        }
        throw new Error("Não foi possível carregar as informações de faturação.");
      }
      
      const data = await res.json();
      setBillingInfo(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      // Fallback to safe defaults if API fails in dev mode without DB
      setBillingInfo({
          subscription: null,
          credits: 0,
          invoices: [],
          currentPlan: 'free'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
      // Logic to trigger Stripe Checkout
      alert(`Iniciar upgrade para plano: ${planId} (Integração Stripe pronta no backend)`);
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch(status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "failed": case "past_due": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    // Basic mapping, could be expanded for more complex statuses or use translation if needed
    switch(status) {
      case "paid": return "Pago";
      case "active": return "Ativo";
      case "pending": return "Pendente";
      case "failed": return "Falhado";
      case "past_due": return "Em Atraso";
      case "cancelled": return "Cancelado";
      default: return status || "Inativo";
    }
  };

  const getPlanIcon = (plan: string) => {
    if (!plan) return <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    switch(plan.toLowerCase()) {
      case "agency": return <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "pro": return <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "starter": return <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default: return <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
      );
  }

  const subscription = billingInfo?.subscription;
  const currentPlanName = subscription?.plan?.name || billingInfo?.currentPlan || "Gratuito";
  const credits = billingInfo?.credits || 0;
  const invoices = billingInfo?.invoices || [];

  return (
    <div className="animate-fade-in space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t.subtitle}</p>
            </div>
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="overview" className="rounded-lg">{t.tabs.overview}</TabsTrigger>
                <TabsTrigger value="subscription" className="rounded-lg">{t.tabs.subscription}</TabsTrigger>
                <TabsTrigger value="invoices" className="rounded-lg">{t.tabs.invoices}</TabsTrigger>
                <TabsTrigger value="usage" className="rounded-lg">{t.tabs.usage}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    {getPlanIcon(currentPlanName)}
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t.plan} {currentPlanName}</CardTitle>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {subscription ? `${subscription.plan.price}€${translations[lang].pricing.month}` : 'Sem custos'} 
                                        {subscription && ` • Renovação: ${new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-PT")}`}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(subscription?.status)}`}>
                                {getStatusLabel(subscription?.status)}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{credits}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{t.availableCredits}</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {subscription?.plan?.monthlyResponses || 10}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{t.monthlyLimit}</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {subscription?.plan?.maxUsers > 0 ? subscription?.plan?.maxUsers : '∞'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{t.users}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setActiveTab('subscription')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {subscription ? t.managePlan : t.upgrade}
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t.monthlyValue}</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{subscription?.plan?.price || 0}€</p>
                                </div>
                                <Euro className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t.creditsStatus}</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{credits > 10 ? 'OK' : 'Baixo'}</p>
                                </div>
                                <Activity className={`w-8 h-8 ${credits > 10 ? 'text-blue-600' : 'text-amber-500'}`} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t.paidInvoices}</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{invoices.length}</p>
                                </div>
                                <FileText className="w-8 h-8 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.values(billingInfo?.availablePlans || {}).map((plan: any) => (
                        <div key={plan.id} className={`p-6 rounded-xl border-2 transition-all ${
                            currentPlanName === plan.name 
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-200'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                                {currentPlanName === plan.name && (
                                    <span className="bg-brand-600 text-white text-xs px-2 py-1 rounded-full">{t.current}</span>
                                )}
                            </div>
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}€</span>
                                <span className="text-slate-500">{translations[lang].pricing.month}</span>
                            </div>
                            <ul className="space-y-3 mb-6">
                                {plan.features.slice(0, 4).map((feature: string, i: number) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={currentPlanName === plan.name}
                                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                                    currentPlanName === plan.name
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                                }`}
                            >
                                {currentPlanName === plan.name ? t.current : t.select}
                            </button>
                        </div>
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        {invoices.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Nenhuma fatura encontrada.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invoices.map((invoice: any) => (
                                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">#{invoice.id.slice(-8)}</h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(invoice.status)}`}>
                                                    {getStatusLabel(invoice.status)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                                                <span>Data: {new Date(invoice.date).toLocaleDateString("pt-PT")}</span>
                                                <span>Valor: {invoice.amount}€</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a 
                                                href={invoice.invoiceUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium transition-colors text-slate-700 dark:text-slate-300"
                                            >
                                                <Download className="w-3 h-3" /> PDF
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="usage">
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Activity className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">O histórico detalhado de utilização estará disponível em breve.</p>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
};

export default BillingPage;
