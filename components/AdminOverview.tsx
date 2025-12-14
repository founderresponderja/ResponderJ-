import React from 'react';
import { 
  Users, 
  Activity, 
  CreditCard, 
  Server, 
  Shield, 
  Clock, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  FileText,
  Settings,
  UserPlus,
  ArrowUpRight,
  UserCog,
  Key,
  BarChart,
  Wallet,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  // Mock Data mimicking the provided logic
  const stats = {
    totalUsers: 127,
    activeUsers: 85,
    totalRevenue: 12450,
    systemHealth: "optimal",
    securityScore: 95,
    uptime: "99.9%",
    totalInvoices: 34,
    totalTransactions: 156,
    criticalAlerts: 0
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-t-0 border-r-0 border-b-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Utilizadores Totais</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalUsers}</h3>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm text-slate-500 mt-2">{stats.activeUsers} ativos hoje</p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-t-0 border-r-0 border-b-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Receita Total</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">€{stats.totalRevenue.toLocaleString()}</h3>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm text-slate-500 mt-2">{stats.totalInvoices} facturas emitidas</p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-t-0 border-r-0 border-b-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saúde do Sistema</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2 capitalize">{stats.systemHealth}</h3>
              </div>
              <Activity className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm text-slate-500 mt-2">Uptime: {stats.uptime}</p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-t-0 border-r-0 border-b-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pontuação Segurança</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.securityScore}%</h3>
              </div>
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-slate-500 mt-2">{stats.criticalAlerts} alertas críticos</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* System Management */}
        <Card className="shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <Server className="h-5 w-5" /> Gestão do Sistema
              </h3>
              <p className="text-xs text-slate-500 mt-1">Controlo total sobre utilizadores e configurações</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => onNavigate('users')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <UserCog className="mr-2 h-4 w-4" /> Gestão de Utilizadores
              </button>
              <button onClick={() => onNavigate('roles')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <ShieldCheck className="mr-2 h-4 w-4" /> Segurança Avançada
              </button>
              <button onClick={() => onNavigate('api-keys')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Key className="mr-2 h-4 w-4" /> Configurações API
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Business Intelligence */}
        <Card className="shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <BarChart className="h-5 w-5" /> Business Intelligence
              </h3>
              <p className="text-xs text-slate-500 mt-1">Analytics avançados e relatórios detalhados</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => onNavigate('analytics')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <TrendingUp className="mr-2 h-4 w-4" /> Analytics Globais
              </button>
              <button onClick={() => onNavigate('banking')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Wallet className="mr-2 h-4 w-4" /> Gestão Bancária
              </button>
              <button onClick={() => onNavigate('reports')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <FileText className="mr-2 h-4 w-4" /> Relatórios Financeiros
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Status */}
        <Card className="shadow-sm lg:col-span-2 xl:col-span-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <Activity className="h-5 w-5" /> Estado da Plataforma
              </h3>
              <p className="text-xs text-slate-500 mt-1">Monitorização em tempo real</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Base de Dados</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-3 h-3" /> Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">API Services</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-3 h-3" /> Funcionais
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup Status</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3 h-3" /> Há 2h
                </span>
              </div>
              {stats.criticalAlerts > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-600">Alertas Críticos</span>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> {stats.criticalAlerts} ativos
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Overview */}
        <Card className="shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <Wallet className="h-5 w-5" /> Visão Geral Financeira
              </h3>
              <p className="text-xs text-slate-500 mt-1">Resumo das transacções e facturação</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="font-medium text-slate-700 dark:text-slate-300">Transacções Hoje</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalTransactions}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="font-medium text-slate-700 dark:text-slate-300">Facturas Pendentes</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">3</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="font-medium text-slate-700 dark:text-slate-300">Reconciliações Pendentes</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">7</span>
              </div>
              <button onClick={() => onNavigate('banking')} className="w-full text-center py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Ver Detalhes Financeiros
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <Zap className="h-5 w-5" /> Acções Rápidas
              </h3>
              <p className="text-xs text-slate-500 mt-1">Operações frequentes de super admin</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => onNavigate('users')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <UserPlus className="mr-2 h-4 w-4" /> Criar Novo Utilizador
              </button>
              <button onClick={() => onNavigate('reports')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <ShieldCheck className="mr-2 h-4 w-4" /> Relatório de Segurança
              </button>
              <button onClick={() => onNavigate('monitoring')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Database className="mr-2 h-4 w-4" /> Backup do Sistema
              </button>
              <button onClick={() => onNavigate('settings')} className="w-full flex items-center justify-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                <Settings className="mr-2 h-4 w-4" /> Configurações Globais
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
