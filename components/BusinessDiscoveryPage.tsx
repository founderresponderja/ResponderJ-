
import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Download, 
  Filter,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Instagram,
  Compass
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface BusinessLead {
  id: string;
  name: string;
  businessType: string;
  category: string;
  phone?: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  region: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  aiScore: number;
  potentialValue: "baixo" | "médio" | "alto";
  lastUpdated: string;
}

const BusinessDiscoveryPage: React.FC = () => {
  const [criteria, setCriteria] = useState({
    businessType: "restaurant",
    region: "Lisboa",
    timeFrame: "3months",
    includeSocialMedia: true,
    minRating: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch('/api/discovery/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria)
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeads(data.businesses);
      } else {
        console.error("Search failed");
      }
    } catch (error) {
      console.error("Error searching businesses", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (leads.length === 0) return;
    
    try {
      const response = await fetch('/api/discovery/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-descoberta-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting leads", error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (score >= 70) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
    if (score >= 50) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400";
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Descoberta de Negócios IA
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Encontre novos negócios na sua região usando Inteligência Artificial.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <Card className="lg:col-span-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" /> Critérios de Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Negócio</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select 
                    value={criteria.businessType}
                    onChange={(e) => setCriteria({...criteria, businessType: e.target.value})}
                    className="w-full pl-9 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="restaurant">Restauração</option>
                    <option value="accommodation">Alojamento</option>
                    <option value="retail">Retalho</option>
                    <option value="service">Serviços</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Região</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={criteria.region}
                    onChange={(e) => setCriteria({...criteria, region: e.target.value})}
                    className="w-full pl-9 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Ex: Lisboa, Porto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prazo de Criação</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select 
                    value={criteria.timeFrame}
                    onChange={(e) => setCriteria({...criteria, timeFrame: e.target.value})}
                    className="w-full pl-9 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="1month">Último Mês</option>
                    <option value="3months">Últimos 3 Meses</option>
                    <option value="6months">Últimos 6 Meses</option>
                    <option value="1year">Último Ano</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {isLoading ? 'A Pesquisar...' : 'Encontrar Negócios'}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-6">
          {hasSearched && leads.length > 0 && (
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium text-slate-700 dark:text-slate-200">{leads.length} Negócios Encontrados</span>
              </div>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Exportar CSV
              </button>
            </div>
          )}

          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center h-96 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Comece a sua pesquisa</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md text-center mt-2">
                Defina os critérios à esquerda para encontrar novos negócios e oportunidades na sua área.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">A analisar o mercado com IA...</p>
              <p className="text-slate-400 text-sm mt-2">Isto pode demorar alguns segundos.</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <AlertCircle className="w-10 h-10 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Nenhum negócio encontrado</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Tente alargar os critérios de pesquisa.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {leads.map((lead) => (
                <Card key={lead.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{lead.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                              <Briefcase className="w-3 h-3" /> {lead.category} • <MapPin className="w-3 h-3" /> {lead.city}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(lead.aiScore)}`}>
                            AI Score: {lead.aiScore}/100
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">
                          {lead.description || "Sem descrição disponível."}
                        </p>
                        
                        <div className="flex flex-wrap gap-4 mt-4 text-sm">
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Website
                            </a>
                          )}
                          {lead.socialMedia?.facebook && (
                            <a href={lead.socialMedia.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Facebook className="w-3 h-3" /> Facebook
                            </a>
                          )}
                          {lead.socialMedia?.instagram && (
                            <a href="#" className="flex items-center gap-1 text-pink-600 hover:underline">
                              <Instagram className="w-3 h-3" /> Instagram
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-6 flex flex-col justify-center min-w-[200px]">
                        <div className="space-y-3">
                           <div className="flex justify-between text-sm">
                             <span className="text-slate-500">Potencial:</span>
                             <span className="font-medium capitalize">{lead.potentialValue}</span>
                           </div>
                           <div className="flex justify-between text-sm">
                             <span className="text-slate-500">Avaliação:</span>
                             <span className="font-medium">{lead.rating ? `${lead.rating} ★ (${lead.reviewCount})` : 'N/A'}</span>
                           </div>
                           <button className="w-full mt-2 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                             Ver Detalhes
                           </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDiscoveryPage;
