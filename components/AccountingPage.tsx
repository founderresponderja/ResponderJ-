import React, { useState } from 'react';
import { 
  Calculator, 
  Euro, 
  Download, 
  Plus, 
  FileText, 
  TrendingUp, 
  CreditCard, 
  Building2, 
  Calendar, 
  CircleCheckBig, 
  CircleAlert, 
  Save,
  Wallet,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';

// Mock Data from the original file
const ENTRIES = [
  { id: 1, entryNumber: "LAN-2025-001", date: "2025-01-15", description: "Venda de serviços - Cliente ABC", totalDebit: 1500, totalCredit: 1500, status: "posted" },
  { id: 2, entryNumber: "LAN-2025-002", date: "2025-01-20", description: "Compra de material de escritório", totalDebit: 250, totalCredit: 250, status: "posted" }
];

const ACCOUNTS = [
  { code: "11", name: "Caixa", type: "asset", balance: 5420.5 },
  { code: "12", name: "Depósitos à ordem", type: "asset", balance: 15230.75 },
  { code: "21", name: "Clientes", type: "asset", balance: 8750 },
  { code: "61", name: "Compras", type: "expense", balance: 12450.3 },
  { code: "71", name: "Vendas", type: "revenue", balance: 45680.9 }
];

const AccountingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [businessType, setBusinessType] = useState("individual_entrepreneur");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Contabilidade Portuguesa</h2>
        <p className="text-slate-500 dark:text-slate-400">Sistema de contabilidade conforme legislação portuguesa para ENI e sociedades unipessoais</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Receitas YTD</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">€45.681</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-emerald-600 dark:text-emerald-400 font-medium">+12% vs ano anterior</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Despesas YTD</span>
            <Euro className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">€12.450</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-rose-600 dark:text-rose-400 font-medium">+8% vs ano anterior</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Resultado Líquido</span>
            <Calculator className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">€33.231</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Margem: 72.7%</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">IVA a Entregar</span>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">€3.250</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-amber-600 dark:text-amber-400 font-medium">Vencimento: 15 Fev</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex overflow-x-auto">
        {['dashboard', 'entries', 'accounts', 'reports', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'dashboard' && 'Painel'}
            {tab === 'entries' && 'Lançamentos'}
            {tab === 'accounts' && 'Plano de Contas'}
            {tab === 'reports' && 'Relatórios'}
            {tab === 'settings' && 'Configurações'}
          </button>
        ))}
      </div>

      {/* Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Regime Fiscal */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-800 dark:text-white">Regime Fiscal Atual</h3>
              <Building2 className="text-slate-400 h-5 w-5" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-400">Tipo de Empresa:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {businessType === "individual_entrepreneur" ? "Empresário em Nome Individual" : "Sociedade Unipessoal"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-400">Regime IVA:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Normal
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-400">Regime Tributário:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  Simplificado
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium text-slate-600 dark:text-slate-400">Ano Fiscal:</span>
                <span className="text-slate-800 dark:text-white">2025 (Jan - Dez)</span>
              </div>
            </div>
          </div>

          {/* Obrigações Fiscais */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-800 dark:text-white">Obrigações Fiscais</h3>
              <Calendar className="text-slate-400 h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Declaração Periódica IVA</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Janeiro 2025</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  Pendente
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Retenções na Fonte</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Janeiro 2025</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Cumprida
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Segurança Social</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Janeiro 2025</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Cumprida
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Entries */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-800 dark:text-white">Lançamentos Contabilísticos</h3>
            <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Novo Lançamento
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 font-medium">Número</th>
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium">Descrição</th>
                    <th className="px-6 py-3 font-medium">Débito</th>
                    <th className="px-6 py-3 font-medium">Crédito</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {ENTRIES.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{entry.entryNumber}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(entry.date).toLocaleDateString('pt-PT')}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{entry.description}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">€{entry.totalDebit.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">€{entry.totalCredit.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'posted' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {entry.status === 'posted' ? 'Lançado' : 'Rascunho'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-800 dark:text-white">Plano de Contas</h3>
            <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Nova Conta
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Código</th>
                  <th className="px-6 py-3 font-medium">Designação</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {ACCOUNTS.map((account) => (
                  <tr key={account.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono font-medium text-brand-600 dark:text-brand-400">{account.code}</td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{account.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {account.type === 'asset' ? 'Ativo' : account.type === 'expense' ? 'Gasto' : 'Rendimento'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                      €{account.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 dark:text-white">Demonstração de Resultados</h3>
                <TrendingUp className="text-slate-400 h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Por categoria de receitas e gastos.</p>
            </div>
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> PDF
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 dark:text-white">Balancete</h3>
                <PieChart className="text-slate-400 h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Saldos por conta contabilística.</p>
            </div>
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> PDF
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 dark:text-white">Anexo A - Receitas</h3>
                <FileText className="text-slate-400 h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Para empresários em nome individual.</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Gerar Anexo A
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 dark:text-white">Declaração Periódica IVA</h3>
                <Building2 className="text-slate-400 h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Exportar dados para AT.</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Exportar IVA
            </button>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-white">Configurações de Contabilidade</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Configure o regime fiscal e dados da empresa</p>
            </div>
            <Save className="text-slate-400 h-5 w-5" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="business-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Empresa *</label>
              <select 
                id="business-type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-brand-500 outline-none border"
              >
                <option value="individual_entrepreneur">Empresário em Nome Individual</option>
                <option value="unipersonal_society">Sociedade Unipessoal por Quotas</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="tax-regime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Regime Tributário</label>
              <select 
                id="tax-regime"
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-brand-500 outline-none border"
              >
                <option value="normal">Normal</option>
                <option value="simplified">Simplificado</option>
                <option value="mixed">Misto</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="vat-regime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Regime de IVA</label>
              <select 
                id="vat-regime"
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-brand-500 outline-none border"
              >
                <option value="normal">Normal</option>
                <option value="cash_basis">Caixa</option>
                <option value="exemption">Isenção</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="fiscal-year" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ano Fiscal</label>
              <input 
                id="fiscal-year"
                type="number"
                defaultValue="2025"
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-brand-500 outline-none border"
              />
            </div>
          </div>

          {businessType === "individual_entrepreneur" && (
            <div className="border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 space-y-4 bg-blue-50 dark:bg-blue-900/10">
              <h4 className="font-medium flex items-center text-blue-800 dark:text-blue-300">
                <CircleAlert className="w-4 h-4 mr-2" />
                Configurações ENI - Segurança Social
              </h4>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="ss-regime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Regime de Segurança Social</label>
                  <select 
                    id="ss-regime"
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-brand-500 outline-none border"
                  >
                    <option value="independent">Trabalhador Independente</option>
                    <option value="dependent">Trabalhador por Conta de Outrem</option>
                    <option value="exempt">Isento</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ss-rate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Taxa de Contribuição (%)</label>
                  <input 
                    id="ss-rate"
                    type="number"
                    step="0.1"
                    placeholder="21.4"
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-brand-500 outline-none border"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
              <Save className="w-4 h-4" /> Guardar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPage;