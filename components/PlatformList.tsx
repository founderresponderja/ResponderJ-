import React from 'react';
import { Platform } from '../types';
import { ExternalLink, CircleCheckBig, RefreshCw, MessageSquareText } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { useAuth, useUser } from '@clerk/clerk-react';
import { getCsrfToken } from '../services/geminiService';

interface PlatformListProps {
  lang: Language;
  establishmentId?: number | null;
  planId?: string;
}

const PlatformList: React.FC<PlatformListProps> = ({ lang, establishmentId, planId = "free" }) => {
  const t = translations[lang].app;
  const { getToken } = useAuth();
  const { user } = useUser();
  const [connections, setConnections] = React.useState<Record<string, { connected: boolean; status: string; lastSyncAt?: string }>>({});
  const [loadingPlatform, setLoadingPlatform] = React.useState<string | null>(null);
  const [pendingItems, setPendingItems] = React.useState<any[]>([]);
  const [syncingGoogle, setSyncingGoogle] = React.useState(false);
  const [generatingFor, setGeneratingFor] = React.useState<number | null>(null);
  const clerkUserId = user?.id;

  const hasAnyConnection = React.useMemo(
    () => Object.values(connections).some((c) => c?.connected),
    [connections]
  );

  const loadStatus = React.useCallback(async () => {
    if (!clerkUserId) return;
    const response = await fetch(`/api/platforms/status?clerkUserId=${encodeURIComponent(clerkUserId)}&establishmentId=${establishmentId ?? ''}`);
    if (!response.ok) return;
    const data = await response.json();
    setConnections(data);
  }, [clerkUserId, establishmentId]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const loadPending = React.useCallback(async () => {
    if (!clerkUserId) {
      setPendingItems([]);
      return;
    }
    const response = await fetch('/api/reviews-ai/pending', {
      headers: { 'x-clerk-user-id': clerkUserId },
    });
    if (!response.ok) {
      setPendingItems([]);
      return;
    }
    const data = await response.json();
    setPendingItems(Array.isArray(data?.items) ? data.items : []);
  }, [clerkUserId]);

  React.useEffect(() => {
    loadPending();
  }, [loadPending, connections]);

  const handleConnect = async (platformKey: string) => {
    if (!clerkUserId) return;
    setLoadingPlatform(platformKey);
    try {
      const csrfToken = await getCsrfToken();
      const clerkToken = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      if (clerkToken) headers['Authorization'] = `Bearer ${clerkToken}`;

      const response = await fetch(`/api/platforms/connect/${platformKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clerkUserId, establishmentId, planId }),
      });
      if (response.status === 402) {
        const payload = await response.json().catch(() => ({}));
        const allowed = payload?.allowed === "unlimited" ? "ilimitado" : payload?.allowed ?? 1;
        window.alert(`Atingiste o limite de plataformas do teu plano (${allowed}). Faz upgrade para continuares.`);
        return;
      }
      const data = await response.json();
      if (data?.oauthUrl) {
        window.location.href = data.oauthUrl;
        return;
      }
      await loadStatus();
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleDisconnect = async (platformKey: string) => {
    if (!clerkUserId) return;
    setLoadingPlatform(platformKey);
    try {
      const csrfToken = await getCsrfToken();
      const clerkToken = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      if (clerkToken) headers['Authorization'] = `Bearer ${clerkToken}`;

      await fetch(`/api/platforms/disconnect/${platformKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clerkUserId, establishmentId, planId }),
      });
      await loadStatus();
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleSyncGoogle = async () => {
    if (!clerkUserId) return;
    if (!connections.google?.connected) {
      window.alert('Conecta o Google My Business para sincronizar avaliações reais');
      return;
    }
    setSyncingGoogle(true);
    try {
      const response = await fetch(`/api/platforms/sync/google?clerkUserId=${encodeURIComponent(clerkUserId)}&establishmentId=${establishmentId ?? ''}`);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        window.alert(errorPayload?.error || 'Falha ao sincronizar Google.');
        return;
      }
      await loadPending();
      window.alert('Sincronização Google concluída.');
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleGenerateResponse = async (item: any) => {
    setGeneratingFor(item.responseId || item.reviewId || null);
    try {
      const clerkToken = await getToken();
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
        },
        body: JSON.stringify({
          platform: item.platform || 'google',
          originalMessage: item.reviewText || item.responseText || '',
          tone: item.tone || 'profissional',
          businessProfileId: null,
          responseType: 'resposta',
          extraInstructions: '',
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        window.alert(payload?.message || 'Falha ao gerar resposta IA.');
        return;
      }
      await loadPending();
    } finally {
      setGeneratingFor(null);
    }
  };

  // Ideally descriptions should be in translations too, but for brevity keeping some static here
  const platformInfo = [
    {
      name: Platform.GOOGLE,
      key: 'google',
      description: "Essencial para SEO local e visibilidade. O motor de busca mais usado.",
      url: "https://www.google.com/business/",
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
    },
    {
      name: Platform.THE_FORK,
      key: 'thefork',
      comingSoon: false,
      description: "Crucial para restaurantes na Europa. Aumenta reservas diretas.",
      url: "https://www.theforkmanager.com/",
      color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
    },
    {
      name: Platform.BOOKING,
      key: 'booking',
      comingSoon: true,
      description: "Líder em hospitalidade e reviews detalhados de hóspedes verificados.",
      url: "https://admin.booking.com/",
      color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
    },
    {
      name: Platform.TRIPADVISOR,
      key: 'tripadvisor',
      comingSoon: true,
      description: "Forte impacto na reputação turística global e rankings de viagem.",
      url: "https://www.tripadvisor.com/Owners",
      color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900"
    },
    {
      name: Platform.AIRBNB,
      key: 'airbnb',
      comingSoon: false,
      description: "Focado na experiência pessoal do hóspede e Superhost status.",
      url: "https://www.airbnb.com/hosting",
      color: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900"
    },
    {
      name: Platform.FACEBOOK,
      key: 'facebook',
      comingSoon: true,
      description: "Fundamental para comunidade e interação social direta com a marca.",
      url: "https://business.facebook.com/",
      color: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900"
    },
    {
      name: Platform.YELP,
      key: 'yelp',
      comingSoon: true,
      description: "Muito popular para serviços locais e descoberta de restaurantes.",
      url: "https://biz.yelp.com/",
      color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900"
    },
    {
      name: Platform.UBER_EATS,
      key: 'uber_eats',
      comingSoon: true,
      description: "Essencial para delivery. A reputação afeta diretamente as vendas.",
      url: "https://merchants.ubereats.com/",
      color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900"
    },
    {
      name: Platform.EXPEDIA,
      key: 'expedia',
      comingSoon: true,
      description: "Rede gigante de viagens. Importante para hotéis e alojamento.",
      url: "https://apps.expediapartnercentral.com/",
      color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-brand-900 dark:bg-slate-800 rounded-xl p-8 text-white text-center shadow-lg">
        <h2 className="text-3xl font-bold mb-4">{t.platformsTitle}</h2>
        <p className="text-brand-100 dark:text-slate-300 max-w-2xl mx-auto text-lg">
          {t.platformsDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformInfo.map((p) => (
          <div key={p.name} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full animate-fade-in">
            <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border mb-4 ${p.color}`}>
              {t.supported}
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{p.name}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 flex-grow text-sm leading-relaxed">
              {p.description}
            </p>
            <div className="mt-auto space-y-3">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-800 dark:hover:text-brand-300 transition-colors"
              >
                {t.manageOn} {p.name.split(' ')[0]} <ExternalLink size={16} />
              </a>

              {p.key && (
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-semibold ${connections[p.key]?.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {connections[p.key]?.connected ? 'Conectado' : 'Não conectado'}
                  </span>
                  {p.comingSoon ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Em breve
                    </span>
                  ) : connections[p.key]?.connected ? (
                    <button
                      onClick={() => handleDisconnect(p.key)}
                      disabled={loadingPlatform === p.key}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      {loadingPlatform === p.key ? 'A desligar...' : 'Desconectar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(p.key)}
                      disabled={loadingPlatform === p.key || !clerkUserId}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60"
                    >
                      {loadingPlatform === p.key ? 'A conectar...' : 'Conectar'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Avaliações pendentes</h3>
          <button
            onClick={handleSyncGoogle}
            disabled={syncingGoogle}
            title={connections.google?.connected ? 'Sincronizar avaliações do Google' : 'Conecta o Google My Business para sincronizar avaliações reais'}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={syncingGoogle ? 'animate-spin' : ''} />
            {syncingGoogle ? 'A sincronizar...' : 'Sync Google'}
          </button>
        </div>
        {!connections.google?.connected && (
          <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
            Conecta o Google My Business para sincronizar avaliações reais.
          </p>
        )}
        {pendingItems.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasAnyConnection
              ? 'Sem avaliações pendentes de resposta.'
              : 'Liga uma plataforma para começar a receber avaliações.'}
          </p>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div key={item.responseId || item.reviewId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{item.platform || 'google'}</span>
                  <span className="text-xs text-slate-500">{item.customerName || 'Cliente'}</span>
                </div>
                <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{item.reviewText || item.responseText || ''}</p>
                <button
                  onClick={() => handleGenerateResponse(item)}
                  disabled={generatingFor === (item.responseId || item.reviewId)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <MessageSquareText size={14} />
                  {generatingFor === (item.responseId || item.reviewId) ? 'A gerar...' : 'Gerar Resposta IA'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 mt-8 flex items-start gap-4">
         <CircleCheckBig className="text-brand-600 dark:text-brand-400 flex-shrink-0" size={24} />
         <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-lg">{t.whyCentralize}</h4>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t.whyCentralizeDesc}
            </p>
         </div>
      </div>
    </div>
  );
};

export default PlatformList;