import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  Eye, 
  Check, 
  X, 
  Search, 
  Edit, 
  Save, 
  Layout, 
  Type, 
  Languages, 
  CheckCircle2,
  Undo2,
  RefreshCw, 
  ArrowRight,
  Sparkles,
  SpellCheck,
  Globe
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface PageContent {
  [key: string]: string;
}

interface Page {
  id: string;
  pageName: string;
  route: string;
  title: string;
  description: string;
  content: PageContent;
  lastModified: string;
  status: string;
}

// Mock Data
const MOCK_PAGES: Page[] = [
  {
    id: "landing",
    pageName: "Página Inicial",
    route: "/",
    title: "Responder Já - Plataforma de Comunicação Empresarial",
    description: "Utilize IA para gerar respostas inteligentes para as redes sociais",
    content: {
      heroTitle: "Transforme a Comunicação do Seu Negócio",
      heroSubtitle: "Gere respostas inteligentes com IA para Google Reviews e redes sociais",
      heroButton: "Comece Gratuitamente",
      featuresTitle: "Funcionalidades Principais",
      feature1Title: "Detecção Automática de Idioma",
      feature1Description: "A IA detecta o idioma do comentário e responde na mesma língua",
      feature2Title: "Múltiplas Plataformas",
      feature2Description: "Suporte para Google, Facebook, Instagram e mais",
      feature3Title: "Tom Personalizado",
      feature3Description: "Ajuste o tom das respostas ao perfil da sua empresa"
    },
    lastModified: "2024-01-15T10:30:00Z",
    status: "active"
  },
  {
    id: "generate",
    pageName: "Gerar Resposta",
    route: "/generate",
    title: "Gerar Resposta Inteligente",
    description: "Crie respostas personalizadas para comentários e avaliações",
    content: {
      pageTitle: "Gerar Resposta",
      pageSubtitle: "Crie respostas inteligentes com IA para a comunicação empresarial",
      formTitle: "Gerador de Respostas",
      platformLabel: "Plataforma",
      messageLabel: "Mensagem/Avaliação Original",
      messagePlaceholder: "Cole a mensagem ou avaliação à qual pretende responder...",
      toneLabel: "Tom da Resposta",
      generateButton: "Gerar Resposta",
      copyButton: "Copiar Resposta",
      creditsInfo: "Esta geração utilizará créditos do seu saldo",
      languageDetectionTitle: "Detecção Automática de Idioma",
      languageDetectionDescription: "O sistema detecta automaticamente o idioma do comentário e responde na mesma língua"
    },
    lastModified: "2024-01-14T15:45:00Z",
    status: "active"
  },
  {
    id: "admin",
    pageName: "Painel Administrativo",
    route: "/admin",
    title: "Painel de Administração",
    description: "Gestão completa da plataforma",
    content: {
      dashboardTitle: "Painel de Administração",
      usersTitle: "Gestão de Utilizadores",
      analyticsTitle: "Análises e Relatórios",
      bankingTitle: "Gestão Bancária",
      contentTitle: "Gestão de Conteúdo",
      settingsTitle: "Configurações do Sistema"
    },
    lastModified: "2024-01-13T09:20:00Z",
    status: "active"
  }
];

const MOCK_ERRORS = [
  {
    id: "1",
    page: "Página Inicial",
    location: "Hero Section - Subtitle",
    currentText: "Gere respostas inteligentes com IA para Google Reviews e redes sociais",
    suggestedText: "Gere respostas inteligentes com IA para avaliações do Google e redes sociais",
    errorType: "consistency",
    severity: "medium",
    status: "pending"
  },
  {
    id: "2",
    page: "Gerar Resposta",
    location: "Language Detection - Description",
    currentText: "O sistema detecta automaticamente o idioma do comentário e responde na mesma língua",
    suggestedText: "O sistema detecta automaticamente o idioma do comentário e responde no mesmo idioma",
    errorType: "grammar",
    severity: "low",
    status: "pending"
  },
  {
    id: "3",
    page: "Painel Admin",
    location: "Navigation - Banking",
    currentText: "Gestão Bancária",
    suggestedText: "Gestão Financeira",
    errorType: "consistency",
    severity: "high",
    status: "pending"
  }
];

const AdminContentManagement: React.FC = () => {
  const [selectedPageId, setSelectedPageId] = useState<string>("landing");
  const [pages, setPages] = useState<Page[]>(MOCK_PAGES);
  const [errors, setErrors] = useState(MOCK_ERRORS);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPage = pages.find(p => p.id === selectedPageId);
  const filteredPages = pages.filter(p => 
    p.pageName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (key: string, value: string) => {
    setEditingField(key);
    setEditValue(value);
  };

  const handleSaveField = () => {
    if (selectedPage && editingField) {
      setLoading(true);
      setTimeout(() => {
        setPages(pages.map(p => {
          if (p.id === selectedPageId) {
            return {
              ...p,
              content: { ...p.content, [editingField]: editValue },
              lastModified: new Date().toISOString()
            };
          }
          return p;
        }));
        setEditingField(null);
        setLoading(false);
      }, 500);
    }
  };

  const handleFixError = (errorId: string) => {
    setErrors(errors.filter(e => e.id !== errorId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'spelling': return <SpellCheck className="w-4 h-4" />;
      case 'grammar': return <Type className="w-4 h-4" />;
      case 'consistency': return <Layout className="w-4 h-4" />;
      case 'translation': return <Globe className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de Conteúdo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Reveja e corrija textos em todas as páginas da plataforma</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-full">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-green-700 dark:text-green-300">Sistema Activo</span>
        </div>
      </div>

      <Tabs defaultValue="pages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="pages" className="rounded-lg">
            <Layout className="w-4 h-4 mr-2" /> Esquema das Páginas
          </TabsTrigger>
          <TabsTrigger value="errors" className="rounded-lg">
            <AlertTriangle className="w-4 h-4 mr-2" /> Erros de Texto
            {errors.length > 0 && (
              <span className="ml-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded-full text-xs font-bold">
                {errors.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-lg">
            <Eye className="w-4 h-4 mr-2" /> Pré-visualização
          </TabsTrigger>
        </TabsList>

        {/* PAGES TAB */}
        <TabsContent value="pages" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Page List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Procurar páginas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto p-2 space-y-1">
                {filteredPages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPageId === page.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-medium text-sm ${selectedPageId === page.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {page.pageName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{page.route}</p>
                      </div>
                      {page.status === 'active' && (
                        <span className="w-2 h-2 rounded-full bg-green-500 mt-1"></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPage ? (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Layout className="w-5 h-5 text-slate-400" />
                          {selectedPage.pageName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Última modificação: {new Date(selectedPage.lastModified).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                          {selectedPage.id}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título da Página</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">{selectedPage.title}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-1 truncate">{selectedPage.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white px-1">Conteúdo Editável</h3>
                    {Object.entries(selectedPage.content).map(([key, value]) => (
                      <div key={key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                              <Type className="w-3 h-3" />
                            </span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">{key}</span>
                          </div>
                          {editingField !== key && (
                            <button 
                              onClick={() => handleEditClick(key, value as string)}
                              className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium transition-colors"
                            >
                              <Edit className="w-3 h-3" /> Editar
                            </button>
                          )}
                        </div>
                        
                        <div className="p-4">
                          {editingField === key ? (
                            <div className="space-y-3">
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-colors min-h-[100px]"
                              />
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setEditingField(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Undo2 className="w-3 h-3" /> Cancelar
                                </button>
                                <button 
                                  onClick={handleSaveField}
                                  disabled={loading}
                                  className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} 
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {value as string}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
                  <Layout className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Selecione uma página para editar</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ERRORS TAB */}
        <TabsContent value="errors" className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Erros Detectados</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sugestões automáticas de correção de texto e consistência</p>
              </div>
            </div>

            <div className="space-y-4">
              {errors.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Tudo limpo!</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Não foram encontrados erros nos textos da plataforma.</p>
                </div>
              ) : (
                errors.map(error => (
                  <div key={error.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors bg-white dark:bg-slate-900">
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-full ${
                          error.errorType === 'consistency' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 
                          'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                        }`}>
                          {getErrorIcon(error.errorType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900 dark:text-white">{error.page}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{error.location}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColor(error.severity)}`}>
                              {error.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {error.errorType}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 self-start">
                        <button 
                          className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          onClick={() => handleFixError(error.id)}
                        >
                          Ignorar
                        </button>
                        <button 
                          className="px-3 py-1.5 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                          onClick={() => handleFixError(error.id)}
                        >
                          <Sparkles className="w-3 h-3" /> Aplicar Correcção
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3 h-3" /> Texto Atual
                        </p>
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg text-red-900 dark:text-red-200">
                          "{error.currentText}"
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Sugestão
                        </p>
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg text-green-900 dark:text-green-200">
                          "{error.suggestedText}"
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pré-visualização</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Visualize como o conteúdo aparece na plataforma</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm text-slate-500 whitespace-nowrap">Página:</span>
                <select 
                  className="w-full md:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.pageName} ({p.route})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-black">
              {selectedPage ? (
                <div className="p-8 max-w-4xl mx-auto bg-white dark:bg-slate-900 min-h-[400px] shadow-sm my-8 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{selectedPage.title}</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300">{selectedPage.description}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Conteúdo Renderizado</h3>
                    <div className="grid gap-4">
                      {Object.entries(selectedPage.content).map(([key, value]) => (
                        <div key={key} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <span className="text-xs font-mono text-slate-400 mb-1 block">{key}</span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {value as string}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  Selecione uma página para pré-visualizar
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContentManagement;