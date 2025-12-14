import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileJson, 
  FileSpreadsheet, 
  File, 
  Loader2,
  Eye,
  RefreshCw,
  Calendar
} from 'lucide-react';

interface SecurityReport {
  id: string;
  title: string;
  type: 'comprehensive' | 'audit' | 'vulnerability' | 'compliance' | 'performance';
  status: 'completed' | 'processing' | 'failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  completedAt?: string;
  fileSize: number;
  format: 'json' | 'pdf' | 'html' | 'csv';
  summary: string;
  findings: number;
  recommendations: number;
}

const MOCK_REPORTS: SecurityReport[] = [
  {
    id: "audit_1755951765705",
    title: "Auditoria de Segurança Abrangente",
    type: "comprehensive",
    status: "completed",
    severity: "medium",
    createdAt: "2025-08-24T20:15:45Z",
    completedAt: "2025-08-24T20:18:23Z",
    fileSize: 2847593,
    format: "json",
    summary: "Auditoria completa do sistema com 92.9% taxa de sucesso",
    findings: 15,
    recommendations: 8
  },
  {
    id: "security_final_2025",
    title: "Relatório Final de Segurança",
    type: "audit",
    status: "completed",
    severity: "low",
    createdAt: "2025-08-24T19:30:12Z",
    completedAt: "2025-08-24T19:35:47Z",
    fileSize: 1245678,
    format: "pdf",
    summary: "Certificação militar-grade com 100/100 pontuação de segurança",
    findings: 3,
    recommendations: 2
  },
  {
    id: "compliance_gdpr_2025",
    title: "Análise de Conformidade RGPD",
    type: "compliance",
    status: "completed",
    severity: "low",
    createdAt: "2025-08-24T18:45:20Z",
    completedAt: "2025-08-24T18:52:15Z",
    fileSize: 892456,
    format: "html",
    summary: "100% conformidade com RGPD e legislação portuguesa",
    findings: 0,
    recommendations: 1
  },
  {
    id: "performance_audit_2025",
    title: "Auditoria de Performance",
    type: "performance",
    status: "completed",
    severity: "medium",
    createdAt: "2025-08-24T17:20:33Z",
    completedAt: "2025-08-24T17:28:41Z",
    fileSize: 1567890,
    format: "json",
    summary: "Optimização de performance com melhorias implementadas",
    findings: 7,
    recommendations: 5
  },
  {
    id: "vulnerability_scan_2025",
    title: "Análise de Vulnerabilidades",
    type: "vulnerability",
    status: "completed",
    severity: "high",
    createdAt: "2025-08-24T16:10:15Z",
    completedAt: "2025-08-24T16:18:33Z",
    fileSize: 3245789,
    format: "pdf",
    summary: "Scan completo com vulnerabilidades críticas corrigidas",
    findings: 12,
    recommendations: 10
  }
];

const AdminSecurityReports: React.FC = () => {
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    // Simular carregamento da API
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setReports(MOCK_REPORTS);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleDownload = (report: SecurityReport) => {
    // Simular download criando um blob
    try {
        const content = `Relatório de Segurança: ${report.title}\nID: ${report.id}\nData: ${report.createdAt}\nResumo: ${report.summary}\nSeveridade: ${report.severity}\nDescobertas: ${report.findings}\nRecomendações: ${report.recommendations}\n\nEste é um ficheiro simulado gerado pelo sistema Responder Já.`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${report.id}.${report.format === 'pdf' ? 'txt' : report.format}`; // Fallback to txt for simplicity in demo
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error("Erro no download:", error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-xs font-bold border border-red-200 dark:border-red-800 uppercase tracking-wider">Crítico</span>;
      case 'high': return <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-bold border border-orange-200 dark:border-orange-800 uppercase tracking-wider">Alto</span>;
      case 'medium': return <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200 dark:border-yellow-800 uppercase tracking-wider">Médio</span>;
      case 'low': return <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded text-xs font-bold border border-green-200 dark:border-green-800 uppercase tracking-wider">Baixo</span>;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
        comprehensive: "Abrangente",
        audit: "Auditoria",
        vulnerability: "Vulnerabilidades",
        compliance: "Conformidade",
        performance: "Performance"
    };
    return types[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(search.toLowerCase()) || 
                          report.summary.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesSeverity;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Relatórios de Segurança
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visualize e faça download de todos os relatórios de auditoria e segurança.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {filteredReports.length} relatório{filteredReports.length !== 1 ? 's' : ''} encontrado{filteredReports.length !== 1 ? 's' : ''}
            </div>
            <button 
              onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Atualizar lista"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtros</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Título ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="all">Todos os Tipos</option>
              <option value="comprehensive">Abrangente</option>
              <option value="audit">Auditoria</option>
              <option value="vulnerability">Vulnerabilidades</option>
              <option value="compliance">Conformidade</option>
              <option value="performance">Performance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="all">Todos os Estados</option>
              <option value="completed">Completo</option>
              <option value="processing">A Processar</option>
              <option value="failed">Falhado</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Severidade</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="all">Todas as Severidades</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 dark:text-slate-400">A carregar relatórios...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum relatório encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tente ajustar os filtros de pesquisa.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <div 
              key={report.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group"
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(report.status)}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {report.title}
                    </h3>
                    {getSeverityBadge(report.severity)}
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">{report.summary}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Criado: {new Date(report.createdAt).toLocaleString('pt-PT')}</span>
                    </div>
                    {report.completedAt && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluído: {new Date(report.completedAt).toLocaleString('pt-PT')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                      <File className="w-3.5 h-3.5" />
                      <span>{formatFileSize(report.fileSize)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded uppercase font-bold text-slate-600 dark:text-slate-300">
                      {report.format === 'json' ? <FileJson className="w-3.5 h-3.5" /> : 
                       report.format === 'csv' ? <FileSpreadsheet className="w-3.5 h-3.5" /> : 
                       <FileText className="w-3.5 h-3.5" />}
                      <span>{report.format}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-900 font-medium">
                      {getTypeLabel(report.type)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border capitalize font-medium ${
                        report.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900' :
                        report.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900' :
                        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900'
                    }`}>
                      {report.status === 'completed' ? 'Completo' : report.status === 'processing' ? 'A Processar' : 'Falhado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs w-full justify-end mt-1">
                    {report.findings > 0 && (
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-orange-50 dark:bg-orange-900/10 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/30">
                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                        <strong>{report.findings}</strong> descobertas
                      </div>
                    )}
                    {report.recommendations > 0 && (
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/10 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">
                        <Shield className="w-3 h-3 text-blue-500" />
                        <strong>{report.recommendations}</strong> rec.
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleDownload(report)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors shadow-sm mt-2 hover:border-indigo-300 dark:hover:border-indigo-700"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSecurityReports;