
import React from 'react';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Info, 
  Users, 
  Zap, 
  Share2, 
  Calendar, 
  MessageSquare, 
  Globe, 
  Smartphone, 
  TrendingUp,
  Award,
  Sparkles,
  Bot,
  Hash
} from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { Theme } from '../App';
import PricingSection from './PricingSection';
import { Logo } from './Logo';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToAbout?: () => void;
  onNavigateToCookies?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  onNavigateToLogin, 
  onNavigateToAbout, 
  onNavigateToCookies, 
  onNavigateToPrivacy,
  onNavigateToTerms,
  lang, 
  setLang, 
  theme, 
  toggleTheme 
}) => {
  const t = translations[lang].landing;
  const tn = translations[lang].nav;

  // SEO Keywords / Hashtags for the "Tag Cloud" section
  const seoTags = [
    "#GestãoDeReviews", "#InteligênciaArtificial", "#GoogleMyBusiness", "#SEOLocal", 
    "#MarketingDigital", "#Automação", "#RestaurantesPortugal", "#Hotelaria", 
    "#AtendimentoAoCliente", "#ReputaçãoOnline", "#ResponderReviews", "#TripAdvisor", 
    "#BookingCom", "#TheFork", "#ReviewManagement", "#AIGenerator", "#ChatGPTBusiness", 
    "#GeminiAI", "#PMEPortugal", "#DigitalTransformation", "#CustomerExperience", 
    "#SocialMediaManager", "#FeedbackClientes", "#SoftwareSaaS"
  ];

  const features = [
    {
      icon: Bot,
      title: "Inteligência Artificial Avançada",
      description: "Sistema baseado no Google Gemini 2.5 para gerar respostas profissionais, empáticas e contextuais que o Google adora.",
      details: ["Análise de sentimento em tempo real", "Detecção automática de idioma", "Otimização para SEO Local", "Aprendizagem contínua"],
      badge: "IA Gemini 2.5"
    },
    {
      icon: Share2,
      title: "Integração Multi-Plataforma",
      description: "Conecte-se automaticamente com todas as principais redes sociais e plataformas de avaliação num único dashboard.",
      details: ["Google My Business e Maps", "Facebook e Instagram", "TripAdvisor e Booking.com", "TheFork e Zomato"],
      badge: "15+ Plataformas"
    },
    {
      icon: BarChart3,
      title: "Analytics e Relatórios SEO",
      description: "Dashboard completo com métricas detalhadas e insights de performance para melhorar o seu ranking.",
      details: ["Métricas de engajamento", "Relatórios automáticos por email", "Tracking de Palavras-chave", "ROI de Reputação"],
      badge: "Tempo Real"
    },
    {
      icon: Calendar,
      title: "Calendário de Conteúdo",
      description: "Planeie e organize o seu conteúdo com ferramentas visuais intuitivas para consistência máxima.",
      details: ["Vista mensal e semanal", "Agendamento de posts", "Gestão centralizada", "Histórico de publicações"],
      badge: "Produtividade"
    },
    {
      icon: Users,
      title: "Gestão de Leads & CRM",
      description: "Transforme reviews em oportunidades de negócio. Capture, organize e converta leads automaticamente.",
      details: ["CRM integrado", "Detecção de oportunidades", "Histórico de interações", "Funil de vendas"],
      badge: "CRM Integrado"
    },
    {
      icon: ShieldCheck,
      title: "Segurança Empresarial",
      description: "Certificação de segurança com compliance total GDPR e legislação portuguesa.",
      details: ["Encriptação AES-256", "Compliance GDPR/RGPD", "Backups automáticos", "Auditoria de segurança"],
      badge: "Certificado"
    }
  ];

  const steps = [
    { step: "1", title: "Conectar Plataformas", desc: "Sincronize Google, Facebook e TripAdvisor em segundos.", icon: Share2 },
    { step: "2", title: "Configurar Tom da Marca", desc: "Defina a personalidade da sua IA para respostas autênticas.", icon: SettingsIcon },
    { step: "3", title: "Ativar Automação", desc: "A IA deteta reviews e sugere as melhores respostas instantaneamente.", icon: Zap },
    { step: "4", title: "Dominar o Ranking", desc: "Veja a sua reputação e SEO local subirem no dashboard.", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white transition-colors duration-300 overflow-x-hidden animate-fade-in">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <Logo className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-xl font-bold text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600">Responder Já</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Controls */}
            <div className="hidden md:flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4 mr-2">
              <button 
                  onClick={toggleTheme}
                  className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Alternar Tema"
              >
                  {theme === 'light' ? <Moon size={18}/> : <Sun size={18} />}
              </button>
              <div className="flex gap-1">
                  {(['pt', 'en', 'es'] as Language[]).map((l) => (
                      <button
                          key={l}
                          onClick={() => setLang(l)}
                          className={`text-xs font-bold px-2 py-1 rounded transition-colors ${lang === l ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                      >
                          {l.toUpperCase()}
                      </button>
                  ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onNavigateToLogin}
                className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-medium text-sm transition-colors"
              >
                {tn.login}
              </button>
              <button 
                onClick={onNavigateToLogin}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                {tn.startFree} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-brand-500/20 to-purple-500/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
        
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium mb-8 animate-fade-in-up hover:border-brand-300 transition-colors shadow-sm">
            <Sparkles size={14} className="text-brand-500" />
            <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent font-bold">Novo:</span> Algoritmo SEO Local 2025 Ativo
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            {t.heroTitle} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-600 to-purple-600">{t.heroHighlight}</span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            {t.heroDesc}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <button 
              onClick={onNavigateToLogin}
              className="group flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-brand-500/25 hover:-translate-y-1 active:translate-y-0"
            >
              {t.ctaPrimary}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onNavigateToAbout}
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:-translate-y-1 active:translate-y-0 shadow-sm"
            >
              <Info size={20} />
              Saber Mais
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-slate-200 dark:border-slate-800 pt-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            {[
                { val: "15h+", label: "Poupadas / semana" },
                { val: "24/7", label: "Resposta Automática" },
                { val: "15+", label: "Plataformas Integradas" },
                { val: "4.9/5", label: "Rating Médio Clientes" },
            ].map((stat, i) => (
                <div key={i} className="text-center group cursor-default">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">{stat.val}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Automação Inteligente</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              4 passos simples para automatizar a sua comunicação digital e dominar o SEO local.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className="w-16 h-16 mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-10 group-hover:shadow-md">
                  <item.icon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-800">
                    {item.step}
                  </div>
                </div>
                {i !== steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 -z-0"></div>
                )}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-sm font-medium mb-4">
              <Zap size={14} /> Funcionalidades de SEO
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Tudo o que precisa para crescer</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Uma suite completa de ferramentas para gerir a sua reputação online e subir nos motores de busca.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 relative overflow-hidden">
                {/* Decorative blob on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-bl-full translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500"></div>

                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <feature.icon size={24} />
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                    {feature.badge}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-brand-600 transition-colors relative z-10">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm relative z-10">
                  {feature.description}
                </p>
                
                <ul className="space-y-3 relative z-10">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Benefícios Reais de SEO</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">Resultados comprovados pelos nossos clientes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Visibilidade Google Maps</h3>
              <p className="text-sm font-bold text-green-600 mb-2">+40% Impressões</p>
              <p className="text-slate-500 dark:text-slate-400">Negócios que respondem aparecem mais nas pesquisas locais.</p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tempo Poupado</h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">15h/sem</p>
              <p className="text-slate-500 dark:text-slate-400">Automação inteligente liberta a sua equipa para tarefas estratégicas.</p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                <Award size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Fidelização</h3>
              <p className="text-sm font-bold text-purple-600 mb-2">Melhoria Significativa</p>
              <p className="text-slate-500 dark:text-slate-400">Clientes sentem-se ouvidos com respostas rápidas e profissionais.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div className="bg-white dark:bg-slate-950">
         <PricingSection lang={lang} onSelectPlan={onNavigateToLogin} />
      </div>
      
      {/* SEO Topic Cloud Section */}
      <section className="py-16 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
           <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-slate-400 mb-2">
                 <Hash size={16} />
                 <span className="text-sm font-semibold uppercase tracking-wider">Tópicos Populares</span>
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Descubra as tendências de gestão de reputação</h3>
           </div>
           
           <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {seoTags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-800 transition-all cursor-default select-none"
                >
                  {tag}
                </span>
              ))}
           </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-24 bg-gradient-to-br from-brand-900 via-brand-800 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 animate-pulse-slow"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Pronto para revolucionar a sua comunicação?</h2>
          <p className="text-xl text-brand-100 mb-10 max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já transformaram a sua presença digital com o Responder Já.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onNavigateToLogin}
              className="bg-white text-brand-900 hover:bg-brand-50 px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={20} />
              Começar Teste Gratuito
            </button>
            <button 
              onClick={onNavigateToAbout}
              className="bg-brand-800/50 backdrop-blur-sm border border-brand-700 text-white hover:bg-brand-800 px-8 py-4 rounded-xl text-lg font-bold transition-all hover:-translate-y-1"
            >
              Ver Planos e Preços
            </button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-brand-200 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} /> 7 dias grátis
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} /> Sem cartão de crédito
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} /> Suporte 24/7
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 text-slate-500" />
            <span className="text-lg font-bold text-slate-200">Responder Já</span>
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} Amplia Solutions. Todos os direitos reservados.
          </div>
          <div className="flex gap-6 text-sm">
             {onNavigateToAbout && (
                <button onClick={onNavigateToAbout} className="hover:text-white transition-colors">
                    Sobre Nós
                </button>
             )}
             {onNavigateToPrivacy ? (
               <button onClick={onNavigateToPrivacy} className="hover:text-white transition-colors">
                 Privacidade
               </button>
             ) : (
               <button className="hover:text-white transition-colors">Privacidade</button>
             )}
             {onNavigateToTerms ? (
               <button onClick={onNavigateToTerms} className="hover:text-white transition-colors">
                 Termos
               </button>
             ) : (
               <button className="hover:text-white transition-colors">Termos</button>
             )}
             {onNavigateToCookies && (
               <button onClick={onNavigateToCookies} className="hover:text-white transition-colors">
                 Cookies
               </button>
             )}
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper Icon for steps
const SettingsIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default LandingPage;
