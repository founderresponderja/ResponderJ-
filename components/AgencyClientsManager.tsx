import React, { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BUSINESS_TYPES, BRAND_TONES } from '../shared/business-options';

// RJ-5.8: a agência adiciona, edita, remove e escolhe os negócios (clientes) com que trabalha.

export type AgencyClientItem = {
  id: number;
  name: string;
  type?: string | null;
  brandTone?: string | null;
  responseGuidelines?: string | null;
  connectedPlatforms?: string[];
};

type Props = {
  clients: AgencyClientItem[];
  selectedId: number | null;
  canManage: boolean;
  limit: number;
  onSelect: (id: number) => void;
  onChanged: (selectId?: number | null) => void | Promise<void>;
};

type FormState = { name: string; type: string; brandTone: string; responseGuidelines: string };
const EMPTY: FormState = { name: '', type: '', brandTone: 'professional', responseGuidelines: '' };

const labelOf = (list: { value: string; label: string }[], v?: string | null) => list.find((o) => o.value === v)?.label;

const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none';

const AgencyClientsManager = ({ clients, selectedId, canManage, limit, onSelect, onChanged }: Props) => {
  const [editing, setEditing] = useState<AgencyClientItem | 'new' | null>(null);
  const [removing, setRemoving] = useState<AgencyClientItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = limit !== -1 && clients.length >= limit;

  const openNew = () => { setForm(EMPTY); setError(null); setEditing('new'); };
  const openEdit = (c: AgencyClientItem) => {
    setForm({ name: c.name, type: c.type || '', brandTone: c.brandTone || 'professional', responseGuidelines: c.responseGuidelines || '' });
    setError(null);
    setEditing(c);
  };

  const send = async (method: string, url: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Não foi possível guardar. Tenta outra vez.');
    return json;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('O nome do negócio é obrigatório.'); return; }
    setBusy(true); setError(null);
    try {
      const body = { name: form.name, type: form.type || null, brandTone: form.brandTone, responseGuidelines: form.responseGuidelines };
      if (editing === 'new') {
        const created = await send('POST', '/api/agency/clients', body);
        await onChanged(created?.id ?? null);
      } else if (editing) {
        await send('PATCH', `/api/agency/clients/${editing.id}`, body);
        await onChanged();
      }
      setEditing(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true); setError(null);
    try {
      await send('DELETE', `/api/agency/clients/${removing.id}`);
      const next = clients.find((c) => c.id !== removing.id);
      await onChanged(removing.id === selectedId ? next?.id ?? null : undefined);
      setRemoving(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Negócios</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {limit === -1 ? `${clients.length} negócios` : `${clients.length} de ${limit} negócios do plano`}. A Caixa de entrada, as plataformas e as respostas seguem o negócio escolhido.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openNew}
            disabled={atLimit}
            title={atLimit ? `Limite de ${limit} negócios atingido` : undefined}
            className="self-start flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Adicionar negócio
          </button>
        )}
      </div>
      {atLimit && canManage && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">Atingiste o limite de {limit} negócios do plano. Para adicionar outro, remove um que já não uses.</p>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {clients.map((c) => {
          const active = c.id === selectedId;
          return (
            <li key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Building2 size={16} className={active ? 'text-brand-600' : 'text-slate-500'} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {[labelOf(BUSINESS_TYPES, c.type), labelOf(BRAND_TONES, c.brandTone), (c.connectedPlatforms || []).join(', ') || 'Sem plataformas ligadas'].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {active ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300 px-2"><CheckCircle2 size={14} /> Em uso</span>
                ) : (
                  <button onClick={() => onSelect(c.id)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Trabalhar neste
                  </button>
                )}
                {canManage && (
                  <>
                    <button onClick={() => openEdit(c)} aria-label={`Editar ${c.name}`} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={15} /></button>
                    <button
                      onClick={() => { setError(null); setRemoving(c); }}
                      disabled={clients.length <= 1}
                      aria-label={`Remover ${c.name}`}
                      title={clients.length <= 1 ? 'A conta precisa de pelo menos um negócio' : undefined}
                      className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editing === 'new' ? 'Adicionar negócio' : 'Editar negócio'}</h3>
              <button onClick={() => setEditing(null)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do negócio</label>
                <input value={form.name} maxLength={120} required onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ex.: Restaurante O Pátio" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  <option value="">Selecione o tipo</option>
                  {BUSINESS_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tom de voz das respostas</label>
                <select value={form.brandTone} onChange={(e) => setForm({ ...form, brandTone: e.target.value })} className={inputClass}>
                  {BRAND_TONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Orientações para as respostas (opcional)</label>
                <textarea value={form.responseGuidelines} maxLength={2000} rows={3} onChange={(e) => setForm({ ...form, responseGuidelines: e.target.value })} className={inputClass} placeholder="Ex.: tratar o cliente por você; assinar como Equipa O Pátio" />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">Cancelar</button>
                <button type="submit" disabled={busy} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Remover «{removing.name}»?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">As avaliações, as respostas e as ligações às plataformas deste negócio são apagadas e não podem ser recuperadas.</p>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setRemoving(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">Cancelar</button>
              <button onClick={remove} disabled={busy} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyClientsManager;
