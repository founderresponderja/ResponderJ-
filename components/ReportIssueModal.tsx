// RJ-5.6: reportar um erro (descrição + até 2 imagens, reduzidas no navegador antes de enviar).
import React, { useState } from 'react';
import { Bug, ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { buildAuthHeaders } from '../utils/api';
import { notifyError, notifySuccess } from '../utils/notify';

const MAX_IMAGES = 2;
const MAX_BYTES = 1024 * 1024;

interface Attached { name: string; contentType: string; dataBase64: string; previewUrl: string; size: number }

/** Reduz a imagem (lado maior até 1600 px, JPEG) até caber em 1 MB. */
async function shrinkImage(file: File): Promise<Attached> {
  const bitmap = await createImageBitmap(file);
  let maxSide = 1600;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const quality = 0.85 - attempt * 0.1;
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', quality));
    if (blob.size <= MAX_BYTES) {
      const dataUrl: string = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(blob);
      });
      return {
        name: file.name.replace(/\.\w+$/, '') + '.jpg',
        contentType: 'image/jpeg',
        dataBase64: dataUrl.split(',')[1],
        previewUrl: dataUrl,
        size: blob.size,
      };
    }
    maxSide = Math.round(maxSide * 0.75);
  }
  throw new Error('Não foi possível reduzir a imagem para 1 MB.');
}

const ReportIssueModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { getToken } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<Attached[]>([]);
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const chosen = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) notifyError(`No máximo ${MAX_IMAGES} imagens.`);
    try {
      const shrunk = await Promise.all(chosen.map(shrinkImage));
      setImages((prev) => [...prev, ...shrunk].slice(0, MAX_IMAGES));
    } catch (e: any) {
      notifyError(e?.message || 'Imagem inválida.');
    }
  };

  const submit = async () => {
    if (description.trim().length < 10) return notifyError('Descreva o erro (pelo menos 10 caracteres).');
    setSending(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject,
          description,
          pageUrl: window.location.href,
          attachments: images.map((i) => ({ filename: i.name, contentType: i.contentType, dataBase64: i.dataBase64 })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Não foi possível enviar o reporte.');
      notifySuccess(`Reporte #${data.id} recebido. Enviámos-lhe um email com o prazo estimado.`);
      setSubject(''); setDescription(''); setImages([]);
      onClose();
    } catch (e: any) {
      notifyError(e?.message || 'Não foi possível enviar o reporte.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white"><Bug size={18} /> Reportar um erro</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Assunto (opcional)"
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="O que aconteceu? O que estava a fazer quando o erro apareceu?"
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="flex flex-wrap items-center gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.previewUrl} alt={img.name} className="h-16 w-16 rounded-lg border object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-0.5 text-white"
                  aria-label="Remover imagem"
                ><X size={12} /></button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <ImagePlus size={14} /> Anexar imagem ({images.length}/{MAX_IMAGES})
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-500">Também pode reportar por email para o endereço de suporte. Responderemos com o prazo estimado.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
          <button
            onClick={submit}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {sending && <Loader2 size={14} className="animate-spin" />} Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportIssueModal;
