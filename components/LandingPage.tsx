import React from 'react';
import { BarChart3, Clock, CheckCircle2, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { Theme } from '../App';
import PricingSection from './PricingSection';
import { Logo } from './Logo';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin, lang, setLang, theme, toggleTheme }) => {
  const t = translations[lang].landing;
  const tn = translations[lang].nav;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white transition-colors duration-300">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">Responder Já</span>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          
          {/* Controls */}
          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4 mr-2">
            <button 
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                {theme === 'light' ? <Moon size={18}/> : <Sun size={18} />}
            </button>
            <div className="flex gap-1">
                {(['pt', 'en', 'es'] as Language[]).map((l) => (
                    <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={`text-xs font-bold px-2 py-1 rounded ${lang === l ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    >
                        {l.toUpperCase()}
                    </button>
                ))}
            </div>
          </div>

          <button 
            onClick={onNavigateToLogin}
            className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-medium text-sm transition-colors"
          >
            {tn.login}
          </button>
          <button 
            onClick={onNavigateToLogin}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg"
          >
            {tn.startFree}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-50 dark:bg-brand-900/20 rounded-full blur-3xl opacity-50 -z-10"></div>
        
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Logo size={12} className="w-3 h-3" />
            {t.poweredBy}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            {t.heroTitle} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">{t.heroHighlight}</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onNavigateToLogin}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-500/25 group"
            >
              {t.ctaPrimary}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              {t.ctaSecondary}
            </button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 dark:text-slate-600 grayscale opacity-70">
            <span className="font-bold text-xl flex items-center gap-1"><ShieldCheck size={18} /> Google</span>
            <span className="font-bold text-xl">TheFork</span>
            <span className="font-bold text-xl">Booking.com</span>
            <span className="font-bold text-xl">TripAdvisor</span>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div className="bg-slate-50 dark:bg-slate-950/50">
         <PricingSection lang={lang} onSelectPlan={onNavigateToLogin} />
      </div>

      {/* Features Grid */}
      <section className="bg-white dark:bg-slate-900 py-24 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t.whyTitle}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              {t.whyDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">{t.features.time.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.features.time.desc}
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">{t.features.seo.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.features.seo.desc}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">{t.features.insights.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.features.insights.desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-black text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 grayscale opacity-80" />
            <span className="text-lg font-bold text-white">Responder Já</span>
          </div>
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} Amplia Solutions. {t.footer}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;