
import React from 'react';
import { ReviewData } from '../types';
import { Activity, CreditCard, MessageSquare, Star } from 'lucide-react';

interface DashboardProps {
  history: ReviewData[];
  currentPlan: string;
  responsesRemaining: number;
  onGenerateFromReview: (review: ReviewData) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ history, currentPlan, responsesRemaining, onGenerateFromReview }) => {
  const [analytics, setAnalytics] = React.useState<{
    totalReviewsReceived: number;
    totalResponsesGenerated: number;
    responseRate: number;
    averageRatingByPlatform: Record<string, number>;
    pendingApprovals: number;
    creditsRemaining: number;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/dashboard');
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) setAnalytics(data);
      } catch {
        // Keep local dashboard fallback if analytics endpoint fails.
      }
    };
    loadAnalytics();
    return () => { mounted = false; };
  }, []);

  if (history.length === 0 && !analytics?.totalResponsesGenerated) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 animate-fade-in min-h-[400px]">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
           <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sem dados para mostrar</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
           O seu dashboard será atualizado automaticamente assim que gerar a sua primeira resposta com a nossa IA.
        </p>
      </div>
    );
  }

  const totalReviewsReceived = analytics?.totalReviewsReceived ?? history.length;
  const totalResponsesGenerated = analytics?.totalResponsesGenerated ?? history.length;
  const responseRate = analytics?.responseRate ?? 0;
  const pendingApprovals = analytics?.pendingApprovals ?? 0;
  const creditsRemaining = analytics?.creditsRemaining ?? responsesRemaining;
  const averageRatingByPlatform = analytics?.averageRatingByPlatform || {};

  const recentReviews = [...history].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Métricas reais das tuas avaliações e respostas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total de avaliações recebidas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalReviewsReceived}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total de respostas geradas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalResponsesGenerated}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Taxa de resposta</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{responseRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Respostas pendentes de aprovação</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingApprovals}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Créditos restantes este mês</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{creditsRemaining}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">Avaliação média por plataforma</h3>
        {Object.keys(averageRatingByPlatform).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sem avaliações suficientes para apresentar médias.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(averageRatingByPlatform).map(([platform, rating]) => (
              <div key={platform} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{platform}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{Number(rating).toFixed(2)}★</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          Reviews recentes
        </h3>
        <div className="space-y-4">
          {recentReviews.map((review) => (
            <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded">
                    {review.platform}
                  </span>
                  {review.responseType === 'auto_reply' && (
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-100 dark:border-purple-900">
                      <Bot size={12} /> Auto
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {review.rating} ★ - {review.customerName}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 italic">
                "{review.reviewText}"
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-sm text-slate-700 dark:text-slate-300 text-sm border-l-4 border-brand-400">
                {review.generatedResponse}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => onGenerateFromReview(review)}
                  className="px-3 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg"
                >
                  Gerar Resposta IA
                </button>
              </div>
            </div>
          ))}
          {recentReviews.length === 0 && (
             <p className="text-slate-400 dark:text-slate-500 italic">Ainda não há histórico.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
