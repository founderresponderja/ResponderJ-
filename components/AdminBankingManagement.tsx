import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  FileText, 
  MoreVertical, 
  Search, 
  Filter, 
  Download,
  CircleAlert,
  CircleCheckBig,
  Calendar,
  Wallet,
  Activity,
  Eye,
  Trash2,
  Edit,
  FileSpreadsheet
} from 'lucide-react';

// Interfaces
interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban: string;
  balance: number;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BankTransaction {
  id: string;
  bankAccountId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  description: string;
  transactionDate: string;
  status: 'pending' | 'cleared' | 'failed';
  isReconciled: boolean;
}

interface FinancialReport {
  id: string;
  reportType: 'monthly' | 'quarterly' | 'annual';
  reportDate: string;
  createdAt: string;
  status: 'generated' | 'processing';
}

// Mock Data
const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: "1",
    bankName: "Novo Banco",
    accountNumber: "1234567890",
    accountHolder: "Amplia Solutions Lda",
    iban: "PT50 0007 0000 1234 5678 9012 3",
    balance: 15420.50,
    currency: "EUR",
    isActive: true,
    isDefault: true,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-20T10:00:00Z"
  },
  {
    id: "2",
    bankName: "Millennium BCP",
    accountNumber: "9876543210",
    accountHolder: "Amplia Solutions Lda",
    iban: "PT50 0033 0000 9876 5432 1098 7",
    balance: 5200.00,
    currency: "EUR",
    isActive: true,
    isDefault: false,
    createdAt: "2024-01-15T14:00:00Z",
    updatedAt: "2024-01-20T14:00:00Z"
  }
];

const MOCK_TRANSACTIONS: BankTransaction[] = [
  {
    id: "1",
    bankAccountId: "1",
    amount: 150.00,
    currency: "EUR",
    type: "credit",
    description: "Subscrição Pro - Cliente A",
    transactionDate: "2024-01-20T10:30:00Z",
    status: "cleared",
    isReconciled: true
  },
  {
    id: "2",
    bankAccountId: "1",
    amount: 49.90,
    currency: "EUR",
    type: "credit",
    description: "Subscrição Regular - Cliente B",
    transactionDate: "2024-01-19T15:45:00Z",
    status: "cleared",
    isReconciled: false
  },
  {
    id: "3",
    bankAccountId: "2",
    amount: 1200.00,
    currency: "EUR",
    type: "debit",
    description: "Pagamento Servidores AWS",
    transactionDate: "2024-01-18T09:00:00Z",
    status: "cleared",
    isReconciled: true
  },
  {
    id: "4",
    bankAccountId: "1",
    amount: 250.00,
    currency: "EUR",
    type: "debit",
    description: "Serviços de Contabilidade",
    transactionDate: "2024-01-22T11:00:00Z",
    status: "pending",
    isReconciled: false
  }
];

const MOCK_REPORTS: FinancialReport[] = [
  {
    id: "1",
    reportType: "monthly",
    reportDate: "2023-12-01T00:00:00Z",
    createdAt: "2024-01-01T10:00:00Z",
    status: "generated"
  },
  {
    id: "2",
    reportType: "annual",
    reportDate: "2023-01-01T00:00:00Z",
    createdAt: "2024-01-05T10:00:00Z",
    status: "generated"
  }
];

const AdminBankingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'reports'>('accounts');
  const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_ACCOUNTS);
  const [transactions, setTransactions] = useState<BankTransaction[]>(MOCK_TRANSACTIONS);
  const [reports, setReports] = useState<FinancialReport[]>(MOCK_REPORTS);
  
  // States for filters and modals
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // Summary Stats
  const stats = {
    totalRevenue: accounts.reduce((acc, curr) => acc + curr.balance, 0),
    totalTransactions: transactions.length,
    pendingReconciliation: transactions.filter(t => !t.isReconciled).length,
    activeAccounts: accounts.filter(a => a.isActive).length
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesAccount = selectedAccountFilter ? t.bankAccountId === selectedAccountFilter : true;
    const matchesType = transactionTypeFilter === 'all' || t.type === transactionTypeFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    
    return matchesAccount && matchesType && matchesStatus;
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to add account would go here
    setIsCreateModalOpen(false);
    alert("Funcionalidade de criar conta simulada com sucesso!");
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to add transaction would go here
    setIsTransactionModalOpen(false);
    alert("Transação registada com sucesso!");
  };

  const handleReconcile = (id: string) => {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, isReconciled: true } : t
    ));
  };

  const activeFiltersCount = (transactionTypeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão Bancária</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerir contas bancárias, transações e relatórios financeiros</p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Total</span>
            <Euro className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">€{stats.totalRevenue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Transações</span>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTransactions}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pendente Reconciliação</span>
            <CircleAlert className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingReconciliation}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Contas Activas</span>
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeAccounts}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "accounts" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Contas Bancárias
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "transactions" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Transações
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "reports" 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Relatórios
        </button>
      </div>

      {/* Tab Content: Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Contas Bancárias</h3>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Conta
            </button>
          </div>

          <div className="grid gap-4">
            {accounts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Nenhuma conta bancária registada.</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Comece por adicionar a primeira conta.</p>
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Building2 className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">{account.bankName}</h4>
                          {account.isDefault && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              PADRÃO
                            </span>
                          )}
                          {!account.isActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              INACTIVA
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {account.accountHolder} • {account.accountNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">IBAN</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-mono">{account.iban}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Saldo Atual</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {account.balance.toLocaleString('pt-PT', { style: 'currency', currency: account.currency })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Criada em</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {new Date(account.createdAt).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Última atualização</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {new Date(account.updatedAt).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Transactions */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Transações Bancárias</h3>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                value={selectedAccountFilter}
                onChange={(e) => setSelectedAccountFilter(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm p-2 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todas as contas</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 border rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400' 
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
                title="Filtrar Transações"
              >
                <Filter size={20} />
                {activeFiltersCount > 0 && (
                  <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setIsTransactionModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Nova
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de Movimento</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTransactionTypeFilter('all')}
                    className={`flex-1 py-1.5 text-sm rounded border ${transactionTypeFilter === 'all' ? 'bg-white dark:bg-slate-700 border-brand-500 text-brand-600' : 'border-transparent hover:bg-white dark:hover:bg-slate-700 text-slate-600'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setTransactionTypeFilter('credit')}
                    className={`flex-1 py-1.5 text-sm rounded border ${transactionTypeFilter === 'credit' ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-600' : 'border-transparent hover:bg-white dark:hover:bg-slate-700 text-slate-600'}`}
                  >
                    Crédito
                  </button>
                  <button 
                    onClick={() => setTransactionTypeFilter('debit')}
                    className={`flex-1 py-1.5 text-sm rounded border ${transactionTypeFilter === 'debit' ? 'bg-white dark:bg-slate-700 border-red-500 text-red-600' : 'border-transparent hover:bg-white dark:hover:bg-slate-700 text-slate-600'}`}
                  >
                    Débito
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm p-1.5 outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">Todos</option>
                  <option value="cleared">Processado</option>
                  <option value="pending">Pendente</option>
                  <option value="failed">Falhado</option>
                </select>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Nenhuma transação encontrada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Descrição</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Montante</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {new Date(transaction.transactionDate).toLocaleDateString('pt-PT')}
                          <div className="text-xs text-slate-400">{new Date(transaction.transactionDate).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900 dark:text-white">{transaction.description}</span>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {accounts.find(a => a.id === transaction.bankAccountId)?.bankName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {transaction.type === 'credit' ? (
                            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <TrendingUp className="w-3 h-3 mr-1" /> Crédito
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 dark:text-red-400 text-xs font-medium">
                              <TrendingDown className="w-3 h-3 mr-1" /> Débito
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium">
                          <span className={transaction.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {transaction.type === 'credit' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              transaction.status === 'cleared' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {transaction.status === 'cleared' ? 'Processado' : 'Pendente'}
                            </span>
                            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              transaction.isReconciled
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {transaction.isReconciled ? 'Reconciliado' : 'Não Reconciliado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!transaction.isReconciled && (
                            <button 
                              onClick={() => handleReconcile(transaction.id)}
                              className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              Reconciliar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Reports */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Relatórios Financeiros</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <FileText className="w-4 h-4" /> Relatório Mensal
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <FileText className="w-4 h-4" /> Relatório Trimestral
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <div key={report.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Download PDF">
                        <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Download Excel">
                        <FileSpreadsheet className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white capitalize mb-1">
                  {report.reportType === 'monthly' ? 'Relatório Mensal' : 'Relatório Anual'}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Período: {new Date(report.reportDate).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span>Gerado em {new Date(report.createdAt).toLocaleDateString('pt-PT')}</span>
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 uppercase font-bold">
                    {report.status === 'generated' ? 'Pronto' : 'A Processar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Account Modal (Simulated) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adicionar Nova Conta</h3>
            </div>
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Banco</label>
                  <input type="text" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número da Conta</label>
                  <input type="text" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IBAN</label>
                <input type="text" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial</label>
                  <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moeda</label>
                  <select className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent">
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Criar Conta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Transaction Modal (Simulated) */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nova Transação</h3>
            </div>
            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Bancária</label>
                <select className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent">
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent">
                    <option value="credit">Crédito (+)</option>
                    <option value="debit">Débito (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montante</label>
                  <input type="number" step="0.01" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input type="text" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                <input type="datetime-local" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Registar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBankingManagement;