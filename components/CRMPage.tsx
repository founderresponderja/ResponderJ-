import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  Phone, 
  Mail, 
  MoreVertical, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'lead' | 'prospect' | 'customer';
  stage: 'Novo' | 'Contactado' | 'Proposta' | 'Ganho';
  lastContact: string;
  value: number;
}

const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'Ana Silva', company: 'Hotel Mar', email: 'ana@hotelmar.pt', phone: '+351 912 345 678', status: 'customer', stage: 'Ganho', lastContact: '2024-01-20', value: 1200 },
  { id: '2', name: 'Carlos Santos', company: 'Restaurante Central', email: 'carlos@central.pt', phone: '+351 966 555 444', status: 'lead', stage: 'Novo', lastContact: '2024-01-18', value: 0 },
  { id: '3', name: 'Marta Dias', company: 'Beleza & Co', email: 'marta@beleza.pt', phone: '+351 933 222 111', status: 'prospect', stage: 'Proposta', lastContact: '2024-01-15', value: 450 },
  { id: '4', name: 'Pedro Oliveira', company: 'Tech Solutions', email: 'pedro@tech.pt', phone: '+351 911 222 333', status: 'lead', stage: 'Contactado', lastContact: '2024-01-21', value: 2500 },
  { id: '5', name: 'Sofia Martins', company: 'Loja Bio', email: 'sofia@bio.pt', phone: '+351 922 333 444', status: 'prospect', stage: 'Proposta', lastContact: '2024-01-19', value: 800 },
];

const CRMPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0,
    status: 'lead',
    stage: 'Novo'
  });

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesStage = stageFilter === 'all' || c.stage === stageFilter;
    
    return matchesSearch && matchesStatus && matchesStage;
  });

  // Stats Calculation
  const totalLeads = contacts.length;
  const pipelineValue = contacts.reduce((sum, c) => sum + (c.value || 0), 0);
  const customers = contacts.filter(c => c.status === 'customer').length;
  const conversionRate = totalLeads > 0 ? Math.round((customers / totalLeads) * 100) : 0;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.company) return;

    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name!,
      company: newContact.company!,
      email: newContact.email || '',
      phone: newContact.phone || '',
      value: Number(newContact.value) || 0,
      status: newContact.status as 'lead' | 'prospect' | 'customer',
      stage: newContact.stage as 'Novo' | 'Contactado' | 'Proposta' | 'Ganho',
      lastContact: new Date().toISOString().split('T')[0]
    };

    setContacts([contact, ...contacts]);
    setIsModalOpen(false);
    setNewContact({ name: '', company: '', email: '', phone: '', value: 0, status: 'lead', stage: 'Novo' });
  };

  const getStageContacts = (stage: string) => {
    return filteredContacts.filter(c => c.stage === stage);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setStageFilter('all');
    setSearchTerm('');
  };

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (stageFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">CRM</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerir relacionamentos e oportunidades de venda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Novo Contacto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Contactos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalLeads}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pipeline Valor</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">€{pipelineValue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa Conversão</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{conversionRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <CheckCircle2 size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="contacts">Contactos</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Pesquisar contactos..."
                    className="pl-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 border rounded-md transition-colors flex items-center gap-2 ${
                      showFilters || activeFiltersCount > 0
                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Filter size={18} />
                    {activeFiltersCount > 0 && (
                      <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm p-2 outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="all">Todos</option>
                      <option value="lead">Lead</option>
                      <option value="prospect">Prospect</option>
                      <option value="customer">Cliente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fase Pipeline</label>
                    <select 
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm p-2 outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="all">Todas</option>
                      <option value="Novo">Novo</option>
                      <option value="Contactado">Contactado</option>
                      <option value="Proposta">Proposta</option>
                      <option value="Ganho">Ganho</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={clearFilters}
                      className="text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 underline decoration-dashed underline-offset-4"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-l-lg">Nome</th>
                      <th className="px-4 py-3 font-medium">Empresa</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Fase</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium rounded-r-lg text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{contact.name}</p>
                              <p className="text-xs text-slate-500">{contact.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{contact.company}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize 
                              ${contact.status === 'customer' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                contact.status === 'prospect' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {contact.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                contact.stage === 'Ganho' ? 'bg-green-500' :
                                contact.stage === 'Proposta' ? 'bg-purple-500' :
                                contact.stage === 'Contactado' ? 'bg-blue-500' : 'bg-slate-400'
                              }`}></span>
                              {contact.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                            {contact.value > 0 ? `€${contact.value.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand-600 transition-colors">
                                <Mail size={16} />
                              </button>
                              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand-600 transition-colors">
                                <Phone size={16} />
                              </button>
                              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          Nenhum contacto encontrado com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
            {['Novo', 'Contactado', 'Proposta', 'Ganho'].map((stage) => {
              const stageContacts = getStageContacts(stage);
              return (
                <div key={stage} className="flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">{stage}</h3>
                    <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-500">
                      {stageContacts.length}
                    </span>
                  </div>
                  <div className="space-y-3 overflow-y-auto flex-1">
                    {stageContacts.map((contact) => (
                      <div key={contact.id} className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded">
                            {contact.status}
                          </span>
                          <MoreVertical size={14} className="text-slate-400" />
                        </div>
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                          {contact.company}
                        </h4>
                        <p className="text-xs text-slate-500 mb-2">{contact.name}</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>{contact.value > 0 ? `€${contact.value}` : '-'}</span>
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                            {contact.name.substring(0,2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 z-10">
                        {i === 1 ? <Mail size={14} /> : i === 2 ? <Phone size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      {i !== 3 && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 -my-2 pt-8" />}
                    </div>
                    <div className="pb-6">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {i === 1 ? 'Email enviado para Ana Silva' : i === 2 ? 'Chamada com Carlos Santos' : 'Tarefa concluída: Preparar proposta'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Hoje, 1{i}:30</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                        {i === 1 ? 'Envio de apresentação comercial e tabela de preços.' : i === 2 ? 'Cliente interessado na demo, agendada para amanhã.' : 'Proposta finalizada e enviada para revisão interna.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Novo Contacto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                <input 
                  type="text" 
                  required
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa *</label>
                <input 
                  type="text" 
                  required
                  value={newContact.company}
                  onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Ex: Empresa Lda"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                  <input 
                    type="tel" 
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="+351..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (€)</label>
                  <input 
                    type="number" 
                    value={newContact.value}
                    onChange={(e) => setNewContact({...newContact, value: Number(e.target.value)})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select 
                    value={newContact.status}
                    onChange={(e) => setNewContact({...newContact, status: e.target.value as any})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Cliente</option>
                  </select>
                </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fase do Pipeline</label>
                  <select 
                    value={newContact.stage}
                    onChange={(e) => setNewContact({...newContact, stage: e.target.value as any})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Proposta">Proposta</option>
                    <option value="Ganho">Ganho</option>
                  </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;