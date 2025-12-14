import React, { useState, useEffect } from 'react';
import { 
  Key, 
  CircleCheckBig, 
  AlertTriangle, 
  CircleX, 
  CreditCard, 
  Mail, 
  Zap, 
  Shield, 
  Globe, 
  Smartphone, 
  Database, 
  Download, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Server
} from 'lucide-react';

interface ApiKeyDef {
  key: string;
  service: string;
  description: string;
  icon: React.ElementType;
  color: string;
  setupUrl?: string;
  category: 'critical' | 'important' | 'corporate' | 'optional' | 'infrastructure';
  isConfigured: boolean;
}

const AdminApiKeys: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKeyDef[]>([]);

  // Simulação de dados (Mock Data baseado no ficheiro original)
  useEffect(() => {
    setTimeout(() => {
      setKeys([
        {
          key: "OPENAI_API_KEY",
          service: "OpenAI GPT-4",
          description: "🔴 CRÍTICO: Geração de respostas AI para Web App, Android e iOS. Sem esta chave, a funcionalidade principal das 3 aplicações fica inoperacional.",
          icon: Zap,
          color: "text-red-600",
          setupUrl: "https://platform.openai.com/api-keys",
          category: 'critical',
          isConfigured: true
        },
        {
          key: "STRIPE_SECRET_KEY",
          service: "Stripe Payments",
          description: "Processamento de pagamentos, subscrições e gestão de créditos para utilização da AI.",
          icon: CreditCard,
          color: "text-purple-500",
          setupUrl: "https://dashboard.stripe.com/apikeys",
          category: 'critical',
          isConfigured: false
        },
        {
          key: "SENDGRID_API_KEY",
          service: "SendGrid Email",
          description: "Envio de emails automáticos, notificações, relatórios e convites de equipa.",
          icon: Mail,
          color: "text-blue-500",
          setupUrl: "https://app.sendgrid.com/settings/api_keys",
          category: 'critical',
          isConfigured: true
        },
        {
          key: "ENCRYPTION_KEY",
          service: "Segurança",
          description: "Encriptação AES-256 para dados sensíveis.",
          icon: Shield,
          color: "text-red-500",
          category: 'critical',
          isConfigured: true
        },
        {
          key: "GOOGLE_CLIENT_ID",
          service: "Google",
          description: "Integração com Google My Business.",
          icon: Globe,
          color: "text-blue-600",
          setupUrl: "https://console.cloud.google.com",
          category: 'important',
          isConfigured: false
        },
        {
          key: "FACEBOOK_CLIENT_ID",
          service: "Facebook",
          description: "Gestão de páginas Facebook.",
          icon: Smartphone,
          color: "text-blue-700",
          setupUrl: "https://developers.facebook.com",
          category: 'corporate',
          isConfigured: false
        },
        {
          key: "DATABASE_URL",
          service: "PostgreSQL",
          description: "Ligação à base de dados PostgreSQL.",
          icon: Database,
          color: "text-blue-800",
          category: 'infrastructure',
          isConfigured: true
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const stats = {
    total: keys.length,
    configured: keys.filter(k => k.isConfigured).length,
    missing: keys.filter(k => !k.isConfigured).length,
    completionPercentage: Math.round((keys.filter(k => k.isConfigured).length / keys.length) * 100)
  };

  const handleTestKey = (key: string) => {
    setTestingKey(key);
    setTimeout(() => {
      setTestingKey(null);
      alert(`Teste de conexão para ${key} realizado com sucesso!`);
    }, 1500);
  };

  const renderKeyGroup = (title: string, categoryKeys: ApiKeyDef[], type: 'critical' | 'important' | 'corporate' | 'optional' | 'configured') => {
    if (categoryKeys.length === 0) return null;

    const styles = {
      critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-100 dark:border-red-900', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: AlertTriangle },
      important: { bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-100 dark:border-yellow-900', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: AlertTriangle },
      corporate: { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-100 dark:border-blue-900', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Globe },
      optional: { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Key },
      configured: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-100 dark:border-green-900', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CircleCheckBig }
    };

    const style = styles[type] || styles.optional;
    const GroupIcon = style.icon;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <GroupIcon className={`w-5 h-5 ${type === 'critical' ? 'text-red-600' : 'text-slate-500'}`} />
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${style.badge}`}>
            {type.toUpperCase()}
          </span>
        </div>
        
        <div className="grid gap-4">
          {categoryKeys.map((item) => (
            <div key={item.key} className={`p-4 rounded-xl border ${style.bg} ${style.border} transition-all`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      {item.key}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900">
                        {item.service}
                      </span>
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {item.isConfigured ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
                        <CircleCheckBig className="w-4 h-4" /> Configurda
                      </span>
                      <button 
                        onClick={() => handleTestKey(item.key)}
                        disabled={testingKey === item.key}
                        className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                      >
                        {testingKey === item.key ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Testar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium">
                        <CircleX className="w-4 h-4" /> Pendente
                      </span>
                      {item.setupUrl && (
                        <a 
                          href={item.setupUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors w-full md:w-auto"
                        >
                          <ExternalLink className="w-4 h-4" /> Configurar
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const configuredKeys = keys.filter(k => k.isConfigured);
  const criticalMissing = keys.filter(k => !k.isConfigured && k.category === 'critical');
  const importantMissing = keys.filter(k => !k.isConfigured && k.category === 'important');
  const corporateMissing = keys.filter(k => !k.isConfigured && k.category === 'corporate');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de API Keys</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure as integrações necessárias para o funcionamento completo das 3 aplicações.</p>
          {criticalMissing.some(k => k.key === "OPENAI_API_KEY") && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm font-medium animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              ⚠️ ALERTA: OpenAI API não configurada - Funcionalidade AI inoperacional
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
            <Download className="w-4 h-4" /> Baixar Guia PDF
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completionPercentage}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Conclusão</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${stats.completionPercentage}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
              <CircleCheckBig className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.configured}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Configuradas</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.missing}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Pendentes</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total APIs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Area */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Teste Rápido de APIs</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["OPENAI_API_KEY", "STRIPE_SECRET_KEY", "SENDGRID_API_KEY", "GOOGLE_CLIENT_ID"].map((keyName) => {
            const keyDef = keys.find(k => k.key === keyName);
            if (!keyDef) return null;
            const KeyIcon = keyDef.icon;
            
            return (
              <button
                key={keyName}
                onClick={() => handleTestKey(keyName)}
                disabled={!keyDef.isConfigured || testingKey === keyName}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  keyDef.isConfigured 
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'
                }`}
              >
                <KeyIcon className={`w-6 h-6 ${keyDef.color}`} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{keyDef.service}</span>
                {testingKey === keyName ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                ) : (
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                    {keyDef.isConfigured ? 'Testar' : 'N/A'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Groups */}
      {renderKeyGroup("APIs Configuradas", configuredKeys, "configured")}
      {renderKeyGroup("APIs Críticas (Prioridade Máxima)", criticalMissing, "critical")}
      {renderKeyGroup("APIs Importantes (Funcionalidades Core)", importantMissing, "important")}
      {renderKeyGroup("APIs Corporativas (Marketing & Presença)", corporateMissing, "corporate")}

      {/* Implementation Plan */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <CircleCheckBig className="w-5 h-5 text-brand-600" />
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Plano de Implementação Recomendado</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">1</div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">PRIORIDADE MÁXIMA - OpenAI API</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">🚨 CRÍTICO: Configure OpenAI com créditos suficientes. Sem esta API, as aplicações Web, Android e iOS ficam sem funcionalidade AI principal.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">2</div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Semana 1 - APIs Críticas de Sistema</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure Stripe (pagamentos), SendGrid (emails) e chave de encriptação para funcionalidades essenciais.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">3</div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Semana 2-3 - APIs de Redes Sociais</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure Google My Business, Facebook e Instagram para gestão de redes sociais e reviews.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">4</div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Semana 4 - Expansão Multi-plataforma</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure TikTok Business, Booking.com e outras plataformas de reviews.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">5</div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Semana 5 - APIs Corporativas</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure APIs corporativas para publicação automática e integração fiscal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApiKeys;