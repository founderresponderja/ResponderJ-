// RJ-13.3: ligar a extensão de Chrome com uma chave pessoal.
import React, { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, Puzzle, Trash2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { buildAuthHeaders } from '../utils/api';
import { notifyError, notifySuccess } from '../utils/notify';

interface KeyItem { id: number; label: string | null; lastFour: string; createdAt: string; lastUsedAt: string | null }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-PT') : 'nunca');

const ExtensionPage: React.FC = () => {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = await buildAuthHeaders({ getToken });
    const res = await fetch(path, { ...init, headers: { ...headers, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Pedido falhou.');
    return data;
  }, [getToken]);

  const load = useCallback(async () => {
    try { setKeys((await api('/api/extension/keys')).items || []); }
    catch (e: any) { notifyError(e?.message || 'Não foi possível carregar as chaves.'); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const data = await api('/api/extension/keys', { method: 'POST', body: JSON.stringify({ label: 'Chrome' }) });
      setNewKey(data.key);
      await load();
    } catch (e: any) {
      notifyError(e?.message || 'Não foi possível criar a chave.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: number) => {
    try {
      await api(`/api/extension/keys/${id}`, { method: 'DELETE' });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      notifySuccess('Chave desligada.');
    } catch (e: any) {
      notifyError(e?.message || 'Não foi possível desligar.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Puzzle className="text-brand-600" aria-hidden /> Extensão de Chrome</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gere respostas sem sair do Google, do Booking ou do Tripadvisor: selecione o texto da avaliação, clique com o botão
          direito em "Gerar resposta com Responder Já" e insira a resposta escolhida no campo da página. Cada geração gasta 1 crédito.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound size={18} aria-hidden /> Chaves</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {newKey && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="font-semibold text-amber-900">Copie a chave agora: não volta a ser mostrada.</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="px-2 py-1 rounded bg-white break-all">{newKey}</code>
                <button
                  onClick={async () => { try { await navigator.clipboard.writeText(newKey); notifySuccess('Chave copiada.'); } catch { notifyError('Não foi possível copiar.'); } }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
                ><Copy size={14} aria-hidden /> Copiar</button>
              </div>
              <p className="text-amber-900">Na extensão, cole a chave e carregue em Ligar. Não a partilhe: dá acesso aos seus créditos.</p>
            </div>
          )}
          {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : keys.length === 0 ? (
            <p className="text-slate-500">Ainda não tem nenhuma chave.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between py-2">
                  <span>{k.label || 'Chrome'} · termina em <code>{k.lastFour}</code> · criada {fmt(k.createdAt)} · último uso {fmt(k.lastUsedAt)}</span>
                  <button onClick={() => revoke(k.id)} className="inline-flex items-center gap-1 text-red-700 hover:underline"><Trash2 size={14} aria-hidden /> Desligar</button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={create} disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {creating && <Loader2 size={16} className="animate-spin" />} Criar chave
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExtensionPage;
