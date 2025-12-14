import React, { useState } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';

const AdminCriticalSystems: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const systems = [
    { name: 'API Server', status: 'operational', latency: '45ms', uptime: '99.99%' },
    { name: 'Database (PostgreSQL)', status: 'operational', latency: '12ms', uptime: '99.95%' },
    { name: 'Cache (Redis)', status: 'operational', latency: '2ms', uptime: '100%' },
    { name: 'Storage', status: 'warning', latency: '120ms', uptime: '99.90%' },
    { name: 'AI Service (Gemini)', status: 'operational', latency: '850ms', uptime: '99.5%' },
  ];

  const alerts = [
    { id: 1, severity: 'warning', message: 'High memory usage on Storage node', timestamp: '10m ago' },
    { id: 2, severity: 'info', message: 'Daily backup completed successfully', timestamp: '2h ago' },
    { id: 3, severity: 'error', message: 'Failed payment webhook delivery (retry scheduled)', timestamp: '4h ago' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'operational': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'operational': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Monitorização de Sistemas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Estado em tempo real da infraestrutura crítica</p>
        </div>
        <button 
          onClick={refreshData}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Estado Geral</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">Operacional</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tempo Médio Resposta</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">124ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Requests (24h)</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">1.2M</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Systems List */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-lg">Componentes do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systems.map((sys) => (
                  <div key={sys.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(sys.status)}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{sys.name}</p>
                        <p className="text-xs text-slate-500">Uptime: {sys.uptime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{sys.latency}</p>
                      <p className={`text-xs capitalize font-medium ${getStatusColor(sys.status)}`}>{sys.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Feed */}
        <div>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-lg">Alertas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex gap-3 p-3 border-l-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="mt-0.5">
                      {alert.severity === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> : 
                       alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : 
                       <CheckCircle className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <p className="text-sm text-slate-800 dark:text-slate-200">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{alert.timestamp}</p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Sem alertas recentes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCriticalSystems;
