import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Mail, 
  CheckCircle2, 
  TrendingUp, 
  Users,
  BrainCircuit, 
  Globe, 
  MapPin, 
  Briefcase, 
  Phone, 
  Building,
  Loader2,
  X
} from 'lucide-react';

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
  },
  {
    id: 4,
    companyName: "Clínica de Saúde Vital",
    contactName: "Dra. Ana Sousa",
    email: "ana.sousa@vital.pt",
    phone: "+351 211 000 111",
    website: "www.vital.pt",
    industry: "Saúde",
    region: "Lisboa",
    source: "ai_search",
    emailStatus: "converted",
    leadScore: 95,
    aiConfidence: 0.88,
    createdAt: "2025-01-15T14:20:00Z"
  },
  {
    id: 5,
    companyName: "Loja de Design Moderno",
    contactName: "Pedro Oliveira",
    email: "pedro@designmoderno.pt",
    phone: "+351 933 222 111",
    website: "www.designmoderno.pt",
    industry: "Comércio",
    region: "Faro",
    source: "ai_search",
    emailStatus: "dormant",
    leadScore: 40,
    aiConfidence: 0.75,
    createdAt: "2025-01-10T11:45:00Z"
  }
];

const AdminLeadsManagement: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiSearchModalOpen, setIsAiSearchModalOpen] = useState(false);
  
  // AI Search state
  const [aiRegion, setAiRegion] = useState("");
  const [aiBusinessType, setAiBusinessType] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Stats
  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.emailStatus === 'pending').length,
    followUp: leads.filter(l => ['first_sent', 'second_sent', 'third_sent'].includes(l.emailStatus)).length,
    converted: leads.filter(l => l.emailStatus === 'converted').length,
    conversionRate: Math.round((leads.filter(l => l.emailStatus === 'converted').length / leads.length) * 100) || 0
  };

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLead: Lead = {
      id: Date.now(),
      companyName: formData.get('companyName') as string,
      contactName: formData.get('contactName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      website: formData.get('website') as string,
      industry: formData.get('industry') as string,
      region: formData.get('region') as string,
      source: 'manual',
      emailStatus: 'pending',
      leadScore: 50,
      createdAt: new Date().toISOString()
    };
    
    setLeads([newLead, ...leads]);
    setIsCreateModalOpen(false);
  };

  const handleAiSearch = () => {
    setIsSearching(true);
    // Simulating AI Search
    setTimeout(() => {
      const newLeads: Lead[] = [
        {
          id: Date.now() + 1,
          companyName: `Novo ${aiBusinessType || 'Negócio'} AI 1`,
          contactName: "Gerente",
          email: `contacto@novo${aiBusinessType || 'negocio'}.pt`,
          phone: "+351 900 000 000",
          website: "",
          industry: aiBusinessType || "Outro",
          region: aiRegion || "Portugal",
          source: "ai_search",
          emailStatus: "pending",
          leadScore: 75,
          aiConfidence: 0.85,
          createdAt: new Date().toISOString()
        },
        {
          id: Date.now() + 2,
          companyName: `Novo ${aiBusinessType || 'Negócio'} AI 2`,
          contactName: "Diretor",
          email: `info@novo${aiBusinessType || 'negocio'}2.pt`,
          phone: "+351 900 000 001",
          website: "",
          industry: aiBusinessType || "Outro",
          region: aiRegion || "Portugal",
          source: "ai_search",
          emailStatus: "pending",
          leadScore: 68,
          aiConfidence: 0.79,
          createdAt: new Date().toISOString()
        }
      ];
      setLeads([...newLeads, ...leads]);
      setIsSearching(false);
      setIsAiSearchModalOpen(false);
    }, 2000);
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
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de Leads</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sistema avançado de prospeção e nurturing</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Mail className="w-4 h-4" /> Processar Emails
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button 
            onClick={() => setIsAiSearchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-purple-200 dark:border-purple-900/30 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
          >
            <BrainCircuit className="w-4 h-4" /> Pesquisa AI
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pendentes</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Em Follow-up</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.followUp}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Convertidos</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.converted}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Conversão</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text"
            placeholder="Pesquisar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative w-48">
          <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="first_sent">1º Email Enviado</option>
            <option value="second_sent">2º Email Enviado</option>
            <option value="third_sent">3º Email Enviado</option>
            <option value="dormant">Adormecido</option>
            <option value="converted">Convertido</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Carregando leads...
          </div>
        ) : filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-shadow">
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
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            Nenhum lead encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Create Lead Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Criar Novo Lead</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa *</label>
                  <input name="companyName" required className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Contacto</label>
                  <input name="contactName" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input name="email" type="email" required className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                  <input name="phone" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
                  <input name="website" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Indústria</label>
                  <input name="industry" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Região</label>
                  <input name="region" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Negócio</label>
                  <input name="businessType" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                  Criar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Search Modal */}
      {isAiSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-600" />
                Pesquisa AI de Leads
              </h3>
              <button onClick={() => setIsAiSearchModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                A IA irá pesquisar na web por empresas que correspondam aos critérios, extrair contactos e verificar a sua validade.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Região Alvo</label>
                <select 
                  value={aiRegion}
                  onChange={(e) => setAiRegion(e.target.value)}
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none border"
                >
                  <option value="">Selecione uma região</option>
                  <option value="lisboa">Lisboa</option>
                  <option value="porto">Porto</option>
                  <option value="coimbra">Coimbra</option>
                  <option value="braga">Braga</option>
                  <option value="faro">Faro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Negócio</label>
                <select 
                  value={aiBusinessType}
                  onChange={(e) => setAiBusinessType(e.target.value)}
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none border"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="restauracao">Restauração</option>
                  <option value="hotelaria">Hotelaria</option>
                  <option value="comercio">Comércio</option>
                  <option value="servicos">Serviços</option>
                  <option value="saude">Saúde</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleAiSearch}
                  disabled={isSearching || !aiRegion || !aiBusinessType}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pesquisando...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      Iniciar Pesquisa AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeadsManagement;
