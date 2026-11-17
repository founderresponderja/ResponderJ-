import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Loader2, CheckCircle, AlertTriangle, ArrowRight, Mail, Building } from 'lucide-react';
import { Theme } from '../App';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { buildAuthHeaders } from '../utils/api';

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
  const [view, setView] = useState<'loading' | 'details'>('loading');
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignUp, openSignIn } = useClerk();
  // Clerk brings the user back here after sign-up / sign-in, so the invite can be accepted.
  const returnUrl = typeof window !== 'undefined' ? window.location.href : '/';

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    validateInvite();
  }, [token, isLoaded, isSignedIn]);

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
      
      // If the user is signed in with Clerk, accept automatically when the email matches.
      if (!isSignedIn) return;
      const userRes = await fetch('/api/auth/user', { headers: await buildAuthHeaders({ getToken }) });
      if (userRes.ok) {
        const user = await userRes.json();
        if (String(user.email || '').toLowerCase() === String(data.email || '').toLowerCase()) {
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
      const headers = await buildAuthHeaders({ getToken });
      const response = await fetch(`/api/invitations/${token}/accept`, { method: 'POST', headers });
      if (!response.ok) throw new Error('Falha ao aceitar convite');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptClick = () => {
    if (isSignedIn) {
      acceptInvite();
      return;
    }
    // Accounts are created only through Clerk (RJ-1.2); the invite is accepted on return.
    openSignUp({ forceRedirectUrl: returnUrl, signInForceRedirectUrl: returnUrl });
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
                onClick={handleAcceptClick}
                disabled={isSubmitting}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                Aceitar Convite <ArrowRight size={18} />
              </button>
              
              <div className="text-center text-sm">
                {!isSignedIn && (
                  <button
                    onClick={() => openSignIn({ forceRedirectUrl: returnUrl, signUpForceRedirectUrl: returnUrl })}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Já tenho conta, fazer login
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InvitePage;