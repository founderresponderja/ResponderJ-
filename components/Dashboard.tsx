import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { ReviewData } from '../types';
import { Activity, Star, Layout, TrendingUp } from 'lucide-react';

interface DashboardProps {
  history: ReviewData[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  
  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center transition-colors">
        <p className="text-slate-500 dark:text-slate-400">Gere algumas respostas para ver as estatísticas.</p>
      </div>
    );
  }

  // Calculate Ratings Distribution
  const ratingCounts = [0, 0, 0, 0, 0];
  history.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++;
    }
  });

  const ratingData = ratingCounts.map((count, index) => ({
    name: `${index + 1} ★`,
    value: count
  }));

  // Calculate Platform Distribution
  const platformCounts: Record<string, number> = {};
  history.forEach(r => {
    platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
  });

  const platformData = Object.keys(platformCounts).map(key => ({
    name: key,
    value: platformCounts[key]
  }));

  // Simple stats
  const averageRating = (history.reduce((acc, curr) => acc + curr.rating, 0) / history.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
          <div className="absolute right-4 top-4 p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
            <Activity size={20} />
          </div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">Total Respostas</h4>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{history.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
          <div className="absolute right-4 top-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-400">
            <Star size={20} />
          </div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">Média de Avaliação</h4>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2 flex items-center gap-2">
            {averageRating} <span className="text-yellow-400 text-2xl">★</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
          <div className="absolute right-4 top-4 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Layout size={20} />
          </div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">Plataforma Principal</h4>
          <p className="text-lg font-bold text-slate-800 dark:text-white mt-3 truncate">
             {platformData.sort((a,b) => b.value - a.value)[0]?.name || '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80 transition-colors">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-400" />
            Distribuição de Estrelas
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {ratingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80 transition-colors">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Layout size={18} className="text-slate-400" />
            Reviews por Plataforma
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;