import React, { useState } from 'react';
import { 
  Key, 
  Activity, 
  Server, 
  Settings, 
  Eye, 
  EyeOff, 
  Plus, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  Save,
  CircleCheckBig,
  CircleX,
  Clock,
  Shield,
  Code
} from 'lucide-react';

interface ApiKey {
  id: number;
  keyName: string;
  description: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsed: string;
  totalRequests: number;
}

interface ApiLog {
  id: number;
  apiKey: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  ipAddress: string;
}

interface AdminApiManagementProps {
  currentUser?: {
    isSuperAdmin: boolean;
  };
}

const AdminApiManagement: React.FC<AdminApiManagementProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState("keys");
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  
  // Se não for super admin (simulação, por defeito assume-se que quem acede aqui tem permissão ou o dashboard bloqueia)
  // No código original verificava user.isSuperAdmin. Vamos assumir true para demo ou receber via props.
  const isSuperAdmin = currentUser?.isSuperAdmin ?? true;

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-300">Acesso Negado</h3>
            <p className="text-sm text-red-700 dark:text-red-400">Esta funcionalidade está disponível apenas para super administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  // Mock Data
  const apiKeys: ApiKey[] = [
    {
      id: 1,
      keyName: "OpenAI API Key",
      description: "Chave para integração com OpenAI GPT-4",
      keyPrefix: "sk-xxx",
      scopes: ["ai_responses", "content_generation"],
      isActive: true,
      lastUsed: "2025-01-20T14:30:00Z",
      totalRequests: 15420
    },
    {
      id: 2,
      keyName: "SendGrid API Key",
      description: "Serviço de email transacional",
      keyPrefix: "SG.xxx",
      scopes: ["email_sending", "templates"],
      isActive: true,
      lastUsed: "2025-01-19T09:15:00Z",
      totalRequests: 8750
    },
    {
      id: 3,
      keyName: "Stripe API Key",
      description: "Processamento de pagamentos",
      keyPrefix: "sk_live_xxx",
      scopes: ["payments", "subscriptions"],
      isActive: true,
      lastUsed: "2025-01-18T16:45:00Z",
      totalRequests: 2340
    }
  ];

  const apiLogs: ApiLog[] = [
    {
      id: 1,
      apiKey: "OpenAI API Key",
      endpoint: "/api/ai/generate-response",
      method: "POST",
      statusCode: 200,
      responseTime: 1240,
      timestamp: "2025-01-20T14:30:15Z",
      ipAddress: "192.168.1.100"
    },
    {
      id: 2,
      apiKey: "SendGrid API Key",
      endpoint: "/api/email/send",
      method: "POST",
      statusCode: 200,
      responseTime: 350,
      timestamp: "2025-01-20T14:25:30Z",
      ipAddress: "192.168.1.101"
    },
    {
      id: 3,
      apiKey: "Stripe API Key",
      endpoint: "/api/payments/create-intent",
      method: "POST",
      statusCode: 200,
      responseTime: 890,
      timestamp: "2025-01-20T14:20:45Z",
      ipAddress: "192.168.1.102"
    }
  ];

  const systemConfig = {
    openaiApiKey: "sk-proj-xxx...xxxx",
    sendgridApiKey: "SG.xxx...xxxx",
    stripeSecretKey: "sk_live_xxx...xxxx",
    facebookAppId: "123456789",
    googleClientId: "123456789-xxx.googleusercontent.com"
  };

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatKey = (prefix: string, isVisible: boolean) => {
    if (isVisible) return prefix + "a1b2c3d4e5f6..."; // Mock full key
    const visiblePart = prefix.slice(0, 8);
    return visiblePart + "••••••••••••••";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de API</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configuração e monitorização de chaves API do sistema (Super Admin Only)</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Chaves Ativas</span>
            <Key className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">8</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Todas funcionais</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Requests Hoje</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">2.847</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-green-600">+12% vs ontem</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tempo Médio</span>
            <Server className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">850ms</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Response time</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de Sucesso</span>
            <CircleCheckBig className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">99.2%</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Últimas 24h</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("keys")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "keys" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Chaves API
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "system" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Configurações Sistema
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "usage" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Logs de Utilização
        </button>
        <button
          onClick={() => setActiveTab("new-key")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "new-key" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Nova Chave
        </button>
      </div>

      {/* Tab Content: Keys */}
      {activeTab === "keys" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-medium text-slate-900 dark:text-white">Chaves API Registadas</h3>
            <button 
              onClick={() => setActiveTab("new-key")}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Chave
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Chave</th>
                  <th className="px-6 py-4">Âmbitos</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Último Uso</th>
                  <th className="px-6 py-4">Requests</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{key.keyName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{key.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                          <Code className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        </div>
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                          {formatKey(key.keyPrefix, visibleKeys[key.id])}
                        </code>
                        <button 
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {visibleKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map(scope => (
                          <span key={scope} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {key.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(key.lastUsed).toLocaleString("pt-PT")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                      {key.totalRequests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Rodar Chave">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Revogar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: System Config */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-300">Atenção: Configurações Críticas</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400">Estas configurações afetam todo o sistema. Alterações incorretas podem causar falhas no serviço para todos os utilizadores.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* OpenAI */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Integração OpenAI</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configurações para geração de conteúdo AI</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      defaultValue={systemConfig.openaiApiKey} 
                      className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                    />
                    <button className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Testar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Modelo Padrão</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SendGrid */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">SendGrid Email</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Serviço de envio de emails</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      defaultValue={systemConfig.sendgridApiKey} 
                      className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                    />
                    <button className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Testar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Remetente</label>
                  <input 
                    type="email" 
                    defaultValue="noreply@responderja.com" 
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Stripe */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Stripe Payments</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Processamento de pagamentos</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secret Key</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      defaultValue={systemConfig.stripeSecretKey} 
                      className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                    />
                    <button className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Testar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Webhook Secret</label>
                  <input 
                    type="password" 
                    placeholder="whsec_xxx..." 
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Redes Sociais</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Integrações com Facebook e Google</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Facebook App ID</label>
                  <input 
                    type="text" 
                    defaultValue={systemConfig.facebookAppId} 
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Google Client ID</label>
                  <input 
                    type="text" 
                    defaultValue={systemConfig.googleClientId} 
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
              <Save className="w-4 h-4" /> Guardar Configurações
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: Usage Logs */}
      {activeTab === "usage" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-medium text-slate-900 dark:text-white">Logs de Utilização da API</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Chave API</th>
                  <th className="px-6 py-4">Endpoint</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Tempo</th>
                  <th className="px-6 py-4">IP</th>
                  <th className="px-6 py-4">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {apiLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {log.apiKey}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Code className="w-3 h-3 text-slate-400" />
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                          {log.endpoint}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                        {log.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.statusCode >= 200 && log.statusCode < 300 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                      {log.responseTime}ms
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString("pt-PT")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: New Key */}
      {activeTab === "new-key" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded text-brand-600 dark:text-brand-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Nova Chave API</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adicione uma nova chave API ao sistema</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome da Chave *</label>
                <input 
                  type="text" 
                  placeholder="Ex: OpenAI Production Key" 
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Serviço</label>
                <input 
                  type="text" 
                  placeholder="Ex: AI, Email, Payment" 
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
              <textarea 
                rows={3}
                placeholder="Descrição detalhada da funcionalidade desta chave..." 
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Valor da Chave API *</label>
              <input 
                type="password" 
                placeholder="Colar a chave API aqui..." 
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Limite de Requests/Hora</label>
                <input 
                  type="number" 
                  placeholder="1000" 
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Limite Diário</label>
                <input 
                  type="number" 
                  placeholder="10000" 
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none border transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setActiveTab("keys")}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Save className="w-4 h-4" /> Guardar Chave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApiManagement;