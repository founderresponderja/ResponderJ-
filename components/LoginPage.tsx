import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { Theme } from '../App';
import { Logo } from './Logo';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBack: () => void;
  lang: Language;
  theme: Theme;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack, lang, theme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const t = translations[lang].login;
  const nav = translations[lang].nav;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulação de login
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> {nav.back}
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400 p-3">
              <Logo className="w-full h-full" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">{t.welcome}</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8">{t.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.email}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  placeholder="exemplo@empresa.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.password}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-brand-600 focus:ring-brand-500" />
                <span className="text-slate-600 dark:text-slate-400">{t.remember}</span>
              </label>
              <a href="#" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">{t.forgot}</a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-6 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? t.loading : (
                <>
                  {t.submit} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t.noAccount} <a href="#" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">{t.create}</a>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-950 p-4 text-center border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">{t.security}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;