import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Activity, BarChart3, Bot, Bug, Crown, HeartPulse, Eye, LogOut, RefreshCw, RotateCcw, Search, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import { startViewAs } from '../utils/viewAs';
import { IncidentsTab, IncidentStatsTab } from './BackofficeIncidents';

type Role = 'super_admin' | 'operator' | 'customer';
type Tab = 'overview' | 'customers' | 'sandbox' | 'ai' | 'sync' | 'audit' | 'operators' | 'incidents' | 'incident-stats' | 'health';

interface Me { id: number; email: string; name: string; role: Role }
interface Overview {
  customers: number;
  active7d: number;
  new30d: number;
  withStripe: number;
  operators: number;
  byPlan: { plan: string; count: number }[];
}
interface AuditRow { id: number; action: string; createdAt: string; actorEmail: string | null; targetUserId: number | null; details: any }
interface CustomerRow {
  id: number; email: string; firstName: string; lastName: string; companyName: string | null;
  plan: string; credits: number; creditsUsedThisPeriod: number; isActive: boolean; hasStripe: boolean;
  currentPeriodEnd: string | null; createdAt: string; lastLoginAt: string | null;
  establishments: number; connections: number; generations30d: number;
}
interface CustomerDetail {
  id: number; email: string; name: string; companyName: string | null; plan: string; credits: number;
  creditsUsedThisPeriod: number; isActive: boolean; stripeCustomerId: string | null; stripeSubscriptionId: string | null;
  currentPeriodStart: string | null; currentPeriodEnd: string | null; createdAt: string; lastLoginAt: string | null;
  establishments: { id: number; name: string; createdAt: string }[];
  connections: { id: number; platform: string; status: string; establishmentId: number | null; lastSyncAt: string | null; lastSync: any }[];
  creditTransactions: { id: number; type: string; amount: number; description: string | null; createdAt: string }[];
}
interface AiUsage {
  daily: { day: string; generations: number }[];
  top: { id: number; email: string; generations: number; credits: number }[];
  byModel: { model: string; generations: number }[];
  costPerGenerationEur: number | null;
}
interface SyncRow {
  id: number; platform: string; status: string; lastSyncAt: string | null; tokenExpiresAt: string | null;
  userId: number | null; email: string | null; establishmentId: number | null;
  lastOk: boolean | null; lastError: string | null; lastImported: number | null;
}

const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super administrador', operator: 'Operador', customer: 'Cliente' };
const PLAN_LABEL: Record<string, string> = { trial: 'Experimental', starter: 'Starter', pro: 'Pro', agency: 'Agência' };
const ACTION_LABEL: Record<string, string> = {
  backoffice_open: 'Entrou no backoffice',
  customer_view: 'Abriu a ficha de um cliente',
  customer_credits: 'Ajustou créditos',
  customer_plan: 'Mudou o plano',
  customer_suspend: 'Suspendeu um cliente',
  customer_reactivate: 'Reativou um cliente',
  view_as_start: 'Entrou em modo "ver como cliente"',
  sandbox_reset: 'Repôs os dados de uma sandbox',
  operator_add: 'Adicionou um operador',
  operator_remove: 'Removeu um operador',
  transfer_start: 'Iniciou a transferência de super administrador',
  transfer_confirm_from: 'Confirmou o código (super administrador)',
  transfer_code_wrong: 'Código de transferência errado',
  transfer_done: 'Aceitou a função de super administrador',
  transfer_cancel: 'Cancelou a transferência',
  cron_sync: 'Agendamento diário de sincronização',
  incident_resolved: 'Deu um erro reportado como resolvido',
  app_error_resolved: 'Marcou um erro técnico como visto',
  account_export: 'Cliente descarregou os seus dados',
  account_deleted: 'Cliente apagou a conta',
};

const fmtDate = (v: string | null | undefined, withTime = false) =>
  v ? (withTime ? new Date(v).toLocaleString('pt-PT') : new Date(v).toLocaleDateString('pt-PT')) : '—';

const card = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const btn = 'rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50';

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className={`${card} p-4`}>
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
  </div>
);

interface BackofficeProps {
  onLogout: () => void;
}

const Backoffice: React.FC<BackofficeProps> = ({ onLogout }) => {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    const token = await getToken();
    const res = await fetch(`/api/backoffice${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.message || `Erro ${res.status}`);
    return data as T;
  }, [getToken]);

  useEffect(() => {
    api<Me>('/me').then(setMe).catch((e) => setError(e.message));
  }, [api]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão geral', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'customers', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'sandbox', label: 'Ver como cliente', icon: <Eye className="h-4 w-4" /> },
    { id: 'ai', label: 'Uso da IA', icon: <Bot className="h-4 w-4" /> },
    { id: 'sync', label: 'Sincronizações', icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'incidents', label: 'Erros', icon: <Bug className="h-4 w-4" /> },
    { id: 'health', label: 'Saúde técnica', icon: <HeartPulse className="h-4 w-4" /> },
    { id: 'audit', label: 'Registo de ações', icon: <Activity className="h-4 w-4" /> },
    ...(me?.role === 'super_admin' ? [
      { id: 'incident-stats' as Tab, label: 'Indicadores de erros', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'operators' as Tab, label: 'Operadores', icon: <UserCog className="h-4 w-4" /> },
    ] : []),
  ];

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
          <button onClick={onLogout} className={`${btn} flex items-center gap-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm whitespace-nowrap ${tab === t.id ? 'border-brand-600 font-semibold text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {me && me.role !== 'super_admin' && <IncomingTransfer api={api} />}
        {tab === 'overview' && <OverviewTab api={api} />}
        {tab === 'customers' && <CustomersTab api={api} />}
        {tab === 'sandbox' && <SandboxTab api={api} />}
        {tab === 'ai' && <AiTab api={api} />}
        {tab === 'sync' && <SyncTab api={api} />}
        {tab === 'incidents' && <IncidentsTab api={api} />}
        {tab === 'health' && <HealthTab api={api} />}
        {tab === 'incident-stats' && me?.role === 'super_admin' && <IncidentStatsTab api={api} />}
        {tab === 'audit' && <AuditTab api={api} />}
        {tab === 'operators' && me?.role === 'super_admin' && <OperatorsTab api={api} meId={me.id} />}
      </main>
    </div>
  );
};

type Api = <T>(path: string, body?: unknown) => Promise<T>;

function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    loader().then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}

const Loading: React.FC<{ error: string | null }> = ({ error }) =>
  error ? <div className="text-sm text-red-600">{error}</div> : <div className="text-sm text-slate-500">A carregar…</div>;

const OverviewTab = ({ api }: { api: Api }) => {
  const { data, error } = useLoad(() => api<Overview>('/overview'), []);
  if (!data) return <Loading error={error} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Clientes" value={data.customers} />
        <Stat label="Ativos (7 dias)" value={data.active7d} />
        <Stat label="Novos (30 dias)" value={data.new30d} />
        <Stat label="Com subscrição Stripe" value={data.withStripe} />
      </div>
      <div className={`${card} p-4 text-sm`}>
        <div className="mb-2 font-medium">Clientes por plano</div>
        <div className="flex flex-wrap gap-3">
          {data.byPlan.map((p) => (
            <span key={p.plan} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{PLAN_LABEL[p.plan] ?? p.plan}: <strong>{p.count}</strong></span>
          ))}
          {data.byPlan.length === 0 && <span className="text-slate-500">Sem clientes.</span>}
        </div>
      </div>
      <p className="text-xs text-slate-500">Operadores na plataforma: {data.operators}. Os números de clientes não incluem operadores.</p>
    </div>
  );
};

const CustomersTab = ({ api }: { api: Api }) => {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, error, reload } = useLoad(
    () => api<CustomerRow[]>(`/customers?q=${encodeURIComponent(query)}&plan=${plan}`),
    [query, plan],
  );
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar por email, nome ou empresa"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="">Todos os planos</option>
          {Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>Procurar</button>
      </form>

      {!data ? <Loading error={error} /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Plano</th><th className="px-3 py-2">Créditos</th>
                <th className="px-3 py-2">Gerações 30d</th><th className="px-3 py-2">Ligações</th><th className="px-3 py-2">Última atividade</th><th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2"><div className="font-medium">{c.companyName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</div><div className="text-xs text-slate-500">{c.email}</div></td>
                  <td className="px-3 py-2">{PLAN_LABEL[c.plan] ?? c.plan}{c.hasStripe && <span className="ml-1 text-xs text-emerald-600">· Stripe</span>}</td>
                  <td className="px-3 py-2">{c.credits}</td>
                  <td className="px-3 py-2">{c.generations30d}</td>
                  <td className="px-3 py-2">{c.connections}</td>
                  <td className="px-3 py-2">{fmtDate(c.lastLoginAt)}</td>
                  <td className="px-3 py-2">{c.isActive ? 'Ativo' : <span className="text-red-600">Suspenso</span>}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {openId !== null && <CustomerDrawer api={api} id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </div>
  );
};

const CustomerDrawer = ({ api, id, onClose, onChanged }: { api: Api; id: number; onClose: () => void; onChanged: () => void }) => {
  const { data, error, reload } = useLoad(() => api<CustomerDetail>(`/customers/${id}`), [id]);
  const [delta, setDelta] = useState('');
  const [plan, setPlan] = useState('starter');
  const [until, setUntil] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (path: string, body: Record<string, unknown>, okText: string) => {
    setBusy(true); setMsg(null);
    try {
      await api(path, { ...body, reason });
      setMsg({ ok: true, text: okText });
      setReason(''); setDelta('');
      reload(); onChanged();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{data?.companyName || data?.name || 'Cliente'}</h3>
            <div className="text-sm text-slate-500">{data?.email}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        {!data ? <Loading error={error} /> : (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-500">Plano</div>{PLAN_LABEL[data.plan] ?? data.plan}</div>
              <div><div className="text-xs text-slate-500">Válido até</div>{fmtDate(data.currentPeriodEnd)}</div>
              <div><div className="text-xs text-slate-500">Créditos</div>{data.credits} (usados no período: {data.creditsUsedThisPeriod})</div>
              <div><div className="text-xs text-slate-500">Stripe</div>{data.stripeSubscriptionId ? 'Subscrição ativa' : data.stripeCustomerId ? 'Cliente sem subscrição' : 'Sem Stripe'}</div>
              <div><div className="text-xs text-slate-500">Registo</div>{fmtDate(data.createdAt)}</div>
              <div><div className="text-xs text-slate-500">Última atividade</div>{fmtDate(data.lastLoginAt, true)}</div>
            </div>

            <div>
              <div className="mb-1 font-medium">Estabelecimentos ({data.establishments.length})</div>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300">
                {data.establishments.map((e) => <li key={e.id}>{e.name}</li>)}
                {data.establishments.length === 0 && <li className="list-none -ml-5 text-slate-500">Nenhum.</li>}
              </ul>
            </div>

            <div>
              <div className="mb-1 font-medium">Ligações a plataformas</div>
              {data.connections.length === 0 ? <div className="text-slate-500">Nenhuma.</div> : (
                <ul className="space-y-1">
                  {data.connections.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span>{c.platform} · {c.status}</span>
                      <span className={c.lastSync?.ok === false ? 'text-red-600' : 'text-slate-500'}>
                        {c.lastSyncAt ? `sincronizado ${fmtDate(c.lastSyncAt, true)}` : 'nunca sincronizado'}{c.lastSync?.ok === false ? ` · erro: ${c.lastSync.error}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="font-medium">Ações de suporte</div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (obrigatório, fica no registo)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
              <div className="flex gap-2">
                <input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Créditos (+10 ou -5)" inputMode="numeric"
                  className="w-40 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
                <button disabled={busy || !delta} onClick={() => run(`/customers/${id}/credits`, { delta: Number(delta) }, 'Créditos ajustados.')}
                  className={`${btn} bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700`}>Ajustar créditos</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  {Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
                <button disabled={busy} onClick={() => run(`/customers/${id}/plan`, { plan, until }, 'Plano alterado.')}
                  className={`${btn} bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700`}>Mudar plano</button>
              </div>
              <p className="text-xs text-slate-500">Sem subscrição Stripe, o plano vale até à data indicada. Com subscrição Stripe, a cobrança não muda: altera-a no painel do Stripe.</p>
              <button disabled={busy} onClick={() => run(`/customers/${id}/active`, { active: !data.isActive }, data.isActive ? 'Cliente suspenso.' : 'Cliente reativado.')}
                className={`${btn} ${data.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
                {data.isActive ? 'Suspender acesso' : 'Reativar acesso'}
              </button>
              {msg && <div className={msg.ok ? 'text-emerald-700' : 'text-red-600'}>{msg.text}</div>}
            </div>

            <div>
              <div className="mb-1 font-medium">Últimos movimentos de créditos</div>
              {data.creditTransactions.length === 0 ? <div className="text-slate-500">Nenhum.</div> : (
                <ul className="space-y-1">
                  {data.creditTransactions.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2">
                      <span className="truncate">{t.description || t.type}</span>
                      <span className={t.amount < 0 ? 'text-red-600' : 'text-emerald-700'}>{t.amount > 0 ? `+${t.amount}` : t.amount} · {fmtDate(t.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SandboxList {
  sandboxes: { key: string; label: string; description: string; plan: string; userId: number | null; establishments: number; reviews: number }[];
  aiToday: number;
  aiLimit: number;
}

const SandboxTab = ({ api }: { api: Api }) => {
  const { data, error, reload } = useLoad(() => api<SandboxList>('/sandboxes'), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!data) return <Loading error={error} />;

  const enter = async (key: string) => {
    setBusy(key); setMsg(null);
    try {
      const r = await api<{ userId: number; label: string }>(`/sandboxes/${key}/enter`, {});
      startViewAs({ userId: r.userId, label: r.label, key });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
      setBusy(null);
    }
  };
  const reset = async (key: string, label: string) => {
    if (!window.confirm(`Repor os dados da sandbox "${label}"? Tudo o que fizeste nela é apagado.`)) return;
    setBusy(key); setMsg(null);
    try {
      await api(`/sandboxes/${key}/reset`, {});
      setMsg({ ok: true, text: `Sandbox "${label}" reposta.` });
      reload();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Abre a aplicação de cliente com dados simulados, como cada tipo de cliente a vê. Pagamentos, publicações nas plataformas,
        ligações reais e envio de convites ficam desligados. Gerações de IA hoje: <strong>{data.aiToday}</strong> de {data.aiLimit}.
      </p>
      {msg && <div className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</div>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.sandboxes.map((s) => (
          <div key={s.key} className={`${card} flex flex-col p-4`}>
            <div className="font-semibold">{s.label}</div>
            <div className="mt-1 flex-1 text-sm text-slate-500">{s.description}</div>
            <div className="mt-2 text-xs text-slate-500">
              {s.userId === null ? 'Conta em falta' : s.establishments === 0 && s.key !== 'membro' ? 'Sem dados (criados ao entrar)' : `${s.establishments} estabelecimento(s) · ${s.reviews} reviews`}
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={busy !== null || s.userId === null} onClick={() => enter(s.key)}
                className={`${btn} flex items-center gap-1 bg-brand-600 text-white hover:bg-brand-700`}><Eye className="h-4 w-4" />Ver como</button>
              <button disabled={busy !== null || s.userId === null} onClick={() => reset(s.key, s.label)}
                className={`${btn} flex items-center gap-1 border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RotateCcw className="h-4 w-4" />Repor dados</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface OperatorRow {
  id: number; email: string; name: string; role: Role; isActive: boolean; linked: boolean;
  createdAt: string; lastLoginAt: string | null; lastActionAt: string | null;
  stats30d: { sessions: number; customerViews: number; supportActions: number; viewAs: number; sandboxResets: number; total: number };
}
interface OperatorsData {
  mailer: boolean;
  transfer: { id: number; fromUserId: number; toUserId: number; status: string; expiresAt: string } | null;
  operators: OperatorRow[];
}

const OperatorsTab = ({ api, meId }: { api: Api; meId: number }) => {
  const { data, error, reload } = useLoad(() => api<OperatorsData>('/operators'), []);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [toId, setToId] = useState<number | ''>('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [code, setCode] = useState('');
  const [tmsg, setTmsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!data) return <Loading error={error} />;
  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); reload(); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); reload(); }
    finally { setBusy(false); }
  };
  // Mensagens da transferência aparecem junto ao formulário da transferência.
  const runT = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true); setTmsg(null);
    try { await fn(); setTmsg({ ok: true, text: okText }); reload(); }
    catch (e: any) { setTmsg({ ok: false, text: e.message }); reload(); }
    finally { setBusy(false); }
  };
  const candidates = data.operators.filter((o) => o.role === 'operator' && o.isActive && o.linked);
  const t = data.transfer;
  const target = t ? data.operators.find((o) => o.id === t.toUserId) : null;

  return (
    <div className="space-y-6">
      {!data.mailer && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">O envio de email não está configurado (RESEND_API_KEY / EMAIL_FROM). A transferência fica indisponível.</div>}
      {msg && <div className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</div>}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2">Operador</th><th className="px-3 py-2">Papel</th><th className="px-3 py-2">Último acesso</th>
              <th className="px-3 py-2">Sessões 30d</th><th className="px-3 py-2">Fichas vistas</th><th className="px-3 py-2">Ações de suporte</th>
              <th className="px-3 py-2">Ver como</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.operators.map((o) => (
              <tr key={o.id} className={`border-t border-slate-100 dark:border-slate-800 ${o.isActive ? '' : 'opacity-50'}`}>
                <td className="px-3 py-2"><div className="font-medium">{o.email}</div>{!o.linked && <div className="text-xs text-amber-600">Ainda não entrou</div>}</td>
                <td className="px-3 py-2">{o.role === 'super_admin' ? <span className="flex items-center gap-1 font-medium"><Crown className="h-4 w-4 text-amber-500" />Super administrador</span> : 'Operador'}</td>
                <td className="px-3 py-2">{fmtDate(o.lastLoginAt, true)}</td>
                <td className="px-3 py-2">{o.stats30d.sessions}</td>
                <td className="px-3 py-2">{o.stats30d.customerViews}</td>
                <td className="px-3 py-2">{o.stats30d.supportActions}</td>
                <td className="px-3 py-2">{o.stats30d.viewAs}</td>
                <td className="px-3 py-2 text-right">
                  {o.role === 'operator' && o.isActive && o.id !== meId && (
                    <button disabled={busy} onClick={() => window.confirm(`Remover ${o.email}? Perde o acesso ao backoffice.`) && run(() => api(`/operators/${o.id}/remove`, {}), 'Operador removido.')}
                      className="text-xs text-red-600 hover:underline">Remover</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className={`${card} flex flex-wrap items-end gap-2 p-4`} onSubmit={(e) => { e.preventDefault(); run(() => api('/operators', { email }), 'Operador adicionado. Recebe um email com as instruções.').then(() => setEmail('')); }}>
        <div className="flex-1 min-w-[240px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Adicionar operador (email com que vai entrar)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="nome@exemplo.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <button disabled={busy} className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>Adicionar</button>
      </form>

      <div className={`${card} space-y-3 p-4 text-sm`}>
        <div className="flex items-center gap-2 font-medium"><Crown className="h-4 w-4 text-amber-500" />Transferir a função de super administrador</div>
        {!t && (
          <>
            <p className="text-slate-500">Duas confirmações: primeiro recebes um código no teu email (não no do operador); depois o operador escolhido recebe outro código e tem 24 horas para aceitar. Passas a operador quando ele aceitar.</p>
            <div className="flex flex-wrap gap-2">
              <select value={toId} onChange={(e) => setToId(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <option value="">Escolher operador…</option>
                {candidates.map((o) => <option key={o.id} value={o.id}>{o.email}</option>)}
              </select>
              <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder="Escreve o email dele para confirmar"
                className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
              <button disabled={busy || !toId || !data.mailer} onClick={() => runT(() => api('/operators/transfer', { toUserId: toId, confirmEmail }), 'Enviámos um código para o TEU email (o do super administrador). Introdu-lo aqui.')}
                className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}>Iniciar transferência</button>
            </div>
            {candidates.length === 0 && <p className="text-xs text-slate-500">Só aparecem operadores ativos que já entraram na aplicação pelo menos uma vez.</p>}
          </>
        )}
        {tmsg && <div className={`rounded-lg p-3 ${tmsg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{tmsg.text}</div>}
        {t && t.status === 'awaiting_from' && (
          <>
            <p>Transferência para <strong>{target?.email}</strong>. Introduz o código que recebeste no teu email (válido 15 minutos).</p>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000"
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 tracking-widest dark:border-slate-700 dark:bg-slate-800" />
              <button disabled={busy || code.length !== 6} onClick={() => runT(() => api(`/operators/transfer/${t.id}/confirm`, { code }), `Código confirmado. ${target?.email} recebeu o código dele.`).then(() => setCode(''))}
                className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}>Confirmar</button>
              <button disabled={busy} onClick={() => runT(() => api(`/operators/transfer/${t.id}/cancel`, {}), 'Transferência cancelada.')} className={`${btn} border border-slate-300 dark:border-slate-700`}>Cancelar</button>
            </div>
          </>
        )}
        {t && t.status === 'awaiting_to' && (
          <div className="flex flex-wrap items-center gap-2">
            <p>À espera que <strong>{target?.email}</strong> aceite (até {fmtDate(t.expiresAt, true)}).</p>
            <button disabled={busy} onClick={() => runT(() => api(`/operators/transfer/${t.id}/cancel`, {}), 'Transferência cancelada.')} className={`${btn} border border-slate-300 dark:border-slate-700`}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
};

const IncomingTransfer = ({ api }: { api: Api }) => {
  const { data, reload } = useLoad(() => api<{ transfer: { id: number; fromEmail: string | null; expiresAt: string } | null }>('/operators/transfer/incoming'), []);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const t = data?.transfer;
  if (!t && !msg) return null;
  const run = async (path: string, body: unknown, okText: string, reloadPage = false) => {
    setBusy(true); setMsg(null);
    try {
      await api(path, body);
      setMsg({ ok: true, text: okText });
      if (reloadPage) setTimeout(() => window.location.reload(), 1500); else reload();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); reload(); }
    finally { setBusy(false); }
  };
  return (
    <div className="mb-6 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {t && (
        <>
          <div className="flex items-center gap-2 font-semibold"><Crown className="h-4 w-4" />{t.fromEmail} quer transferir-te a função de super administrador</div>
          <p>Introduz o código que recebeste no teu email (válido até {fmtDate(t.expiresAt, true)}). Ao aceitar, {t.fromEmail} passa a operador.</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000"
              className="w-32 rounded-lg border border-amber-300 bg-white px-3 py-2 tracking-widest" />
            <button disabled={busy || code.length !== 6} onClick={() => run(`/operators/transfer/${t.id}/accept`, { code }, 'És agora super administrador.', true)}
              className={`${btn} bg-amber-600 text-white hover:bg-amber-700`}>Aceitar</button>
            <button disabled={busy} onClick={() => run(`/operators/transfer/${t.id}/cancel`, {}, 'Transferência recusada.')} className={`${btn} border border-amber-400`}>Recusar</button>
          </div>
        </>
      )}
      {msg && <div className={msg.ok ? 'text-emerald-700' : 'text-red-600'}>{msg.text}</div>}
    </div>
  );
};

const AiTab = ({ api }: { api: Api }) => {
  const { data, error } = useLoad(() => api<AiUsage>('/ai-usage'), []);
  if (!data) return <Loading error={error} />;
  const total = data.daily.reduce((s, d) => s + Number(d.generations), 0);
  const max = Math.max(1, ...data.daily.map((d) => Number(d.generations)));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Gerações (30 dias)" value={total} />
        <Stat label="Custo estimado (30 dias)" value={data.costPerGenerationEur ? `${(total * data.costPerGenerationEur).toFixed(2)} €` : '—'} />
        <Stat label="Modelos usados" value={data.byModel.map((m) => m.model).join(', ') || '—'} />
      </div>
      {!data.costPerGenerationEur && (
        <p className="text-xs text-slate-500">O custo só aparece quando a variável AI_COST_PER_GENERATION_EUR estiver definida na Vercel. A aplicação ainda não guarda os tokens gastos por geração.</p>
      )}
      <div className={`${card} p-4`}>
        <div className="mb-3 text-sm font-medium">Gerações por dia (últimos 30 dias)</div>
        <div className="flex h-32 items-end gap-1">
          {data.daily.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.generations}`} className="flex-1 rounded-t bg-brand-500/80"
              style={{ height: `${(Number(d.generations) / max) * 100}%`, minHeight: Number(d.generations) > 0 ? 2 : 0 }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{data.daily[0]?.day}</span><span>{data.daily[data.daily.length - 1]?.day}</span></div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr><th className="px-3 py-2">Cliente (top 10, 30 dias)</th><th className="px-3 py-2">Gerações</th><th className="px-3 py-2">Créditos</th></tr>
          </thead>
          <tbody>
            {data.top.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2">{t.email}</td><td className="px-3 py-2">{t.generations}</td><td className="px-3 py-2">{t.credits}</td></tr>
            ))}
            {data.top.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Sem gerações nos últimos 30 dias.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SyncTab = ({ api }: { api: Api }) => {
  const { data, error } = useLoad(() => api<SyncRow[]>('/sync'), []);
  const runs = useLoad(() => api<{ createdAt: string; details: any }[]>('/cron-runs'), []);
  if (!data) return <Loading error={error} />;
  const lastRun = runs.data?.[0];
  const failing = data.filter((r) => r.lastOk === false).length;
  const stale = data.filter((r) => !r.lastSyncAt || Date.now() - new Date(r.lastSyncAt).getTime() > 36 * 3600 * 1000).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Ligações ativas" value={data.length} />
        <Stat label="Com erro na última sincronização" value={failing} />
        <Stat label="Sem sincronizar há +36 h" value={stale} />
      </div>
      <div className={`${card} p-4 text-sm`}>
        <div className="font-medium">Agendamento diário (03:00 UTC)</div>
        {!runs.data ? <div className="text-slate-500">A carregar…</div> : !lastRun ? (
          <div className="text-amber-700">Ainda não há registo de nenhuma execução.</div>
        ) : (
          <div className={lastRun.details?.ok ? 'text-emerald-700' : 'text-red-600'}>
            Última execução: {fmtDate(lastRun.createdAt, true)} · {lastRun.details?.ok ? `OK, ${lastRun.details?.imported ?? 0} reviews novas` : `Erro: ${lastRun.details?.error}`}
            {lastRun.createdAt && Date.now() - new Date(lastRun.createdAt).getTime() > 30 * 3600 * 1000 && <span className="ml-2 text-amber-700">(há mais de 30 horas: o agendamento pode não estar a correr)</span>}
          </div>
        )}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Plataforma</th><th className="px-3 py-2">Última sincronização</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Token expira</th></tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2">{r.email ?? '—'}</td>
                <td className="px-3 py-2">{r.platform}{r.establishmentId === null && <span className="ml-1 text-xs text-amber-600">(sem estabelecimento)</span>}</td>
                <td className="px-3 py-2">{fmtDate(r.lastSyncAt, true)}</td>
                <td className="px-3 py-2">
                  {r.lastOk === null ? '—' : r.lastOk ? <span className="text-emerald-700">OK{r.lastImported !== null ? ` · ${r.lastImported} novas` : ''}</span> : <span className="text-red-600">Erro: {r.lastError}</span>}
                </td>
                <td className="px-3 py-2">{fmtDate(r.tokenExpiresAt, true)}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sem ligações ativas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditTab = ({ api }: { api: Api }) => {
  const { data, error } = useLoad(() => api<AuditRow[]>('/audit'), []);
  if (!data) return <Loading error={error} />;
  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
          <tr><th className="px-4 py-2">Quando</th><th className="px-4 py-2">Quem</th><th className="px-4 py-2">Ação</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Detalhe</th></tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2 whitespace-nowrap">{fmtDate(row.createdAt, true)}</td>
              <td className="px-4 py-2">{row.actorEmail ?? '—'}</td>
              <td className="px-4 py-2">{ACTION_LABEL[row.action] ?? row.action}</td>
              <td className="px-4 py-2">{row.targetUserId ?? '—'}</td>
              <td className="px-4 py-2 text-xs text-slate-500">{row.details?.reason ?? ''}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Ainda sem ações registadas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

// RJ-8.2: erros técnicos agrupados (respostas 500 da API, exceções e erros JavaScript do navegador).
interface AppErrorRow {
  id: number; source: string; kind: string; message: string; path: string | null; count: number;
  first_seen: string; last_seen: string; resolved_at: string | null; sample: any; last_user_email: string | null;
}
const HealthTab = ({ api }: { api: Api }) => {
  const [showResolved, setShowResolved] = useState(false);
  const { data, error, reload } = useLoad(() => api<AppErrorRow[]>(`/app-errors${showResolved ? '?resolved=1' : ''}`), [showResolved]);
  const [open, setOpen] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const resolve = async (id: number) => {
    setActionError(null);
    try {
      await api(`/app-errors/${id}/resolve`, {});
      reload();
    } catch (e: any) {
      // Antes a falha ficava em silêncio e a linha simplesmente não desaparecia.
      setActionError(`Não foi possível marcar como visto: ${e?.message || 'erro desconhecido'}`);
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Erros iguais são agrupados (os números e ids nos caminhos não contam). "Marcar como visto" esconde o erro até voltar a acontecer.
      </p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Mostrar também os vistos</label>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {actionError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Origem</th><th className="p-3">Erro</th><th className="p-3">Vezes</th><th className="p-3">Última</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {(data || []).map((e) => (
              <React.Fragment key={e.id}>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3 text-xs">{e.source === 'server' ? 'Servidor' : 'Navegador'}<div className="text-slate-500">{e.kind}</div></td>
                  <td className="p-3">
                    <button onClick={() => setOpen(open === e.id ? null : e.id)} className="text-left">
                      <div className="font-medium">{e.message}</div>
                      <div className="text-xs text-slate-500">{e.path || '—'}{e.last_user_email ? ` · ${e.last_user_email}` : ''}</div>
                    </button>
                  </td>
                  <td className="p-3 font-mono">{e.count}</td>
                  <td className="p-3 text-xs">{fmtDate(e.last_seen, true)}<div className="text-slate-500">desde {fmtDate(e.first_seen)}</div></td>
                  <td className="p-3">{!e.resolved_at && <button type="button" onClick={() => resolve(Number(e.id))} className={`${btn} border`}>Marcar como visto</button>}</td>
                </tr>
                {open === e.id && (
                  <tr><td colSpan={5} className="bg-slate-50 p-3 dark:bg-slate-800"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(e.sample, null, 2)}</pre></td></tr>
                )}
              </React.Fragment>
            ))}
            {data && data.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Sem erros técnicos por ver.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Backoffice;
