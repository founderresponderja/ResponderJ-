import React, { useState } from 'react';
import { 
  Users, 
  Activity, 
  CreditCard, 
  Zap, 
  ShieldCheck, 
  GitBranch, 
  Database, 
  Upload, 
  CircleCheckBig, 
  AlertTriangle,
  Server,
  Mail,
  FileText,
  Settings,
  Search,
  ArrowLeft,
  LayoutDashboard,
  Key,
  Landmark,
  Clock,
  BookOpen,
  X
} from 'lucide-react';
import { Theme } from '../App';
import AdminLeadsManagement from './AdminLeadsManagement';
import AdminRolesManagement from './AdminRolesManagement';
import AdminApiKeys from './AdminApiKeys';
import AdminApiManagement from './AdminApiManagement';
import AdminBankingManagement from './AdminBankingManagement';
import AdminContentManagement from './AdminContentManagement';
import AdminCriticalSystems from './AdminCriticalSystems';

interface AdminDashboardProps {
  onBack: () => void;
  theme: Theme;
}

// Mock Data matching the minified file structure
const MOCK_STATS = {
  totalUsers: 1250,
  totalResponses: 45892,
  totalRevenue: 15420,
  activeUsers: 890,
  planStats: {
    basic: 850,
    professional: 320,
    enterprise: 80
  }
};

const MOCK_USERS = [
  { id: 1, firstName: "João", lastName: "Silva", email: "joao@empresa.com", companyName: "Restaurante O Pescador", isActive: true, selectedPlan: "Pro", credits: 450 },
  { id: 2, firstName: "Maria", lastName: "Santos", email: "maria@hotel.com", companyName: "Hotel Central", isActive: true, selectedPlan: "Enterprise", credits: 2500 },
  { id: 3, firstName: "Pedro", lastName: "Costa", email: "pedro@cafe.pt", companyName: "Café da Esquina", isActive: false, selectedPlan: "Basic", credits: 10 },
];

const MOCK_LOGS = [
  { id: 1, type: 'info', message: 'Utilizador registado: joao@empresa.com', timestamp: '2024-01-20 06:40:43' },
  { id: 2, type: 'success', message: 'Resposta gerada para Google Reviews', timestamp: '2024-01-20 06:39:12' },
  { id: 3, type: 'warning', message: 'Tentativa de login falhada: email@teste.com', timestamp: '2024-01-20 06:35:23' },
];

const MOCK_VERSIONS = [
  { 
    version: "v2.5.0", 
    date: "2025-01-20", 
    status: "current",
    author: "Luís Pedrosa", 
    description: "Atualização Major: Integração Gemini 2.5",
    changes: [
      "Migração para modelo Gemini 2.5 Flash",
      "Novo módulo de Gestão Bancária",
      "Exportação CSV de Leads",
      "Filtros avançados no CRM"
    ] 
  },
  { 
    version: "v2.4.5", 
    date: "2025-01-18", 
    status: "deployed",
    author: "Maria Santos", 
    description: "Hotfix: Correções de Segurança",
    changes: [
      "Correção na validação de tokens CSRF",
      "Rate limiting ajustado para API pública",
      "Logs de auditoria melhorados"
    ] 
  },
  { 
    version: "v2.4.0", 
    date: "2025-01-10", 
    status: "deployed",
    author: "Luís Pedrosa", 
    description: "Feature Release: CRM & Social",
    changes: [
      "Lançamento do módulo CRM",
      "Calendário de Redes Sociais",
      "Suporte para TikTok e LinkedIn"
    ] 
  }
];

// Mock do utilizador atual (admin)
const MOCK_CURRENT_USER = {
  id: 999,
  firstName: "Super",
  lastName: "Admin",
  email: "admin@responderja.pt",
  isAdmin: true,
  isSuperAdmin: true,
  isActive: true
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, theme }) => {
  const [activeTab, setActiveTab] = useState("users");
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Backoffice Responder Já</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Administrador
              </span>
              <button 
                onClick={() => setIsVersionModalOpen(true)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-200 dark:border-blue-900/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                Controlo de Versões
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Utilizadores</p>
                <p className="text-2xl font-bold">{MOCK_STATS.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <CircleCheckBig className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Respostas Geradas</p>
                <p className="text-2xl font-bold">{MOCK_STATS.totalResponses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Total</p>
                <p className="text-2xl font-bold">€{MOCK_STATS.totalRevenue}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilizadores Ativos</p>
                <p className="text-2xl font-bold">{MOCK_STATS.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex space-x-8">
              {['users', 'roles', 'api-keys', 'analytics', 'banking', 'system', 'monitoring', 'emails', 'leads', 'content', 'settings', 'logs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'content' && <BookOpen className="w-4 h-4" />}
                  {tab === 'monitoring' && <Activity className="w-4 h-4" />}
                  {tab === 'roles' ? 'Permissões' : 
                   tab === 'api-keys' ? 'Checklist APIs' : 
                   tab === 'system' ? 'Gestão de API' : 
                   tab === 'banking' ? 'Bancos' : 
                   tab === 'monitoring' ? 'Monitorização' :
                   tab === 'content' ? 'Conteúdo' : 
                   tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content Users */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Gestão de Utilizadores</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gerir contas de utilizadores, planos e estados</p>
              </div>
              <div className="space-y-4">
                {MOCK_USERS.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.companyName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                        {user.selectedPlan}
                      </span>
                      <p className="text-sm font-medium">{user.credits} créditos</p>
                      <button className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Gerir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Roles */}
          {activeTab === 'roles' && (
            <AdminRolesManagement />
          )}

          {/* Content API Keys Checklist */}
          {activeTab === 'api-keys' && (
            <AdminApiKeys />
          )}

          {/* Content Analytics */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold mb-4">Plataformas Mais Utilizadas</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Google Reviews</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Facebook</span>
                    <span className="font-bold">25%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '25%' }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Instagram</span>
                    <span className="font-bold">20%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '20%' }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>LinkedIn</span>
                    <span className="font-bold">10%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold mb-4">Planos de Subscrição</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <span>Básico</span>
                    <span className="font-bold">{MOCK_STATS.planStats.basic} utilizadores</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
                    <span>Profissional</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">{MOCK_STATS.planStats.professional} utilizadores</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-900">
                    <span>Empresarial</span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">{MOCK_STATS.planStats.enterprise} utilizadores</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Emails */}
          {activeTab === 'emails' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Gestão de Emails</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sistema de emails automáticos e campanhas</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: "Email de Boas-vindas", desc: "Enviado automaticamente após registo", status: "Ativo", color: "green" },
                  { title: "Confirmação de Compra", desc: "Enviado após compras de créditos", status: "Ativo", color: "green" },
                  { title: "Newsletter Semanal", desc: "Enviada domingos às 09:00", status: "Agendado", color: "blue" },
                  { title: "Alerta Créditos Baixos", desc: "Verificação a cada 6 horas", status: "Automático", color: "purple" },
                  { title: "Notificações Admin", desc: "Eventos importantes do sistema", status: "Ativo", color: "green" },
                  { title: "Relatórios Diários", desc: "Enviados todos os dias às 08:00", status: "Agendado", color: "blue" },
                ].map((item, i) => (
                  <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="font-medium mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.desc}</p>
                    <div className={`flex items-center text-${item.color === 'green' ? 'emerald' : item.color}-600`}>
                      <CircleCheckBig className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">Estado do SendGrid</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Configurado e operacional
                </p>
              </div>
            </div>
          )}

          {/* Content Leads */}
          {activeTab === 'leads' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <AdminLeadsManagement />
            </div>
          )}

          {/* Content System (Agora usa o novo AdminApiManagement) */}
          {activeTab === 'system' && (
            <AdminApiManagement currentUser={MOCK_CURRENT_USER} />
          )}

          {/* Content Banking (Novo) */}
          {activeTab === 'banking' && (
            <AdminBankingManagement />
          )}

          {/* Content CMS / Content Management */}
          {activeTab === 'content' && (
            <AdminContentManagement />
          )}

          {/* Content Monitoring (New) */}
          {activeTab === 'monitoring' && (
            <AdminCriticalSystems />
          )}

          {/* Content Settings */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Configurações do Sistema</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configurar parâmetros globais da aplicação</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Créditos Padrão</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Créditos atribuídos a novos utilizadores</p>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent" 
                        defaultValue="10" 
                      />
                      <button className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Atualizar</button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3">Custo por Resposta</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Créditos consumidos por resposta gerada</p>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent" 
                        defaultValue="2" 
                      />
                      <button className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Atualizar</button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Manutenção</h3>
                  <div className="flex flex-wrap gap-4">
                    <button className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Limpar Cache</button>
                    <button className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Backup Base de Dados</button>
                    <button className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/30">Modo Manutenção</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Logs */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Logs do Sistema</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monitorização de eventos e erros</p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {MOCK_LOGS.map((log) => (
                  <div key={log.id} className={`flex items-center space-x-3 text-sm p-3 rounded-lg ${
                    log.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                    log.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    {log.type === 'success' && <CircleCheckBig className="h-4 w-4 text-green-600 dark:text-green-400" />}
                    {log.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                    {log.type === 'info' && <CircleCheckBig className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{log.timestamp}</span>
                    </div>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Version Control Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Histórico de Versões</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Log de alterações e deployments do sistema</p>
                </div>
              </div>
              <button onClick={() => setIsVersionModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {MOCK_VERSIONS.map((version, index) => (
                <div key={version.version} className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-800 last:pb-0">
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${version.status === 'current' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  
                  <div className="mb-1 flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{version.version}</span>
                    {version.status === 'current' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold rounded-full uppercase">Atual</span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(version.date).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{version.description}</p>
                  <p className="text-xs text-gray-500 mb-3">Deployed by <span className="font-semibold">{version.author}</span></p>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                    <ul className="space-y-2">
                      {version.changes.map((change, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"></span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end">
              <button 
                onClick={() => setIsVersionModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;