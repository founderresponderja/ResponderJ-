// RJ-16.3: página pública /avaliar/<código>, aberta pelo QR code ou pela mensagem de WhatsApp.
// Mostra todas as plataformas por igual (sem perguntar antes se o cliente ficou satisfeito).
import React, { useEffect, useState } from 'react';
import { REVIEW_PLATFORMS, REVIEW_PLATFORM_LABEL } from '../shared/review-requests';

interface PageData { name: string; logoUrl: string | null; links: Record<string, string> }

const PublicReviewPage: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<PageData | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/review-requests/public/${encodeURIComponent(token)}`)
      .then(async (res) => (res.ok ? setData(await res.json()) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [token]);

  useEffect(() => {
    if (data?.name) document.title = `Avaliar ${data.name}`;
  }, [data?.name]);

  const available = data ? REVIEW_PLATFORMS.filter((p) => data.links?.[p]) : [];

  return (
    <main className="min-h-screen bg-[#F4F1EC] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#E8E3DA] p-8 text-center">
        {missing ? (
          <p className="text-slate-600">Esta página não existe ou já não está disponível.</p>
        ) : !data ? (
          <p className="text-slate-400">A carregar…</p>
        ) : (
          <>
            {data.logoUrl && <img src={data.logoUrl} alt="" className="w-20 h-20 mx-auto rounded-xl object-cover mb-4" />}
            <h1 className="text-2xl font-semibold text-[#0A3A3F]">{data.name}</h1>
            <p className="text-slate-600 mt-2 mb-6">Obrigado pela visita. Onde prefere deixar a sua avaliação?</p>
            {available.length === 0 ? (
              <p className="text-slate-500 text-sm">Ainda não há plataformas disponíveis.</p>
            ) : (
              <div className="space-y-3">
                {available.map((p) => (
                  <a
                    key={p}
                    href={data.links[p]}
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl bg-[#0F5F66] hover:bg-[#0A3A3F] text-white font-medium py-3"
                  >
                    Avaliar no {REVIEW_PLATFORM_LABEL[p]}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
        <p className="text-xs text-slate-400 mt-8">Responder Já</p>
      </div>
    </main>
  );
};

export default PublicReviewPage;
