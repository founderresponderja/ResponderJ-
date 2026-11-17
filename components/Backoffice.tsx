import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Activity, LogOut, ShieldCheck, Users } from 'lucide-react';

type Role = 'super_admin' | 'operator' | 'customer';

interface Me { id: number; email: string; name: string; role: Role }
interface Overview {
  customers: number;
  active7d: number;
  new30d: number;
  withStripe: number;
  operators: number;
  byPlan: { plan: string; count: number }[];
}
interface AuditRow { id: number; action: string; createdAt: string; actorEmail: string | null; targetUserId: number | null }

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super administrador',
  operator: 'Operador',
  customer: 'Cliente',
};

const ACTION_LABEL: Record<string, string> = {
  backoffice_open: 'Entrou no backoffice',
};

interface BackofficeProps {
  onLogout: () => void;
}

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
  </div>
);

const Backoffice: React.FC<BackofficeProps> = ({ onLogout }) => {
  const { getToken } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async <T,>(path: string): Promise<T> => {
    const token = await getToken();
    const res = await fetch(`/api/backoffice${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }, [getToken]);

  useEffect(() => {
    (async () => {
      try {
        const meData = await api<Me>('/me');
        setMe(meData);
        const [ov, au] = await Promise.all([api<Overview>('/overview'), api<AuditRow[]>('/audit')]);
        setOverview(ov);
        setAudit(au);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar o backoffice');
      }
    })();
  }, [api]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <div>
              <div className="font-semibold">Responder Já · Backoffice</div>
              {me && <div className="text-xs text-slate-500">{me.email} · {ROLE_LABEL[me.role]}</div>}
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" /> Clientes</h2>
          {overview ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Clientes" value={overview.customers} />
                <Stat label="Ativos (7 dias)" value={overview.active7d} />
                <Stat label="Novos (30 dias)" value={overview.new30d} />
                <Stat label="Com subscrição Stripe" value={overview.withStripe} />
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 font-medium">Por plano</div>
                <div className="flex flex-wrap gap-3">
                  {overview.byPlan.map((p) => (
                    <span key={p.plan} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{p.plan}: <strong>{p.count}</strong></span>
                  ))}
                  {overview.byPlan.length === 0 && <span className="text-slate-500">Sem clientes.</span>}
                </div>
              </div>
            </>
          ) : !error && <div className="text-sm text-slate-500">A carregar…</div>}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Activity className="h-5 w-5" /> Registo de ações</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr><th className="px-4 py-2">Quando</th><th className="px-4 py-2">Quem</th><th className="px-4 py-2">Ação</th></tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString('pt-PT')}</td>
                    <td className="px-4 py-2">{row.actorEmail ?? '—'}</td>
                    <td className="px-4 py-2">{ACTION_LABEL[row.action] ?? row.action}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">Ainda sem ações registadas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Backoffice;
