import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Settings, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Mail, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar, 
  Euro
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import PageHeader from './PageHeader';

interface Invoice {
  id: string;
  number: string;
  customerName: string;
  customerNif: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

const MOCK_INVOICES: Invoice[] = [
  { id: '1', number: 'FAT-2025/001', customerName: 'Empresa ABC Lda', customerNif: '501234567', date: '2025-01-15', dueDate: '2025-02-14', amount: 1250.00, status: 'paid' },
  { id: '2', number: 'FAT-2025/002', customerName: 'Cliente XYZ', customerNif: '234567890', date: '2025-01-20', dueDate: '2025-02-19', amount: 850.50, status: 'sent' },
  { id: '3', number: 'FAT-2025/003', customerName: 'Serviços Tech SA', customerNif: '509876543', date: '2025-01-25', dueDate: '2025-02-24', amount: 2100.00, status: 'overdue' },
  { id: '4', number: 'RASCUNHO', customerName: 'Nova Startup', customerNif: '511222333', date: '2025-01-28', dueDate: '2025-02-27', amount: 450.00, status: 'draft' },
];

const InvoicingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">Pago</span>;
      case 'sent': return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">Enviado</span>;
      case 'overdue': return <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">Vencido</span>;
      case 'draft': return <span className="bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded-full text-xs font-medium">Rascunho</span>;
      case 'cancelled': return <span className="bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-1 rounded-full text-xs font-medium">Anulado</span>;
      default: return null;
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Faturação" 
        description="Emissão e gestão de documentos certificados pela AT"
        showBackButton={false}
        className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8 px-4 md:px-8"
      >
        <button 
          onClick={() => setActiveTab('create')}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Nova Fatura
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Faturado</span>
            <Euro className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">€12.420</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">+15% vs mês anterior</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pendente</span>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">€3.450</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">4 faturas enviadas</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Vencido</span>
            <Calendar className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">€2.100</div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Ação necessária</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="create">Nova Fatura</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Pesquisar por cliente ou número..."
                    className="pl-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                  <Filter size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-l-lg">Número</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Data Emissão</th>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium rounded-r-lg text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{invoice.number}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <div>
                            <p>{invoice.customerName}</p>
                            <p className="text-xs text-slate-400">NIF: {invoice.customerNif}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(invoice.date).toLocaleDateString('pt-PT')}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(invoice.dueDate).toLocaleDateString('pt-PT')}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">€{invoice.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand-600 transition-colors" title="Ver">
                              <Eye size={16} />
                            </button>
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand-600 transition-colors" title="Download">
                              <Download size={16} />
                            </button>
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand-600 transition-colors" title="Enviar Email">
                              <Mail size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Nova Fatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Dados do Cliente</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome ou Empresa</label>
                    <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" placeholder="Ex: Cliente ABC" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">NIF</label>
                      <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" placeholder="123456789" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                      <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" placeholder="email@cliente.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Morada</label>
                    <textarea className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" rows={2} placeholder="Rua, Código Postal, Localidade" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Detalhes do Documento</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data Emissão</label>
                      <input type="date" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vencimento</label>
                      <input type="date" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Referência Interna</label>
                    <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" placeholder="Opcional" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Itens</h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center border border-dashed border-slate-300 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400 mb-3">Adicione produtos ou serviços à fatura</p>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Adicionar Linha
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
                  Guardar Rascunho
                </button>
                <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Emitir Fatura
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Configurações de Faturação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Série de Faturação</label>
                  <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" defaultValue="2025" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Próximo Número</label>
                  <input type="number" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" defaultValue="4" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Prazo de Vencimento (Dias)</label>
                  <input type="number" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">IVA Padrão (%)</label>
                  <select className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm">
                    <option value="23">23% (Normal)</option>
                    <option value="13">13% (Intermédia)</option>
                    <option value="6">6% (Reduzida)</option>
                    <option value="0">Isento</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Guardar Configurações
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoicingPage;