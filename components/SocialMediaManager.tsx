import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart2, 
  Settings, 
  Plus, 
  RefreshCw, 
  ExternalLink,
  Search,
  Filter, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Share2,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  MapPin,
  Globe,
  Loader2,
  Bot,
  Copy,
  Send,
  SquarePen,
  Video,
  MessageCircle,
  X,
  Utensils,
  Bed,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Switch } from './ui/Switch';
import { Language } from '../utils/translations';
import { generateResponse } from '../services/geminiService';
import { Language as AppLanguage } from '../types';
import AutomationRules from './AutomationRules';

interface SocialMediaManagerProps {
  lang: Language;
}

// --- Types ---

interface SocialAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'google' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube' | 'tripadvisor' | 'booking' | 'thefork';
  name: string;
  handle: string;
  avatarUrl?: string;
  status: 'active' | 'expired' | 'disconnected';
  stats: {
    posts: number;
    comments: number;
    pending: number;
    responseRate: number;
  };
  lastSync: string;
  autoResponse: boolean;
}

interface Comment {
  id: string;
  platform: SocialAccount['platform'];
  author: string;
  content: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'pending' | 'replied' | 'ignored';
  priority: 'high' | 'medium' | 'low';
  postPreview: string;
  postUrl: string;
  tags?: string[];
}

// --- Mock Data ---

const MOCK_ACCOUNTS: SocialAccount[] = [
  {
    id: '1',
    platform: 'facebook',
    name: 'Restaurante O Pescador',
    handle: '@opescador.pt',
    status: 'active',
    stats: { posts: 145, comments: 1240, pending: 5, responseRate: 98 },
    lastSync: '2025-01-20T10:30:00Z',
    autoResponse: true
  },
  {
    id: '2',
    platform: 'instagram',
    name: 'O Pescador Official',
    handle: '@opescador_oficial',
    status: 'active',
    stats: { posts: 320, comments: 2150, pending: 12, responseRate: 95 },
    lastSync: '2025-01-20T10:35:00Z',
    autoResponse: false
  },
  {
    id: '3',
    platform: 'google',
    name: 'O Pescador - Lisboa',
    handle: 'Google My Business',
    status: 'active',
    stats: { posts: 0, comments: 450, pending: 3, responseRate: 100 },
    lastSync: '2025-01-19T18:00:00Z',
    autoResponse: true
  }
];

const MOCK_COMMENTS: Comment[] = [
  {
    id: '101',
    platform: 'google',
    author: 'Maria Ferreira',
    content: 'Comida excelente e serviço muito atencioso. O prato de peixe estava fresquíssimo! Recomendo vivamente.',
    date: '2025-01-20T09:15:00Z',
    sentiment: 'positive',
    status: 'pending',
    priority: 'medium',
    postPreview: 'Avaliação Google Maps',
    postUrl: '#',
    tags: ['Elogio', 'Comida']
  },
  {
    id: '102',
    platform: 'instagram',
    author: 'joao.silva99',
    content: 'Quanto custa o menu de degustação? Enviei DM mas não responderam.',
    date: '2025-01-20T08:30:00Z',
    sentiment: 'neutral',
    status: 'pending',
    priority: 'high',
    postPreview: 'Foto do Prato do Dia...',
    postUrl: '#',
    tags: ['Preço', 'Atendimento']
  },
  {
    id: '103',
    platform: 'facebook',
    author: 'Carlos Mendes',
    content: 'A espera foi demasiado longa. 45 minutos por uma mesa reservada é inaceitável.',
    date: '2025-01-19T20:45:00Z',
    sentiment: 'negative',
    status: 'pending',
    priority: 'high',
    postPreview: 'Post sobre Horário de Fim de Semana',
    postUrl: '#',
    tags: ['Reclamação', 'Espera']
  }
];

// --- Sub-Components ---

const PlatformIcon = ({ platform, className = "w-5 h-5" }: { platform: string, className?: string }) => {
  switch (platform) {
    case 'facebook': return <Facebook className={`${className} text-blue-600`} />;
    case 'instagram': return <Instagram className={`${className} text-pink-600`} />;
    case 'linkedin': return <Linkedin className={`${className} text-blue-700`} />;
    case 'twitter': return <Twitter className={`${className} text-sky-500`} />;
    case 'youtube': return <Youtube className={`${className} text-red-600`} />;
    case 'google': return <MapPin className={`${className} text-green-600`} />;
    case 'tiktok': return <Video className={`${className} text-black dark:text-white`} />;
    case 'tripadvisor': return <Globe className={`${className} text-green-600`} />;
    case 'booking': return <Bed className={`${className} text-blue-900`} />;
    case 'thefork': return <Utensils className={`${className} text-green-700`} />;
    default: return <Globe className={`${className} text-slate-500`} />;
  }
};

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  switch (sentiment) {
    case 'positive': return <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800"><ThumbsUp size={12} /> Positivo</span>;
    case 'negative': return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800"><ThumbsDown size={12} /> Negativo</span>;
    default: return <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700"><MessageCircle size={12} /> Neutro</span>;
  }
};

const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState("accounts");
  const [accounts, setAccounts] = useState<SocialAccount[]>(MOCK_ACCOUNTS);
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  
  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  
  // Response Generation State
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [generatedResponse, setGeneratedResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [responseTone, setResponseTone] = useState("professional");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isEditingResponse, setIsEditingResponse] = useState(false);

  // Actions
  const handleConnect = (platform: string) => {
    setIsLoading(true);
    // Simulate connection
    setTimeout(() => {
      const newAccount: SocialAccount = {
        id: Date.now().toString(),
        platform: platform as any,
        name: `Nova Conta ${platform}`,
        handle: `@nova_conta`,
        status: 'active',
        stats: { posts: 0, comments: 0, pending: 0, responseRate: 0 },
        lastSync: new Date().toISOString(),
        autoResponse: false
      };
      setAccounts([...accounts, newAccount]);
      setIsLoading(false);
      setIsConnectModalOpen(false);
    }, 1500);
  };

  const handleGenerateResponse = (comment: Comment) => {
    setSelectedComment(comment);
    setGeneratedResponse("");
    setResponseTone("professional");
    setCustomInstructions("");
    setIsEditingResponse(false);
    setIsGenerateModalOpen(true);
    
    // Auto generate on open
    generateAIResponse(comment, "professional");
  };

  const generateAIResponse = async (comment: Comment, tone: string) => {
    setIsGenerating(true);
    try {
        // Get business context if available (from localStorage as in MainApp)
        let businessContext = undefined;
        const savedProfile = localStorage.getItem('demo_business_profile');
        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);
                businessContext = {
                    businessName: profile.businessName,
                    businessType: profile.businessType,
                    description: profile.description,
                    responseGuidelines: profile.responseGuidelines
                };
            } catch (e) { console.error(e); }
        }

        let toneLabel = tone;
        if (customInstructions) {
            toneLabel += ` (${customInstructions})`;
        }

        const result = await generateResponse({
            platform: comment.platform,
            customerName: comment.author,
            reviewText: comment.content,
            tone: toneLabel,
            language: AppLanguage.PT // Default to PT or use props.lang if mapped
        }, businessContext);

        setGeneratedResponse(result.response);
    } catch (error) {
        console.error("Error generating response", error);
        setGeneratedResponse("Erro ao gerar resposta. Por favor tente novamente mais tarde.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePublishResponse = () => {
    if (selectedComment) {
      setComments(comments.map(c => 
        c.id === selectedComment.id ? { ...c, status: 'replied' } : c
      ));
      setIsGenerateModalOpen(false);
      setSelectedComment(null);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(generatedResponse);
    // Could add toast here
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Redes Sociais</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie todas as suas contas e interações num só lugar.</p>
        </div>
        <button 
          onClick={() => setIsConnectModalOpen(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Conectar Conta
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="accounts" className="flex-1 md:flex-none">Contas</TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 md:flex-none">Comentários</TabsTrigger>
          <TabsTrigger value="automation" className="flex-1 md:flex-none flex items-center gap-2"><Zap className="w-3 h-3" /> Automação</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 md:flex-none">Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 md:flex-none">Configurações</TabsTrigger>
        </TabsList>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-6">
          {accounts.length === 0 ? (
            <Card className="border-dashed border-2 bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Share2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhuma conta conectada</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Conecte as suas redes sociais para começar.</p>
                <button onClick={() => setIsConnectModalOpen(true)} className="text-brand-600 font-medium hover:underline">
                  Conectar agora
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => (
                <Card key={account.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <PlatformIcon platform={account.platform} className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{account.handle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.status === 'active' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-xs text-slate-500">Posts</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{account.stats.posts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Comentários</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{account.stats.comments}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Pendentes</p>
                        <p className="font-semibold text-amber-600">{account.stats.pending}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Taxa Resp.</p>
                        <p className="font-semibold text-green-600">{account.stats.responseRate}%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Auto-resposta</span>
                        <Switch checked={account.autoResponse} />
                      </div>
                      <button className="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-1">
                        <RefreshCw size={12} /> Sincronizar
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* COMMENTS TAB */}
        <TabsContent value="comments" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Pendentes</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{comments.filter(c => c.status === 'pending').length}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-400 dark:text-orange-500/50" />
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Alta Prioridade</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{comments.filter(c => c.priority === 'high' && c.status === 'pending').length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400 dark:text-red-500/50" />
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Respondidos (24h)</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">12</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-400 dark:text-blue-500/50" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {comments.filter(c => c.status === 'pending').length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Tudo em dia!</h3>
                <p className="text-slate-500 dark:text-slate-400">Não existem comentários pendentes para responder.</p>
              </div>
            ) : (
              comments.filter(c => c.status === 'pending').map(comment => (
                <Card key={comment.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{comment.author}</h4>
                            <span className="text-slate-400 text-xs">•</span>
                            <PlatformIcon platform={comment.platform} className="w-4 h-4" />
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-xs text-slate-500">{new Date(comment.date).toLocaleDateString('pt-PT')}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <SentimentBadge sentiment={comment.sentiment} />
                            {comment.priority === 'high' && (
                              <span className="text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">Alta Prioridade</span>
                            )}
                            {comment.tags?.map(tag => (
                              <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <a href={comment.postUrl} className="text-slate-400 hover:text-brand-600 transition-colors">
                        <ExternalLink size={16} />
                      </a>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mb-4 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-brand-300 dark:border-brand-700">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Contexto:</span> {comment.postPreview}
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                      "{comment.content}"
                    </p>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex gap-2">
                        <button className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Ignorar</button>
                        <button className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Marcar como Lido</button>
                      </div>
                      <button 
                        onClick={() => handleGenerateResponse(comment)}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        <Bot size={16} /> Gerar Resposta
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* AUTOMATION TAB */}
        <TabsContent value="automation" className="space-y-6">
            <AutomationRules />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                    <MessageSquare size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Comentários</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">3,840</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><Plus size={10} /> 12% este mês</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Respostas Enviadas</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">3,650</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><Plus size={10} /> 8% este mês</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
                    <BarChart2 size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de Resposta</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">95%</p>
                <p className="text-xs text-slate-500 mt-1">Média do setor: 78%</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600 dark:text-orange-400">
                    <Clock size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tempo Médio</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">2.3h</p>
                <p className="text-xs text-green-600 mt-1">-15% vs mês anterior</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Configure as definições gerais para todas as suas contas de redes sociais.
              </p>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">Aprovação Automática</h4>
                  <p className="text-xs text-slate-500">Publicar respostas de alta confiança automaticamente</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">Notificações de Prioridade</h4>
                  <p className="text-xs text-slate-500">Receber alertas para comentários negativos ou urgentes</p>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Account Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Conectar Nova Conta</h3>
              <button onClick={() => setIsConnectModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
                  { id: 'google', name: 'Google Business', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
                  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-black', bg: 'bg-slate-100' },
                  { id: 'tripadvisor', name: 'TripAdvisor', icon: Globe, color: 'text-green-600', bg: 'bg-green-50' },
                  { id: 'booking', name: 'Booking.com', icon: Bed, color: 'text-blue-900', bg: 'bg-blue-50' },
                  { id: 'thefork', name: 'The Fork', icon: Utensils, color: 'text-green-700', bg: 'bg-green-50' },
                ].map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleConnect(platform.id)}
                    disabled={isLoading}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                  >
                    <div className={`p-3 rounded-lg ${platform.bg} dark:bg-slate-800 ${platform.color}`}>
                      <platform.icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{platform.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Gerir comentários e reviews</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Response Modal */}
      {isGenerateModalOpen && selectedComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Gerar Resposta Inteligente</h3>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Original Comment */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comentário Original</span>
                  <PlatformIcon platform={selectedComment.platform} className="w-3 h-3" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{selectedComment.author}</span>
                    <SentimentBadge sentiment={selectedComment.sentiment} />
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm italic">"{selectedComment.content}"</p>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tom da Resposta</label>
                  <select 
                    value={responseTone}
                    onChange={(e) => {
                        setResponseTone(e.target.value);
                        generateAIResponse(selectedComment, e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="professional">Profissional</option>
                    <option value="friendly">Amigável</option>
                    <option value="empathetic">Empático</option>
                    <option value="casual">Informal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instruções Extra</label>
                  <input 
                    type="text" 
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Ex: Mencionar promoção..." 
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Generated Response Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Resposta Gerada</label>
                  <div className="flex gap-2">
                    <button 
                        onClick={handleCopyResponse}
                        className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 font-medium"
                    >
                        <Copy size={12} /> Copiar
                    </button>
                    <button 
                        onClick={() => generateAIResponse(selectedComment, responseTone)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                        <RefreshCw size={12} /> Regenerar
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  {isGenerating ? (
                    <div className="w-full h-32 rounded-lg border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-900/10 flex flex-col items-center justify-center text-brand-600">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm font-medium">A escrever a melhor resposta...</span>
                    </div>
                  ) : (
                    <div className="relative">
                        <textarea 
                        value={generatedResponse}
                        onChange={(e) => setGeneratedResponse(e.target.value)}
                        readOnly={!isEditingResponse}
                        className={`w-full h-32 rounded-lg border ${isEditingResponse ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none resize-none transition-colors`}
                        />
                        {!isEditingResponse && (
                            <button 
                                onClick={() => setIsEditingResponse(true)}
                                className="absolute bottom-3 right-3 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors"
                                title="Editar Resposta"
                            >
                                <SquarePen size={16} />
                            </button>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-3 justify-end">
              <button 
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePublishResponse}
                disabled={isGenerating || !generatedResponse}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Publicar Resposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaManager;