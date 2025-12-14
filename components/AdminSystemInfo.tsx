import React, { useState } from 'react';
import { 
  Cloud, 
  Layers, 
  Monitor, 
  Smartphone, 
  Database, 
  Server, 
  Download, 
  FileText, 
  GitBranch, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Calendar,
  User,
  Shield,
  Zap,
  Globe,
  Code,
  Layout,
  Cpu,
  HardDrive,
  Network,
  Lock,
  Boxes,
  Activity
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import PageHeader from './PageHeader';

interface SystemSpec {
  platform: string;
  name: string;
  version: string;
  description: string;
  technologies: string[];
  architecture: string;
  hosting: string;
  security: string[];
  performance: {
    loadTime: string;
    throughput: string;
    concurrent: string;
    storage: string;
  };
  compliance: string[];
  integrations: string[];
}

interface VersionLog {
  id: string;
  platform: string;
  version: string;
  buildNumber: string;
  status: 'production' | 'testing' | 'development' | 'deprecated';
  releaseDate: string;
  changelog: string;
  features: string[];
  bugfixes: string[];
  createdBy: string;
  createdAt: string;
}

const SYSTEM_SPECS: SystemSpec[] = [
  {
    platform: "web",
    name: "Responder Já Web App",
    version: "2.6.0",
    description: "Aplicação web principal para gestão de respostas empresariais",
    technologies: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Shadcn/ui", "Framer Motion"],
    architecture: "SPA (Single Page Application) com SSR parcial",
    hosting: "Replit Cloud Platform",
    security: ["HTTPS/TLS 1.3", "CSP Headers", "XSS Protection", "CSRF Tokens", "Rate Limiting"],
    performance: {
      loadTime: "< 1.2s",
      throughput: "10.000 req/min",
      concurrent: "5.000 utilizadores",
      storage: "Redis Cache + PostgreSQL"
    },
    compliance: ["GDPR", "Lei 58/2019 (Portugal)", "ePrivacy Directive"],
    integrations: ["OpenAI API", "SendGrid", "Stripe", "Google Analytics"]
  },
  {
    platform: "android",
    name: "Responder Já Android",
    version: "1.3.0",
    description: "Aplicação móvel nativa para Android com funcionalidades completas",
    technologies: ["Kotlin", "Jetpack Compose", "Android SDK 34", "Material Design 3", "Room Database"],
    architecture: "MVVM com Clean Architecture",
    hosting: "Google Play Store",
    security: ["Biometric Auth", "SSL Pinning", "ProGuard Obfuscation", "Secure Storage"],
    performance: {
      loadTime: "< 2s",
      throughput: "Offline-first",
      concurrent: "Single-user",
      storage: "SQLite local + Cloud sync"
    },
    compliance: ["Google Play Policies", "Android Security Model"],
    integrations: ["Firebase Push", "Google Services", "Biometric API"]
  },
  {
    platform: "ios",
    name: "Responder Já iOS",
    version: "1.3.0",
    description: "Aplicação móvel nativa para iOS com design adaptativo",
    technologies: ["Swift 5.9", "SwiftUI", "iOS 16+", "Core Data", "Combine Framework"],
    architecture: "MVVM com SwiftUI Reactive Programming",
    hosting: "Apple App Store",
    security: ["Face ID/Touch ID", "Certificate Pinning", "Keychain Services", "App Transport Security"],
    performance: {
      loadTime: "< 1.8s",
      throughput: "Offline-first",
      concurrent: "Single-user",
      storage: "Core Data + CloudKit"
    },
    compliance: ["App Store Guidelines", "iOS Privacy Framework"],
    integrations: ["Apple Push Notifications", "StoreKit", "CloudKit"]
  },
  {
    platform: "backend",
    name: "API Backend",
    version: "2.1.0",
    description: "Servidor backend REST/GraphQL com autenticação e autorização",
    technologies: ["Node.js 20", "Express.js", "TypeScript", "Drizzle ORM", "Passport.js"],
    architecture: "Microservices com API Gateway",
    hosting: "Replit Cloud + Neon PostgreSQL",
    security: ["JWT Tokens", "OAuth 2.0", "Rate Limiting", "Input Validation", "SQL Injection Protection"],
    performance: {
      loadTime: "< 200ms",
      throughput: "50.000 req/min",
      concurrent: "10.000 conexões",
      storage: "PostgreSQL + Redis"
    },
    compliance: ["GDPR", "SOC 2", "ISO 27001"],
    integrations: ["OpenAI", "SendGrid", "Stripe", "Social Media APIs"]
  },
  {
    platform: "database",
    name: "Sistema de Base de Dados",
    version: "15.0",
    description: "PostgreSQL gerido com backup automático e réplicas",
    technologies: ["PostgreSQL 15", "Neon Serverless", "Connection Pooling", "Auto-scaling"],
    architecture: "Master-Replica com sharding horizontal",
    hosting: "Neon Cloud (AWS)",
    security: ["Encryption at Rest", "TLS 1.3", "Row Level Security", "Audit Logging"],
    performance: {
      loadTime: "< 50ms",
      throughput: "100.000 queries/min",
      concurrent: "1.000 conexões",
      storage: "500GB SSD + Backup"
    },
    compliance: ["GDPR", "SOC 2", "ISO 27001"],
    integrations: ["Backup automático", "Monitoring", "Metrics collection"]
  },
  {
    platform: "infrastructure",
    name: "Infraestrutura Cloud",
    version: "1.0.0",
    description: "Plataforma de alojamento escalável com monitorização",
    technologies: ["Replit Cloud", "Docker Containers", "Load Balancers", "CDN"],
    architecture: "Container-based com auto-scaling",
    hosting: "Multi-region (EU/US)",
    security: ["WAF", "DDoS Protection", "SSL Certificates", "Security Monitoring"],
    performance: {
      loadTime: "< 100ms CDN",
      throughput: "Auto-scaling",
      concurrent: "Ilimitado",
      storage: "Distributed Storage"
    },
    compliance: ["GDPR", "ISO 27001", "SOC 2"],
    integrations: ["Monitoring", "Alerting", "Log aggregation"]
  }
];

const MOCK_VERSIONS: VersionLog[] = [
  {
    id: "v-101",
    platform: "web",
    version: "2.6.0",
    buildNumber: "260",
    status: "production",
    releaseDate: "2025-08-25T10:00:00Z",
    changelog: "Integração com Gemini 2.5 Flash para respostas mais rápidas e precisas.",
    features: ["Gemini 2.5 Integration", "Sentiment Analysis Dashboard", "Export Reports PDF"],
    bugfixes: ["Login timeout issue", "Responsive layout on tablets"],
    createdBy: "Luís Pedrosa",
    createdAt: "2025-08-20T14:30:00Z"
  },
  {
    id: "v-100",
    platform: "web",
    version: "2.5.0",
    buildNumber: "250",
    status: "production",
    releaseDate: "2025-08-10T09:00:00Z",
    changelog: "Lançamento do módulo de contabilidade e faturação.",
    features: ["Invoicing Module", "Accounting Dashboard", "AT Integration"],
    bugfixes: ["Chart rendering performance"],
    createdBy: "Maria Santos",
    createdAt: "2025-08-05T11:15:00Z"
  },
  {
    id: "v-99",
    platform: "backend",
    version: "2.1.0",
    buildNumber: "2100",
    status: "production",
    releaseDate: "2025-08-15T22:00:00Z",
    changelog: "Optimizações de segurança e middleware de rate limiting.",
    features: ["Advanced Rate Limiting", "SQL Injection Protection", "Security Logs"],
    bugfixes: [],
    createdBy: "System Admin",
    createdAt: "2025-08-14T10:00:00Z"
  }
];

const AdminSystemInfo: React.FC = () => {
  const [activeTab, setActiveTab] = useState("technical");
  const [selectedPlatform, setSelectedPlatform] = useState("web");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "web": return Monitor;
      case "android": return Smartphone;
      case "ios": return Smartphone;
      case "backend": return Server;
      case "database": return Database;
      case "infrastructure": return Cloud;
      default: return Boxes;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "production": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
      case "testing": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "development": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "deprecated": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  const handleExport = async (type: string) => {
    setIsExporting(true);
    try {
        // Redireciona para o endpoint de download do código fonte completo
        window.location.href = `/api/admin/download-source/full`;
        
        // Pequeno delay para feedback visual
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (e) {
        console.error("Erro ao exportar:", e);
        alert("Erro ao iniciar o download.");
    } finally {
        setIsExporting(false);
    }
  };

  const filteredVersions = MOCK_VERSIONS.filter(v => v.platform === selectedPlatform);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Informações do Sistema" 
        description="Controlo de versões e especificações técnicas das aplicações"
        showBackButton={false}
        className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8 px-4 md:px-8"
      >
        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('complete')}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            Exportar Documentação
          </button>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <TabsTrigger value="technical" className="flex items-center gap-2">
            <Layers className="w-4 h-4" /> Especificações Técnicas
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Controlo de Versões
          </TabsTrigger>
        </TabsList>

        {/* TECHNICAL SPECS TAB */}
        <TabsContent value="technical" className="space-y-6">
          <div className="grid gap-6">
            {SYSTEM_SPECS.map((spec) => {
              const Icon = getPlatformIcon(spec.platform);
              return (
                <Card key={spec.platform} className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-3">
                            {spec.name}
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              v{spec.version}
                            </span>
                          </CardTitle>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{spec.description}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Technologies */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                          <Code className="w-4 h-4 text-brand-500" /> Stack Tecnológico
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {spec.technologies.map(tech => (
                            <span key={tech} className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Architecture & Hosting */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Layout className="w-3.5 h-3.5" /> Arquitectura
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{spec.architecture}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Cloud className="w-3.5 h-3.5" /> Alojamento
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{spec.hosting}</p>
                        </div>
                      </div>

                      {/* Security */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-green-500" /> Segurança
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {spec.security.map(sec => (
                            <span key={sec} className="px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/10 text-xs font-medium text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                              {sec}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Performance */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                          <Activity className="w-4 h-4 text-blue-500" /> Performance
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 block mb-1">Carregamento</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{spec.performance.loadTime}</span>
                          </div>
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 block mb-1">Throughput</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{spec.performance.throughput}</span>
                          </div>
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 block mb-1">Concorrentes</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{spec.performance.concurrent}</span>
                          </div>
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 block mb-1">Storage</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{spec.performance.storage}</span>
                          </div>
                        </div>
                      </div>

                      {/* Compliance & Integrations */}
                      <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Conformidade
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {spec.compliance.map(comp => (
                              <span key={comp} className="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> Integrações
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {spec.integrations.map(int => (
                              <span key={int} className="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                                {int}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* VERSIONS TAB */}
        <TabsContent value="versions" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Plataforma:</span>
              <select 
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 w-48"
              >
                <option value="web">Web App</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="backend">Backend API</option>
                <option value="database">Base de Dados</option>
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Versão
            </button>
          </div>

          <div className="space-y-4">
            {filteredVersions.length > 0 ? (
              filteredVersions.map((version) => (
                <Card key={version.id} className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getStatusColor(version.status)}`}>
                          {version.status}
                        </span>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                          v{version.version}
                        </h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Build {version.buildNumber}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(version.releaseDate).toLocaleDateString('pt-PT')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Changelog</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{version.changelog}</p>
                      </div>
                      
                      {version.features.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Novas Funcionalidades
                          </h4>
                          <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            {version.features.map((feature, i) => (
                              <li key={i}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {version.bugfixes.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Correcções
                          </h4>
                          <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            {version.bugfixes.map((fix, i) => (
                              <li key={i}>{fix}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
                        <User className="w-3 h-3" />
                        Lançado por <span className="font-medium text-slate-600 dark:text-slate-300">{version.createdBy}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <GitBranch className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sem versões registadas</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Registe a primeira versão para esta plataforma.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Version Modal (Simplified) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Registar Nova Versão</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Versão</label>
                  <input type="text" className="w-full rounded border p-2 text-sm bg-transparent border-slate-300 dark:border-slate-700" placeholder="e.g. 2.7.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Build</label>
                  <input type="text" className="w-full rounded border p-2 text-sm bg-transparent border-slate-300 dark:border-slate-700" placeholder="e.g. 270" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Changelog</label>
                <textarea className="w-full rounded border p-2 text-sm bg-transparent border-slate-300 dark:border-slate-700" rows={3} placeholder="Descrição das alterações..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700">Cancelar</button>
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemInfo;