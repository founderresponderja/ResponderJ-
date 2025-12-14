import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  BarChart, 
  Eye, 
  Megaphone, 
  Save, 
  RotateCcw, 
  Cookie, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { Switch } from './ui/Switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface CookieManagementPageProps {
  onBack: () => void;
}

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

const defaultConsent: ConsentState = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false
};

const CookieManagementPage: React.FC<CookieManagementPageProps> = ({ onBack }) => {
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'info', message: string} | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem("cookie-consent");
    const savedDate = localStorage.getItem("cookie-consent-date");
    
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch {
        setConsent(defaultConsent);
      }
    }
    if (savedDate) {
      setLastUpdated(savedDate);
    }
  }, []);

  const showNotification = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    // Clear cookies for disabled categories
    if (!consent.analytics) {
      document.cookie = "_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "_gid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    if (!consent.functional) {
      document.cookie = "theme=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    if (!consent.marketing) {
      document.cookie = "marketing_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    const date = new Date().toISOString();
    localStorage.setItem("cookie-consent", JSON.stringify(consent));
    localStorage.setItem("cookie-consent-date", date);
    
    setLastUpdated(date);
    showNotification('success', 'As suas preferências de cookies foram atualizadas com sucesso.');
  };

  const handleReset = () => {
    setConsent(defaultConsent);
    showNotification('info', 'As preferências foram repostas para os valores padrão.');
  };

  const toggleCategory = (category: keyof ConsentState, value: boolean) => {
    if (category !== 'essential') {
      setConsent(prev => ({ ...prev, [category]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span className="font-bold text-slate-800 dark:text-white">Privacidade</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl mb-4 text-brand-600 dark:text-brand-400">
            <Cookie className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Gestão de Cookies</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Controle as suas preferências de cookies e privacidade
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-500">
            <CheckCircle2 className="w-4 h-4" />
            <span>RGPD Compliant</span>
            {lastUpdated && (
              <>
                <span className="mx-2">•</span>
                <span>Última atualização: {new Date(lastUpdated).toLocaleDateString('pt-PT')}</span>
              </>
            )}
          </div>
        </div>

        {/* Current Status */}
        <Card className="mb-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart className="h-5 w-5 text-brand-500" />
              Estado Atual das Preferências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Essenciais', active: consent.essential, color: 'bg-green-500' },
                { label: 'Análise', active: consent.analytics, color: 'bg-blue-500' },
                { label: 'Funcionais', active: consent.functional, color: 'bg-purple-500' },
                { label: 'Marketing', active: consent.marketing, color: 'bg-orange-500' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full mb-2 ${item.active ? item.color : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">{item.active ? 'Ativo' : 'Inativo'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mb-8 prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          <p className="mb-4">
            Os cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo quando visita um website. 
            Utilizamos cookies para melhorar a sua experiência, personalizar conteúdo e analisar como utiliza a nossa plataforma.
          </p>
          <p>
            De acordo com a legislação europeia (RGPD e Diretiva ePrivacy), deve dar o seu consentimento para a utilização 
            de cookies não essenciais. Pode gerir as suas preferências abaixo e alterá-las a qualquer momento.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5" /> Personalizar Preferências
          </h2>

          {/* Essential */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 h-fit">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">Cookies Essenciais</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Estes cookies são absolutamente necessários para o funcionamento da plataforma e não podem ser desativados.
                  </p>
                  <ul className="text-xs text-slate-500 dark:text-slate-500 space-y-1 list-disc pl-4">
                    <li>Segurança e autenticação</li>
                    <li>Gestão de sessão</li>
                    <li>Preferências de cookies</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Obrigatório</span>
                <Switch checked={true} disabled />
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 h-fit">
                  <BarChart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">Cookies de Análise</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Ajudam-nos a entender como utiliza a plataforma para podermos melhorar a experiência.
                  </p>
                  <ul className="text-xs text-slate-500 dark:text-slate-500 space-y-1 list-disc pl-4">
                    <li>Estatísticas de tráfego (Google Analytics)</li>
                    <li>Páginas mais visitadas</li>
                    <li>Erros e performance</li>
                  </ul>
                </div>
              </div>
              <Switch 
                checked={consent.analytics} 
                onCheckedChange={(c) => toggleCategory('analytics', c)} 
              />
            </div>
          </div>

          {/* Functional */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 h-fit">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">Cookies Funcionais</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Permitem que a plataforma se lembre das suas escolhas.
                  </p>
                  <ul className="text-xs text-slate-500 dark:text-slate-500 space-y-1 list-disc pl-4">
                    <li>Preferência de idioma</li>
                    <li>Tema (Claro/Escuro)</li>
                    <li>Configurações de visualização</li>
                  </ul>
                </div>
              </div>
              <Switch 
                checked={consent.functional} 
                onCheckedChange={(c) => toggleCategory('functional', c)} 
              />
            </div>
          </div>

          {/* Marketing */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 h-fit">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">Cookies de Marketing</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Utilizados para mostrar conteúdo relevante e anúncios baseados nos seus interesses.
                  </p>
                  <ul className="text-xs text-slate-500 dark:text-slate-500 space-y-1 list-disc pl-4">
                    <li>Integração com redes sociais</li>
                    <li>Publicidade personalizada</li>
                    <li>Medição de campanhas</li>
                  </ul>
                </div>
              </div>
              <Switch 
                checked={consent.marketing} 
                onCheckedChange={(c) => toggleCategory('marketing', c)} 
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 sticky bottom-4 shadow-xl z-40">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              Ao guardar, as suas preferências serão aplicadas imediatamente neste dispositivo.
            </p>
            <div className="flex w-full sm:w-auto gap-3">
              <button 
                onClick={handleReset}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Repor
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-md transition-colors"
              >
                <Save className="w-4 h-4" /> Guardar Preferências
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" /> Informações Importantes
          </h3>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-slate-600 dark:text-slate-400">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Retirada do Consentimento</h4>
              <p className="mb-4">
                Pode retirar o seu consentimento a qualquer momento alterando as definições nesta página.
              </p>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Duração</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Sessão: Eliminados ao fechar o navegador</li>
                <li>Persistentes: Até 2 anos ou eliminação manual</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Cookies de Terceiros</h4>
              <p className="mb-2">Utilizamos serviços de confiança que podem configurar cookies:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Google Analytics (Análise)</li>
                <li>Stripe (Pagamentos)</li>
                <li>Replit (Infraestrutura)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-in flex items-center gap-3 ${
            notification.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-slate-800 text-white'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieManagementPage;