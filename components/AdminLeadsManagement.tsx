import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Mail, 
  CircleCheckBig, 
  TrendingUp, 
  Users,
  BrainCircuit, 
  Globe, 
  MapPin, 
  Building,
  Loader2,
  X,
  FileSpreadsheet,
  Upload,
  Send,
  Eye,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

// Mock types
interface Lead {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  region: string;
  source: string;
  emailStatus: 'pending' | 'first_sent' | 'second_sent' | 'third_sent' | 'dormant' | 'converted';
  leadScore: number;
  aiConfidence?: number;
  createdAt: string;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  target: string;
  sentCount: number;
  openCount: number;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
}

// Mock Data
const MOCK_LEADS: Lead[] = [
  {
    id: 1,
    companyName: "Restaurante O Marisco",
    contactName: "António Costa",
    email: "antonio@omarisco.pt",
    phone: "+351 912 345 678",
    website: "www.omarisco.pt",
    industry: "Restauração",
    region: "Lisboa",
    source: "ai_search",
    emailStatus: "pending",
    leadScore: 85,
    aiConfidence: 0.92,
    createdAt: "2025-01-20T10:00:00Z"
  },
  {
    id: 2,
    companyName: "Hotel Bela Vista",
    contactName: "Maria Silva",
    email: "geral@belavista.com",
    phone: "+351 222 333 444",
    website: "www.belavista.com",
    industry: "Hotelaria",
    region: "Porto",
    source: "manual",
    emailStatus: "first_sent",
    leadScore: 72,
    createdAt: "2025-01-19T15:30:00Z"
  },
  {
    id: 3,
    companyName: "Café Central",
    contactName: "João Santos",
    email: "joao@central.pt",
    phone: "+351 966 777 888",
    website: "",
    industry: "Restauração",
    region: "Coimbra",
    source: "csv",
    emailStatus: "second_sent",
    leadScore: 60,
    createdAt: "2025-01-18T09:15:00Z"
  }
];

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 1, name: "Campanha Verão", subject: "Melhore a sua presença online", target: "non-clients", sentCount: 150, openCount: 45, status: "sent", createdAt: "2025-01-10" },
  { id: 2, name: "Follow-up Setembro", subject: "Ainda interessado?", target: "interessado", sentCount: 30, openCount: 12, status: "scheduled", createdAt: "2025-01-22" }
];

const DEFAULT_EMAIL_TEMPLATE = `Olá {{contactName}},

Esperamos que esteja bem. Somos a Responder Já, uma plataforma inovadora que ajuda empresas como a {{companyName}} a gerar respostas inteligentes para comentários no Google, TikTok e redes sociais usando inteligência artificial.

🤖 **O que oferecemos:**
- Respostas personalizadas para o seu negócio
- Tom profissional adaptado à sua marca
- Poupança de tempo e recursos
- Melhor relacionamento com clientes

Gostaria de saber mais sobre como podemos ajudar a {{companyName}} a melhorar a sua presença digital?

Cumprimentos,
Equipa Responder Já
📧 suporte@responderja.com
🌐 www.responderja.com`;

const AdminLeadsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("leads");
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Campaign
  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignTarget, setCampaignTarget] = useState("non-clients");
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // Stats
  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.emailStatus === 'pending').length,
    followUp: leads.filter(l => ['first_sent', 'second_sent', 'third_sent'].includes(l.emailStatus)).length,
    converted: leads.filter(l => l.emailStatus === 'converted').length,
    conversionRate: Math.round((leads.filter(l => l.emailStatus === 'converted').length / leads.length) * 100) || 0
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      setIsUploading(false);
      setSelectedFile(null);
      alert("Ficheiro processado com sucesso! Leads importados.");
      // Add dummy lead from CSV
      const newLead: Lead = {
        id: Date.now(),
        companyName: "Empresa Importada CSV",
        contactName: "Gestor",
        email: "gestor@csv.pt",
        phone: "910000000",
        website: "",
        industry: "Vários",
        region: "Portugal",
        source: "csv",
        emailStatus: "pending",
        leadScore: 50,
        createdAt: new Date().toISOString()
      };
      setLeads([newLead, ...leads]);
      setActiveTab("leads");
    }, 1500);
  };

  const handleCreateCampaign = () => {
    setIsCreatingCampaign(true);
    // Simulate creation
    setTimeout(() => {
      const newCampaign: Campaign = {
        id: Date.now(),
        name: campaignName,
        subject: campaignSubject,
        target: campaignTarget,
        sentCount: 0,
        openCount: 0,
        status: "draft",
        createdAt: new Date().toISOString().split('T')[0]
      };
      setCampaigns([newCampaign, ...campaigns]);
      setIsCreatingCampaign(false);
      setCampaignName("");
      setCampaignSubject("");
      alert("Campanha criada com sucesso!");
    }, 1000);
  };

  const handleSendCampaign = (id: number) => {
    // Simulate sending
    alert(`A enviar campanha ${id}...`);
    setTimeout(() => {
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: "sent", sentCount: Math.floor(Math.random() * 50) + 10 } : c));
      alert("Campanha enviada!");
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
      first_sent: { label: "1º Email", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
      second_sent: { label: "2º Email", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
      third_sent: { label: "3º Email", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
      dormant: { label: "Adormecido", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
      converted: { label: "Convertido", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" }
    };
    
    const style = config[status] || { label: status, color: "bg-gray-100" };
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
        {style.label}
      </span>
    );
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.companyName.toLowerCase().includes(search.toLowerCase()) || 
                          lead.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? lead.emailStatus === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de Leads</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Prospecção, campanhas e conversão de clientes</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Novos</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1 text-purple-600 dark:text-purple-400">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Contactados</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.followUp}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1 text-green-600 dark:text-green-400">
              <CircleCheckBig className="w-4 h-4" />
              <span className="text-sm font-medium">Convertidos</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.converted}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1 text-red-600 dark:text-red-400">
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Descartados</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{leads.filter(l => l.emailStatus === 'dormant').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Conversão</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <TabsTrigger value="leads">Lista de Potenciais Clientes</TabsTrigger>
          <TabsTrigger value="upload">Carregar CSV</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                placeholder="Pesquisar empresa, email..."
                className="pl-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos os Estados</option>
                <option value="pending">Pendente</option>
                <option value="first_sent">1º Email</option>
                <option value="converted">Convertido</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Filter className="w-4 h-4" /> Filtros
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <div key={lead.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{lead.companyName}</h3>
                        {getStatusBadge(lead.emailStatus)}
                        <span className="px-2 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 capitalize">
                          {lead.source.replace('_', ' ')}
                        </span>
                      </div>
                      {lead.aiConfidence && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                          <BrainCircuit className="w-3 h-3" />
                          Confiança AI: {(lead.aiConfidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Score: {lead.leadScore}/100</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{new Date(lead.createdAt).toLocaleDateString('pt-PT')}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lead.contactName || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lead.region || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lead.industry || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      Ver Detalhes
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 rounded hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800 transition-colors">
                      Enviar Email
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                <Search className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum lead encontrado</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tente ajustar os filtros de pesquisa.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* UPLOAD TAB */}
        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Carregar Ficheiro CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-4 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Selecionar Ficheiro CSV
                </button>
                {selectedFile && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg inline-block">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                      Ficheiro selecionado: {selectedFile.name}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-4">
                  Suporta ficheiros .csv até 10MB. O sistema irá ignorar duplicados automaticamente.
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <h4 className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Formato do CSV
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                  O ficheiro deve conter as seguintes colunas (a ordem não importa):
                </p>
                <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1 list-disc pl-5">
                  <li><strong>company</strong> ou <strong>empresa</strong> (obrigatório)</li>
                  <li><strong>email</strong> (obrigatório)</li>
                  <li><strong>contact</strong> ou <strong>nome</strong></li>
                  <li><strong>phone</strong> ou <strong>telefone</strong></li>
                  <li><strong>website</strong></li>
                  <li><strong>industry</strong> ou <strong>sector</strong></li>
                </ul>
              </div>

              <button 
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" /> Carregar e Processar Leads
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>Criar Nova Campanha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Campanha</label>
                  <input 
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm"
                    placeholder="Ex: Apresentação Responder Já"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto do Email</label>
                  <input 
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm"
                    placeholder="Ex: Melhore a presença digital da sua empresa"
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Público-Alvo</label>
                  <select 
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm"
                    value={campaignTarget}
                    onChange={(e) => setCampaignTarget(e.target.value)}
                  >
                    <option value="non-clients">Não Clientes</option>
                    <option value="pending">Leads Pendentes</option>
                    <option value="first_sent">Contactados (1x)</option>
                    <option value="all">Todos os Leads</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Template</label>
                  <textarea 
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm font-mono h-48"
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">Variáveis disponíveis: {'{{contactName}}'}, {'{{companyName}}'}</p>
                </div>
                <button 
                  onClick={handleCreateCampaign}
                  disabled={isCreatingCampaign || !campaignName || !campaignSubject}
                  className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar Campanha
                </button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-full">
              <CardHeader>
                <CardTitle>Campanhas Recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>Nenhuma campanha criada.</p>
                  </div>
                ) : (
                  campaigns.map(campaign => (
                    <div key={campaign.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{campaign.name}</h4>
                          <p className="text-xs text-slate-500">{campaign.subject}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          campaign.status === 'sent' ? 'bg-green-100 text-green-700' : 
                          campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 mb-3">
                        <div>Enviados: <strong>{campaign.sentCount}</strong></div>
                        <div>Abertos: <strong>{campaign.openCount}</strong></div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs font-medium hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1">
                          <Eye className="w-3 h-3" /> Ver
                        </button>
                        <button 
                          onClick={() => handleSendCampaign(campaign.id)}
                          disabled={campaign.status === 'sent'}
                          className="flex-1 py-1.5 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Enviar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLeadsManagement;