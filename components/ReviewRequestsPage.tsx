// RJ-16.3: pedir avaliações por QR code e WhatsApp, a todos os clientes por igual.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Loader2, MessageCircle, QrCode, Star } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import qrcode from 'qrcode-generator';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { buildAuthHeaders } from '../utils/api';
import { notifyError, notifySuccess } from '../utils/notify';
import {
  REVIEW_PLATFORMS, REVIEW_PLATFORM_LABEL, buildReviewMessage, incentiveWarning, whatsappUrl, type ReviewPlatform,
} from '../shared/review-requests';

const HELP: Record<ReviewPlatform, string> = {
  google: 'No Perfil da Empresa no Google: "Pedir avaliações" → copiar a ligação.',
  tripadvisor: 'No Tripadvisor Management Center: "Obter avaliações" → ligação para escrever avaliação.',
  facebook: 'A ligação da sua página, acabada em /reviews.',
  thefork: 'A ligação do seu restaurante no TheFork.',
};

const ReviewRequestsPage: React.FC<{ establishmentId?: number | null }> = ({ establishmentId }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [links, setLinks] = useState<Partial<Record<ReviewPlatform, string>>>({});
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const query = establishmentId ? `?establishmentId=${establishmentId}` : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch(`/api/review-requests${query}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Não foi possível carregar.');
      setBusinessName(data.businessName);
      setPageUrl(data.pageUrl);
      setLinks(data.links || {});
      setMessage(data.message || '');
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível carregar.');
    } finally {
      setLoading(false);
    }
  }, [getToken, query]);

  useEffect(() => { load(); }, [load]);

  const qrSvg = useMemo(() => {
    if (!pageUrl) return '';
    const qr = qrcode(0, 'M');
    qr.addData(pageUrl);
    qr.make();
    return qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true });
  }, [pageUrl]);

  const save = async () => {
    setSaving(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch('/api/review-requests', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId, links, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Não foi possível guardar.');
      setLinks(data.links || {});
      setMessage(data.message || '');
      notifySuccess('Guardado.');
    } catch (error: any) {
      notifyError(error?.message || 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); notifySuccess(msg); } catch { notifyError('Não foi possível copiar.'); }
  };

  const downloadQr = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-avaliacoes-${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const finalMessage = pageUrl ? buildReviewMessage(message, pageUrl) : '';
  const warning = incentiveWarning(message);
  const hasLinks = Object.values(links).some(Boolean);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Star className="text-brand-600" aria-hidden /> Pedir avaliações</h2>
        <p className="text-sm text-slate-500 mt-1">
          Uma página com as ligações para avaliar {businessName}, um QR code para imprimir e uma mensagem pronta para WhatsApp.
          Peça a todos os clientes, sem escolher só os satisfeitos e sem oferecer nada em troca: são regras do Google e da Tripadvisor.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Onde os clientes avaliam</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {REVIEW_PLATFORMS.map((p) => (
            <div key={p}>
              <label htmlFor={`link-${p}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{REVIEW_PLATFORM_LABEL[p]}</label>
              <input
                id={`link-${p}`}
                type="url"
                inputMode="url"
                value={links[p] || ''}
                onChange={(e) => setLinks({ ...links, [p]: e.target.value })}
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">{HELP[p]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Mensagem</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={600}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm"
          />
          <p className="text-xs text-slate-500">{'{link}'} é trocado pela ligação da sua página.</p>
          {warning && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">{warning}</p>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" />} Guardar
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3. Partilhar</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {!hasLinks && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">Acrescente e guarde pelo menos uma ligação no passo 1: sem isso, a página fica vazia.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <code className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm break-all">{pageUrl}</code>
            <button onClick={() => copy(pageUrl, 'Ligação copiada.')} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><Copy size={14} aria-hidden /> Copiar</button>
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><ExternalLink size={14} aria-hidden /> Ver a página</a>
          </div>

          <div className="grid sm:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start">
            <div>
              <div className="w-[200px] h-[200px] bg-white rounded-lg border border-slate-200 p-1" aria-label="QR code da página de avaliações" role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <button onClick={downloadQr} className="mt-2 w-full inline-flex justify-center items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><Download size={14} aria-hidden /> Descarregar QR (SVG)</button>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><QrCode size={12} aria-hidden /> Para a mesa, o balcão ou a fatura.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="wa-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp do cliente (opcional)</label>
              <input id="wa-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="912 345 678" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-sm" />
              <p className="text-xs text-slate-500">Sem número, o WhatsApp deixa escolher o contacto.</p>
              <a href={whatsappUrl(finalMessage, phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><MessageCircle size={16} aria-hidden /> Enviar por WhatsApp</a>
              <button onClick={() => copy(finalMessage, 'Mensagem copiada.')} className="ml-2 inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><Copy size={14} aria-hidden /> Copiar mensagem</button>
              <p className="text-xs text-slate-500 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2">{finalMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewRequestsPage;
