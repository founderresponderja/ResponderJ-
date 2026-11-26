// RJ-13.1 / RJ-13.2: caixa de reclamações (Livro de Reclamações Eletrónico e Portal da Queixa).
// O negócio reencaminha os emails dessas plataformas para um endereço único; aqui vê o prazo de
// 15 dias úteis, prepara a resposta (com IA, opcional), copia-a e marca como respondida.
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, ExternalLink, Loader2, Mail, RefreshCw, Archive } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { AiMark as Sparkles } from './Logo';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { buildAuthHeaders } from '../utils/api';
import { notifyError, notifySuccess } from '../utils/notify';

type Source = 'livro_reclamacoes' | 'portal_queixa' | 'outro' | 'confirmacao_reencaminhamento';
type Status = 'nova' | 'em_resposta' | 'respondida' | 'arquivada';
interface ComplaintItem {
  id: number;
  source: Source;
  legalDeadline: boolean;
  fromEmail: string | null;
  subject: string | null;
  reference: string | null;
  receivedAt: string;
  dueAt: string | null;
  businessDaysLeft: number | null;
  status: Status;
  responseText: string | null;
  preview?: string;
  body?: string;
}

const SOURCE_LABEL: Record<Source, string> = {
  livro_reclamacoes: 'Livro de Reclamações',
  portal_queixa: 'Portal da Queixa',
  outro: 'Outra reclamação',
  confirmacao_reencaminhamento: 'Confirmação do Gmail',
};
const SOURCE_URL: Partial<Record<Source, string>> = {
  livro_reclamacoes: 'https://www.livroreclamacoes.pt',
  portal_queixa: 'https://portaldaqueixa.com',
};
const STATUS_LABEL: Record<Status, string> = {
  nova: 'Nova', em_resposta: 'Em resposta', respondida: 'Respondida', arquivada: 'Arquivada',
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '';

function DeadlineBadge({ item }: { item: ComplaintItem }) {
  if (item.status === 'respondida') return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} aria-hidden /> Respondida</span>;
  if (item.status === 'arquivada' || item.businessDaysLeft === null) return <span className="text-xs text-slate-500">{STATUS_LABEL[item.status]}</span>;
  const left = item.businessDaysLeft;
  const label = left <= 0 ? 'Prazo ultrapassado' : left === 1 ? 'Último dia' : `Faltam ${left} dias úteis`;
  const tone = left <= 2 ? 'text-red-700 bg-red-50' : left <= 5 ? 'text-amber-800 bg-amber-50' : 'text-slate-700 bg-slate-100';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tone}`}>
      {left <= 2 ? <AlertTriangle size={12} aria-hidden /> : <Clock size={12} aria-hidden />} {label}
    </span>
  );
}

const ComplaintsPage: React.FC<{ establishmentId?: number | null }> = ({ establishmentId }) => {
  const { getToken } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [items, setItems] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ComplaintItem | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'draft' | 'save' | null>(null);
  const query = establishmentId ? `?establishmentId=${establishmentId}` : '';

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = await buildAuthHeaders({ getToken });
    const res = await fetch(path, { ...init, headers: { ...headers, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Pedido falhou.');
    return data;
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [addr, list] = await Promise.all([api(`/api/complaints/address${query}`), api(`/api/complaints${query}`)]);
      setAddress(addr.address);
      setItems(list.items || []);
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível carregar as reclamações.');
    } finally {
      setLoading(false);
    }
  }, [api, query]);

  useEffect(() => { load(); }, [load]);

  const open = async (item: ComplaintItem) => {
    try {
      const full = await api(`/api/complaints/${item.id}`);
      setSelected(full);
      setDraft(full.responseText || '');
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível abrir a reclamação.');
    }
  };

  const generate = async () => {
    if (!selected) return;
    setBusy('draft');
    try {
      const data = await api(`/api/complaints/${selected.id}/draft`, { method: 'POST' });
      setDraft(data.responseText);
      notifySuccess('Rascunho preparado. Reveja-o antes de responder.');
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível preparar a resposta.');
    } finally {
      setBusy(null);
    }
  };

  const save = async (status?: Status) => {
    if (!selected) return;
    setBusy('save');
    try {
      const updated = await api(`/api/complaints/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ responseText: draft, ...(status ? { status } : {}) }),
      });
      setSelected({ ...selected, ...updated });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
      notifySuccess(status === 'respondida' ? 'Marcada como respondida.' : status === 'arquivada' ? 'Arquivada.' : 'Resposta guardada.');
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível guardar.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); notifySuccess(msg); } catch { notifyError('Não foi possível copiar. Selecione o texto e copie à mão.'); }
  };

  const openCount = items.filter((i) => i.status === 'nova' || i.status === 'em_resposta').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reclamações</h2>
          <p className="text-sm text-slate-500 mt-1">Livro de Reclamações e Portal da Queixa num só sítio, com o prazo de 15 dias úteis à vista.</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Atualizar">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Mail size={18} aria-hidden /> O seu endereço de reclamações</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {address ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 break-all">{address}</code>
              <button onClick={() => copy(address, 'Endereço copiado.')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <Copy size={14} aria-hidden /> Copiar
              </button>
            </div>
          ) : loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
          <p className="text-slate-600 dark:text-slate-400">
            No email onde recebe os avisos do Livro de Reclamações e do Portal da Queixa, crie uma regra para reencaminhar
            esses emails para este endereço. No Gmail: Definições → Encaminhamento e POP/IMAP → Adicionar um endereço de
            encaminhamento. O Gmail envia um código de confirmação: aparece aqui na lista.
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
        <div className="space-y-2">
          <p className="text-sm text-slate-500">{openCount} por responder · {items.length} no total</p>
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              Ainda não chegou nenhuma reclamação. Quando reencaminhar o primeiro email, aparece aqui.
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => open(item)}
              className={`w-full text-left p-4 rounded-xl border transition ${selected?.id === item.id ? 'border-brand-500 bg-brand-50/40 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {SOURCE_LABEL[item.source]}{item.reference ? ` n.º ${item.reference}` : ''}
                </span>
                <DeadlineBadge item={item} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Recebida a {formatDate(item.receivedAt)}{item.dueAt ? ` · último dia ${formatDate(item.dueAt)}` : ''}</p>
              {item.preview && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{item.preview}</p>}
            </button>
          ))}
        </div>

        <div>
          {!selected ? (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              Escolha uma reclamação para ver o texto e preparar a resposta.
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{SOURCE_LABEL[selected.source]}{selected.reference ? ` n.º ${selected.reference}` : ''}</CardTitle>
                  <DeadlineBadge item={selected} />
                </div>
                <p className="text-xs text-slate-500">
                  {selected.fromEmail} · recebida a {formatDate(selected.receivedAt)}
                  {selected.dueAt ? ` · último dia ${formatDate(selected.dueAt)}${selected.legalDeadline ? ' (prazo legal)' : ' (prazo recomendado)'}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
                  {selected.body}
                </div>

                {selected.source !== 'confirmacao_reencaminhamento' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label htmlFor="complaint-reply" className="text-sm font-medium text-slate-700 dark:text-slate-300">A sua resposta</label>
                      <button onClick={generate} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60">
                        {busy === 'draft' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Preparar com IA (1 crédito)
                      </button>
                    </div>
                    <textarea
                      id="complaint-reply"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={10}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm"
                      placeholder="Escreva aqui a resposta, ou peça um rascunho à IA."
                    />
                    <p className="text-xs text-slate-500">
                      A resposta é dada na própria plataforma. Copie o texto, abra a plataforma, responda e volte aqui para marcar como respondida.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copy(draft, 'Resposta copiada.')} disabled={!draft.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                        <Copy size={14} aria-hidden /> Copiar resposta
                      </button>
                      {SOURCE_URL[selected.source] && (
                        <a href={SOURCE_URL[selected.source]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <ExternalLink size={14} aria-hidden /> Abrir {SOURCE_LABEL[selected.source]}
                        </a>
                      )}
                      <button onClick={() => save()} disabled={busy !== null} className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Guardar
                      </button>
                      <button onClick={() => save('respondida')} disabled={busy !== null || selected.status === 'respondida'} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                        <CheckCircle2 size={14} aria-hidden /> Já respondi
                      </button>
                      <button onClick={() => save('arquivada')} disabled={busy !== null || selected.status === 'arquivada'} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Archive size={14} aria-hidden /> Arquivar
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintsPage;
