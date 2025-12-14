import React, { useState } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Theme } from '../App';

interface BillingPageProps {
  theme?: Theme;
}

const BillingPage: React.FC<BillingPageProps> = ({ theme }) => {
  // Mock Data mimicking the provided file
  const subscription = {
    plan: "Enterprise",
    status: "active",
    currentPeriodStart: "2025-08-01",
    currentPeriodEnd: "2025-09-01",
    amount: 149,
    currency: "EUR"
  };

  const invoices = [
    { id: "INV-2025-08-001", date: "2025-08-01", amount: 149, status: "paid", description: "Plano Enterprise - Agosto 2025", downloadUrl: "#" },
    { id: "INV-2025-07-001", date: "2025-07-01", amount: 149, status: "paid", description: "Plano Enterprise - Julho 2025", downloadUrl: "#" },
    { id: "INV-2025-06-001", date: "2025-06-01", amount: 149, status: "paid", description: "Plano Enterprise - Junho 2025", downloadUrl: "#" }
  ];

  const usage = {
    creditsUsed: 3450,
    creditsLimit: 10000,
    responsesGenerated: 275,
    responsesLimit: 1000
  };

  const [paymentMethods, setPaymentMethods] = useState([
    { id: "1", brand: "Visa", last4: "4242", expiry: "12/2028", holder: "Ricardo Silva", isDefault: true },
    { id: "2", brand: "Mastercard", last4: "8888", expiry: "09/2026", holder: "Ricardo Silva", isDefault: false }
  ]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch(status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case "paid": return "Pago";
      case "active": return "Ativo";
      case "pending": return "Pendente";
      case "failed": return "Falhado";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const getPlanIcon = (plan: string) => {
    switch(plan.toLowerCase()) {
      case "enterprise": return <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "professional": return <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "basic": return <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default: return <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Faturação e Subscrição</h2>
            <p className="text-slate-500 dark:text-slate-400">Gerir o seu plano, métodos de pagamento e facturas.</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="overview" className="rounded-lg">Visão Geral</TabsTrigger>
                <TabsTrigger value="subscription" className="rounded-lg">Subscrição</TabsTrigger>
                <TabsTrigger value="invoices" className="rounded-lg">Facturas</TabsTrigger>
                <TabsTrigger value="usage" className="rounded-lg">Utilização</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    {getPlanIcon(subscription.plan)}
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Plano {subscription.plan}</CardTitle>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {subscription.amount}€/mês • Próxima cobrança: {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-PT")}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(subscription.status)}`}>
                                {getStatusLabel(subscription.status)}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">10,000</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Créditos incluídos</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">1,000</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Respostas por mês</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">∞</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Utilizadores</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Actualizar Plano
                            </button>
                            <button className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Gerir Subscrição
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gasto este Mês</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{subscription.amount}€</p>
                                </div>
                                <Euro className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Créditos Utilizados</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{usage.creditsUsed.toLocaleString()}</p>
                                </div>
                                <Activity className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Facturas Pagas</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{invoices.filter(s=>s.status==="paid").length}</p>
                                </div>
                                <FileText className="w-8 h-8 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Próximo Pagamento</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{subscription.amount}€</p>
                                    <p className="text-xs text-slate-500">{new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-PT")}</p>
                                </div>
                                <Clock className="w-8 h-8 text-orange-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes da Subscrição</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Altere o seu plano ou actualize método de pagamento</p>
                </div>
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano Actual</label>
                                <p className="text-lg font-semibold text-slate-900 dark:text-white">{subscription.plan}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                                <div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusColor(subscription.status)}`}>
                                        {getStatusLabel(subscription.status)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Período de Facturação</label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {new Date(subscription.currentPeriodStart).toLocaleDateString("pt-PT")} - {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-PT")}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valor</label>
                                <p className="text-lg font-semibold text-slate-900 dark:text-white">{subscription.amount}€/mês</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Alterar Plano
                            </button>
                            <button className="border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Cancelar Subscrição
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Métodos de Pagamento</CardTitle>
                            <button className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium">
                                <Plus size={16} /> Adicionar Novo
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {paymentMethods.map(method => (
                            <div key={method.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-900 dark:text-white">{method.brand} •••• {method.last4}</p>
                                            {method.isDefault && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-[10px] font-bold uppercase">
                                                    Padrão
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Expira em {method.expiry}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!method.isDefault && (
                                        <button className="text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400 px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            Definir Padrão
                                        </button>
                                    )}
                                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Facturas</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Descarregue e visualize as suas facturas</p>
                    </div>
                    <button className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <Download className="w-4 h-4" /> Descarregar Todas
                    </button>
                </div>
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {invoices.map(invoice => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{invoice.id}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(invoice.status)}`}>
                                                {getStatusLabel(invoice.status)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{invoice.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                                            <span>Data: {new Date(invoice.date).toLocaleDateString("pt-PT")}</span>
                                            <span>Valor: {invoice.amount}€</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                                            <Download className="w-3 h-3" /> PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-6">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Utilização do Plano</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Monitorize o uso dos seus recursos</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Créditos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Utilizados</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{usage.creditsUsed.toLocaleString()}/ {usage.creditsLimit.toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-purple-600 rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${(usage.creditsUsed / usage.creditsLimit) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                    {Math.round((usage.creditsLimit - usage.creditsUsed) / usage.creditsLimit * 100)}% restantes
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Respostas Geradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Este mês</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{usage.responsesGenerated} / {usage.responsesLimit}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${(usage.responsesGenerated / usage.responsesLimit) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                    {usage.responsesLimit - usage.responsesGenerated} respostas restantes
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
};

export default BillingPage;