import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Loader2, CheckCircle, AlertTriangle, ArrowRight, User, Mail, Lock, Building } from 'lucide-react';
import { Theme } from '../App';

interface InvitePageProps {
  token: string;
  onNavigateToLogin: () => void;
  onSuccess: () => void;
  theme: Theme;
}

interface InviteDetails {
  agencyName: string;
  inviterName: string;
  email: string;
  role: string;
  expiresAt: string;
}

const InvitePage: React.FC<InvitePageProps> = ({ token, onNavigateToLogin, onSuccess, theme }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [view, setView] = useState<'loading' | 'details' | 'register' | 'login'>('loading');
  
  // Register Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Convite inválido');
      }
      const data = await response.json();
      setInvite(data);
      setView('details');
      
      // Check if user is already logged in
      const userRes = await fetch('/api/auth/user');
      if (userRes.ok) {
        const user = await userRes.json();
        if (user.email === data.email) {
          // Auto accept if email matches
          acceptInvite();
        } else {
          setError(`Está autenticado como ${user.email}, mas este convite é para ${data.email}.`);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setView('details'); // Show error state
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvite = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao aceitar convite');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("As passwords não coincidem");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invitations/${token}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          email: invite?.email // Email comes from invite
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao criar conta');
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">A validar convite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Convite Inválido</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <button onClick={onNavigateToLogin} className="text-brand-600 font-medium hover:underline">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <Logo size={48} />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Convite para Agência</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {invite?.inviterName} convidou-o para se juntar à agência <strong>{invite?.agencyName}</strong>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {view === 'details' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{invite?.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{invite?.role === 'admin' ? 'Administrador' : 'Membro da Equipa'}</span>
                </div>
              </div>

              <button
                onClick={() => setView('register')}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                Aceitar Convite <ArrowRight size={18} />
              </button>
              
              <div className="text-center text-sm">
                <button onClick={onNavigateToLogin} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  Já tenho conta, fazer login
                </button>
              </div>
            </div>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apelido</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={invite?.email}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Password</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-6 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" /> Criando conta...
                  </>
                ) : (
                  "Criar Conta e Aceitar"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitePage;