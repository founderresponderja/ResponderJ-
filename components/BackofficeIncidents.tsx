// RJ-5.6: inbox de erros (operadores) e indicadores (super administrador).
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

type Api = <T>(path: string, body?: unknown) => Promise<T>;

const SEVERITY_LABEL: Record<string, string> = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
const SEVERITY_CLASS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600',
};
const CATEGORY_LABEL: Record<string, string> = {
  billing: 'Pagamentos e créditos', sync: 'Sincronização', ai_generation: 'Geração de respostas', account_access: 'Conta e acesso',
  publishing: 'Publicação', interface: 'Ecrãs e navegação', other: 'Outro',
};
const STATUS_LABEL: Record<string, string> = { open: 'Aberto', in_progress: 'Em curso', resolved: 'Resolvido' };
const EVENT_LABEL: Record<string, string> = {
  created: 'Criado', classified: 'Classificado pela IA', reclassified: 'Classificação corrigida', assigned: 'Assumido',
  status: 'Estado alterado', note: 'Nota', resolved: 'Resolvido', email: 'Email ao cliente',
};

const card = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const btn = 'rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50';
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const overdue = (r: { status: string; dueAt: string }) => r.status !== 'resolved' && new Date(r.dueAt).getTime() < Date.now();

interface Row {
  id: number; reporterEmail: string; source: string; subject: string | null; aiSummary: string | null; category: string;
  severity: string; status: string; dueAt: string; createdAt: string; resolvedAt: string | null; assignedEmail: string | null; attachments: number;
}

const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
);

/** Imagem anexada: pedida com o token do operador (o endereço não é público). */
const AuthImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const { getToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      const token = await getToken();
      const res = await fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return;
      revoke = URL.createObjectURL(await res.blob());
      setUrl(revoke);
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [src, getToken]);
  if (!url) return <div className="h-40 w-40 animate-pulse rounded-lg bg-slate-100" />;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={alt} className="max-h-64 rounded-lg border" /></a>;
};

export const IncidentsTab = ({ api }: { api: Api }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('active');
  const [severity, setSeverity] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = new URLSearchParams({ status, ...(severity ? { severity } : {}), ...(onlyOverdue ? { overdue: '1' } : {}) });
    api<Row[]>(`/incidents?${q}`).then(setRows).catch((e) => setError(e.message));
  }, [api, status, severity, onlyOverdue]);
  useEffect(load, [load]);

  if (selected !== null) return <IncidentDetail api={api} id={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border p-2 text-sm dark:bg-slate-800">
          <option value="active">Por resolver</option>
          <option value="open">Abertos</option>
          <option value="in_progress">Em curso</option>
          <option value="resolved">Resolvidos</option>
          <option value="">Todos</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border p-2 text-sm dark:bg-slate-800">
          <option value="">Todas as gravidades</option>
          {Object.entries(SEVERITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} /> Só fora do prazo</label>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">#</th><th className="p-3">Resumo</th><th className="p-3">Gravidade</th><th className="p-3">Estado</th><th className="p-3">Prazo</th><th className="p-3">Cliente</th><th className="p-3">Com</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                <td className="p-3 font-mono">{r.id}</td>
                <td className="p-3">
                  <div className="font-medium">{r.aiSummary || r.subject || '(sem resumo)'}</div>
                  <div className="text-xs text-slate-500">{CATEGORY_LABEL[r.category] || r.category}{r.source === 'email' ? ' · por email' : ''}{r.attachments ? ` · ${r.attachments} imagem(ns)` : ''}</div>
                </td>
                <td className="p-3"><Badge className={SEVERITY_CLASS[r.severity]}>{SEVERITY_LABEL[r.severity]}</Badge></td>
                <td className="p-3">{STATUS_LABEL[r.status]}</td>
                <td className={`p-3 ${overdue(r) ? 'font-semibold text-red-600' : ''}`}>{fmt(r.dueAt)}{overdue(r) ? ' · fora do prazo' : ''}</td>
                <td className="p-3">{r.reporterEmail}</td>
                <td className="p-3 text-xs">{r.assignedEmail || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum erro com estes filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const IncidentDetail = ({ api, id, onBack }: { api: Api; id: number; onBack: () => void }) => {
  const [inc, setInc] = useState<any>(null);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { api<any>(`/incidents/${id}`).then(setInc).catch((e) => setError(e.message)); }, [api, id]);
  useEffect(load, [load]);

  const act = async (path: string, body: unknown) => {
    setBusy(true); setError(null);
    try { await api(`/incidents/${id}${path}`, body); load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (!inc) return <div className="text-sm text-slate-500">A carregar…</div>;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className={`${btn} text-slate-600 hover:bg-slate-100`}>← Voltar à lista</button>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className={`${card} space-y-3 p-5`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">#{inc.id} · {inc.aiSummary || inc.subject || 'Reporte de erro'}</h2>
          <Badge className={SEVERITY_CLASS[inc.severity]}>{SEVERITY_LABEL[inc.severity]}</Badge>
          <Badge className="bg-slate-100 text-slate-700">{STATUS_LABEL[inc.status]}</Badge>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {inc.reporterEmail} · {inc.source === 'email' ? 'por email' : 'na app'} · criado {fmt(inc.createdAt)} · prazo {fmt(inc.dueAt)} ({inc.slaBusinessDays} dia(s) úteis)
          {inc.resolvedAt && <> · resolvido {fmt(inc.resolvedAt)}</>}
        </div>
        {inc.aiReason && <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><strong>IA:</strong> {inc.aiReason}{!inc.aiClassified && ' (classificação automática indisponível)'}</div>}
        {inc.subject && <div className="text-sm"><strong>Assunto:</strong> {inc.subject}</div>}
        <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm font-sans">{inc.description}</pre>
        {inc.pageUrl && <div className="text-xs text-slate-500">Página: {inc.pageUrl}</div>}
        {inc.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {inc.attachments.map((a: any) => <AuthImage key={a.id} src={`/api/backoffice/incidents/${inc.id}/attachments/${a.id}`} alt={a.filename || 'imagem'} />)}
          </div>
        )}
      </div>

      {inc.status !== 'resolved' && (
        <div className={`${card} space-y-3 p-5`}>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => act('/assign', {})} className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>Assumir</button>
            <select
              defaultValue=""
              disabled={busy}
              onChange={(e) => { const [severity, category] = e.target.value.split('|'); if (severity) act('/reclassify', { severity, category }); }}
              className="rounded-lg border p-2 text-sm dark:bg-slate-800"
            >
              <option value="" disabled>Corrigir gravidade…</option>
              {Object.entries(SEVERITY_LABEL).map(([k, v]) => <option key={k} value={`${k}|${inc.category}`}>{v}</option>)}
            </select>
            <select
              defaultValue=""
              disabled={busy}
              onChange={(e) => e.target.value && act('/reclassify', { severity: inc.severity, category: e.target.value })}
              className="rounded-lg border p-2 text-sm dark:bg-slate-800"
            >
              <option value="" disabled>Corrigir categoria…</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota interna" className="flex-1 rounded-lg border p-2 text-sm dark:bg-slate-800" />
            <button disabled={busy || !note.trim()} onClick={() => { act('/note', { note }); setNote(''); }} className={`${btn} border`}>Guardar nota</button>
          </div>
          <div className="space-y-2">
            <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="O que foi feito (vai no email ao cliente, opcional)" className="w-full rounded-lg border p-2 text-sm dark:bg-slate-800" />
            <button disabled={busy} onClick={() => act('/resolve', { resolutionNote: resolution })} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>Dar como resolvido e avisar o cliente</button>
          </div>
        </div>
      )}
      {inc.status === 'resolved' && (
        <div className={`${card} flex items-center justify-between p-5 text-sm`}>
          <span>Resolvido{inc.resolutionNote ? `: ${inc.resolutionNote}` : '.'}</span>
          <button disabled={busy} onClick={() => act('/status', { status: 'in_progress' })} className={`${btn} border`}>Reabrir</button>
        </div>
      )}

      <div className={`${card} p-5`}>
        <h3 className="mb-3 font-semibold">Histórico</h3>
        <ul className="space-y-2 text-sm">
          {inc.events.map((e: any) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-32 shrink-0 text-xs text-slate-500">{fmt(e.createdAt)}</span>
              <span>
                <strong>{EVENT_LABEL[e.type] || e.type}</strong>{e.actorEmail ? ` · ${e.actorEmail}` : ''}
                {e.type === 'note' && <> — {e.details?.note}</>}
                {e.type === 'classified' && <> — {SEVERITY_LABEL[e.details?.severity]}, {CATEGORY_LABEL[e.details?.category]}</>}
                {e.type === 'reclassified' && <> — {SEVERITY_LABEL[e.details?.to?.severity]}, {CATEGORY_LABEL[e.details?.to?.category]}</>}
                {e.type === 'email' && <> — {e.details?.kind === 'ack' ? 'confirmação com prazo' : 'resolução'}{e.details?.ok ? '' : ` (falhou: ${e.details?.error})`}</>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface Stats {
  totals: { total: number; open: number; overdue: number; resolved: number; onTime: number; rate: number | null };
  monthly: { month: string; total: number; resolved: number; onTime: number; rate: number | null }[];
  list: { id: number; summary: string | null; severity: string; status: string; createdAt: string; dueAt: string; resolvedAt: string | null; onTime: boolean | null; operators: string[] }[];
}

export const IncidentStatsTab = ({ api }: { api: Api }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Stats>('/incidents/stats').then(setStats).catch((e) => setError(e.message)); }, [api]);
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!stats) return <div className="text-sm text-slate-500">A carregar…</div>;
  const t = stats.totals;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[['Total', t.total], ['Por resolver', t.open], ['Fora do prazo (abertos)', t.overdue], ['Resolvidos', t.resolved], ['Taxa de sucesso', t.rate === null ? '—' : `${t.rate}%`]].map(([label, v]) => (
          <div key={String(label)} className={`${card} p-4`}><div className="text-xs uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      <div className={`${card} p-5`}>
        <h3 className="mb-1 font-semibold">Taxa de sucesso por mês</h3>
        <p className="mb-4 text-xs text-slate-500">Erros resolvidos dentro do prazo definido pela IA (dias úteis, sem fins de semana nem feriados), por mês de criação.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="n" allowDecimals={false} />
              <YAxis yAxisId="p" orientation="right" domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="n" dataKey="resolved" name="Resolvidos" fill="#94a3b8" />
              <Bar yAxisId="n" dataKey="onTime" name="Dentro do prazo" fill="#10b981" />
              <Line yAxisId="p" type="monotone" dataKey="rate" name="Taxa de sucesso (%)" stroke="#2563eb" strokeWidth={2} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">#</th><th className="p-3">Resumo</th><th className="p-3">Gravidade</th><th className="p-3">Criado</th><th className="p-3">Terminado</th><th className="p-3">No prazo</th><th className="p-3">Operadores</th></tr>
          </thead>
          <tbody>
            {stats.list.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-mono">{r.id}</td>
                <td className="p-3">{r.summary || '—'}</td>
                <td className="p-3"><Badge className={SEVERITY_CLASS[r.severity]}>{SEVERITY_LABEL[r.severity]}</Badge></td>
                <td className="p-3">{fmt(r.createdAt)}</td>
                <td className="p-3">{fmt(r.resolvedAt)}</td>
                <td className="p-3">{r.onTime === null ? (overdue(r) ? <span className="text-red-600">em atraso</span> : '—') : r.onTime ? 'Sim' : <span className="text-red-600">Não</span>}</td>
                <td className="p-3 text-xs">{r.operators.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
