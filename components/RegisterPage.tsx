
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SignUp, useAuth } from '@clerk/clerk-react';
import { Language } from '../utils/translations';
import { Theme } from '../App';
import { Logo } from './Logo';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onLoginClick: () => void;
  onBack: () => void;
  lang: Language;
  theme: Theme;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onLoginClick, onBack, lang, theme }) => {
  const { isSignedIn } = useAuth();

  React.useEffect(() => {
    if (isSignedIn) {
      onRegisterSuccess();
    }
  }, [isSignedIn, onRegisterSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400 p-3">
              <Logo className="w-full h-full" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Criar Conta</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8">Junte-se ao Responder Já</p>

          <div className="flex justify-center">
            <SignUp
              routing="virtual"
              signInUrl="/login"
              afterSignUpUrl="/"
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
            Já tem conta? <button onClick={onLoginClick} className="text-brand-600 dark:text-brand-400 font-bold hover:underline">Entrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
    