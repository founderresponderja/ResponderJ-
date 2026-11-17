// RJ-7.2: pede a aceitação dos Termos e da Política de Privacidade (versão em vigor)
// antes de usar a app. Aparece no primeiro acesso e sempre que um dos documentos muda de versão.
import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { buildAuthHeaders } from '../utils/api';

const LABELS: Record<string, string> = {
  terms: 'Termos e Condições',
  privacy: 'Política de Privacidade',
};

const fmt = (v: string) => {
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
};

const ConsentGate = ({ onOpenDocument }: { onOpenDocument: (doc: 'terms' | 'privacy') => void }) => {
  const { getToken, isSignedIn } = useAuth();
  const [pending, setPending] = useState<string[]>([]);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/consents/status', { headers: await buildAuthHeaders({ getToken }) });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) { setPending(data.pending || []); setVersions(data.versions || {}); }
      } catch {
        // sem ligação: não bloqueia; volta a perguntar na próxima entrada
      }
    })();
    return () => { alive = false; };
  }, [isSignedIn, getToken]);

  if (!pending.length) return null;

  const accept = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/consents/accept', {
        method: 'POST',
        headers: await buildAuthHeaders({ getToken }),
        body: JSON.stringify({ kinds: pending }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Não foi possível guardar.');
      setPending(data.pending || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Antes de continuar</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Para usar o Responder Já precisa de aceitar a versão em vigor de:
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {pending.map((doc) => (
            <li key={doc}>
              <button type="button" onClick={() => onOpenDocument(doc as 'terms' | 'privacy')} className="font-medium text-brand-600 underline">
                {LABELS[doc] || doc}
              </button>
              {versions[doc] && <span className="text-slate-500"> (versão de {fmt(versions[doc])})</span>}
            </li>
          ))}
        </ul>
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>Li e aceito os documentos acima.</span>
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={!checked || saving}
          onClick={accept}
          className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'A guardar…' : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  );
};

export default ConsentGate;
