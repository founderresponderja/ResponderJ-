// RJ-7.1: os dados pessoais do titular (RGPD): exportar tudo e apagar a conta.
import React, { useState } from 'react';
import { Download, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { buildAuthHeaders } from '../utils/api';
import { notifyError, notifySuccess } from '../utils/notify';

const PrivacyDataPage: React.FC = () => {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const accountEmail = user?.primaryEmailAddress?.emailAddress || '';

  const handleExport = async (format: 'html' | 'json') => {
    setExporting(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch(`/api/account/export${format === 'html' ? '?format=html' : ''}`, { headers });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Falha na exportação');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `responder-ja-dados-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      notifySuccess('Os seus dados foram descarregados.');
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível exportar os dados.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Não foi possível apagar a conta.');
      notifySuccess('A sua conta e os seus dados foram apagados.');
      await signOut().catch(() => {});
      window.location.href = '/';
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível apagar a conta.');
      setDeleting(false);
    }
  };

  const canDelete = confirmEmail.trim().toLowerCase() === accountEmail.toLowerCase() && accountEmail.length > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-brand-600" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Privacidade e dados</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descarregar os meus dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Um ficheiro com todos os dados da sua conta: perfil, negócios, reviews, respostas, regras, créditos e equipa.
            Por segurança, não inclui os acessos às plataformas ligadas.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('html')}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Descarregar (fácil de ler)
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download size={16} />
              Descarregar (JSON, para outros serviços)
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apagar a minha conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p>Isto apaga de forma definitiva a conta e todos os dados associados. Não é possível desfazer.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A subscrição é cancelada de imediato, sem mais cobranças. As faturas já emitidas ficam com o Stripe, que é obrigado por lei a guardá-las.</li>
              <li>As respostas já publicadas no Google ou no Facebook continuam lá; pode apagá-las antes, na Caixa de entrada.</li>
              <li>Se for dono de uma agência, a agência e o acesso dos membros da equipa também são apagados.</li>
            </ul>
          </div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Para confirmar, escreva o email da conta ({accountEmail || '...'}):
          </label>
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm"
            autoComplete="off"
          />
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Apagar definitivamente
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyDataPage;
