
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReviewData } from '../types';
import {
  Activity,
  Clock,
  MessageSquare,
  Star,
  MapPin,
  Sparkles,
  CreditCard,
  Bot,
} from 'lucide-react';

interface DashboardProps {
  history: ReviewData[];
  currentPlan: string;
  responsesRemaining: number;
  onGenerateFromReview: (review: ReviewData) => void;
}

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

const Dashboard: React.FC<DashboardProps> = ({ history, currentPlan, responsesRemaining, onGenerateFromReview }) => {
  const [analytics, setAnalytics] = React.useState<{
    totalResponses: number;
    responseRate: number;
    averageResponseTimeHours: number;
    averageRatingByPlatform: Record<string, number>;
    weeklyActivity: Array<{ day: string; responses: number }>;
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

  if (history.length === 0 && !analytics?.totalResponses) {
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

  const totalResponses = analytics?.totalResponses ?? history.length;
  const averageRating = analytics
    ? (Object.values(analytics.averageRatingByPlatform || {}).reduce((acc, item) => acc + item, 0) / Math.max(1, Object.keys(analytics.averageRatingByPlatform || {}).length))
    : (history.reduce((acc, item) => acc + (item.rating || 0), 0) / Math.max(1, history.length));
  const avgRatingDisplay = averageRating.toFixed(1);
  const estimatedGoogleImpressions = history.filter(h => h.platform === 'Google Maps').length * 120;
  const hoursSaved = analytics ? ((analytics.averageResponseTimeHours || 0) * totalResponses) / 60 : (totalResponses * 3) / 60;
  const hoursSavedDisplay = hoursSaved.toFixed(1);

  const last7Days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  const weeklyData = analytics?.weeklyActivity?.length
    ? analytics.weeklyActivity.map((item) => ({ name: item.day, respostas: item.responses }))
    : last7Days.map((date) => {
    const yyyy = date.getFullYear();
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const count = history.filter((item) => {
      const d = new Date(item.createdAt);
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${y}-${m}-${day}` === key;
    }).length;
    return {
      name: WEEK_LABELS[(date.getDay() + 6) % 7],
      respostas: count,
    };
  });

  const recentReviews = [...history].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6);

  const openSofiaHelp = () => {
    window.dispatchEvent(new Event('sofia:open'));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resumo operacional e performance da tua equipa.</p>
        </div>
        <button
          onClick={openSofiaHelp}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-semibold flex items-center gap-2"
        >
          <Bot size={16} /> Ajuda IA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total respostas geradas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalResponses}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Avaliação média</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{avgRatingDisplay}★</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Impressões Google Maps (estim.)</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{estimatedGoogleImpressions}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Horas poupadas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{hoursSavedDisplay}h</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-slate-800 dark:text-white">Evolução semanal de respostas</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="respostas" fill="#6d28d9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-slate-800 dark:text-white">Plano e consumo mensal</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Plano atual</p>
              <p className="text-xl font-bold capitalize">{currentPlan}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Respostas restantes este mês</p>
              <p className="text-xl font-bold">{Math.max(0, responsesRemaining)}</p>
            </div>
            <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
              <button
                onClick={openSofiaHelp}
                className="text-sm font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-2"
              >
                <Sparkles size={16} /> Precisas de ajuda? Fala com a Ajuda IA
              </button>
            </div>
          </div>
        </div>
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
