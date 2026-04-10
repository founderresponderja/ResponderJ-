import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { translations, Language } from '../utils/translations';
import { Theme } from '../App';
import { Logo } from './Logo';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBack: () => void;
  onRegister: () => void;
  lang: Language;
  theme: Theme;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack, onRegister, lang, theme }) => {
  const { isSignedIn } = useAuth();
  const t = translations[lang].login;
  const nav = translations[lang].nav;

  React.useEffect(() => {
    if (isSignedIn) {
      onLoginSuccess();
    }
  }, [isSignedIn, onLoginSuccess]);

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

          <div className="flex justify-center">
            <SignIn
              routing="virtual"
              signUpUrl="/register"
              afterSignInUrl="/"
              appearance={{
                elements: {
                  card: 'shadow-none border-0 bg-transparent',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'rounded-lg',
                  formButtonPrimary: 'bg-brand-600 hover:bg-brand-700',
                },
              }}
            />
          </div>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t.noAccount} <button onClick={onRegister} className="text-brand-600 dark:text-brand-400 font-bold hover:underline">{t.create}</button>
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