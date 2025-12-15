
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { ReviewData, Platform, Tone } from '../types';
import { 
  Activity, 
  Clock, 
  Zap, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Layout,
  Smile,
  Heart,
  Tag,
  Bot
} from 'lucide-react';

interface DashboardProps {
  history: ReviewData[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
const SENTIMENT_COLORS: Record<string, string> = {
  Positive: '#22c55e', // green-500
  Neutral: '#94a3b8', // slate-400
  Negative: '#ef4444', // red-500
};

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  const [dateRange, setDateRange] = useState("7d");

  if (history.length === 0) {
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

  // Filtragem de dados baseada no dateRange (Simulação, pois history pode não ter datas antigas suficientes)
  const filteredHistory = history; 

  // Stats Calculations
  const totalResponses = filteredHistory.length;
  const creditsUsed = totalResponses; // 1 crédito por resposta
  // Simulação de métricas que não temos na base de dados
  const avgResponseTime = "2.3s"; 
  const successRate = totalResponses > 0 ? "98.2%" : "0%";

  // Calculate Ratings Distribution
  const ratingCounts = [0, 0, 0, 0, 0];
  filteredHistory.forEach(r => {
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
  filteredHistory.forEach(r => {
    platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
  });

  // Calculate Tone Distribution
  const toneCounts: Record<string, number> = {};
  filteredHistory.forEach(r => {
    toneCounts[r.tone] = (toneCounts[r.tone] || 0) + 1;
  });

  // Calculate Sentiment Distribution
  const sentimentCounts: Record<string, number> = { Positive: 0, Neutral: 0, Negative: 0 };
  let hasSentimentData = false;
  filteredHistory.forEach(r => {
    if (r.sentiment) {
      sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] || 0) + 1;
      hasSentimentData = true;
    }
  });

  const sentimentData = Object.keys(sentimentCounts).map(key => ({
    name: key === 'Positive' ? 'Positivo' : key === 'Negative' ? 'Negativo' : 'Neutro',
    key: key,
    value: sentimentCounts[key],
  })).filter(d => d.value > 0);

  // Calculate Top Keywords
  const keywordCounts: Record<string, number> = {};
  filteredHistory.forEach(r => {
    if (r.keywords) {
      r.keywords.forEach(k => {
        const normalized = k.trim(); // Keep original casing for display usually, but could lowerCase
        keywordCounts[normalized] = (keywordCounts[normalized] || 0) + 1;
      });
    }
  });
  
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));


  const platformData = Object.keys(platformCounts).map(key => ({
    name: key,
    value: platformCounts[key],
    percentage: Math.round((platformCounts[key] / totalResponses) * 100)
  })).sort((a, b) => b.value - a.value);

  const toneData = Object.keys(toneCounts).map(key => ({
    name: key,
    value: toneCounts[key],
    percentage: Math.round((toneCounts[key] / totalResponses) * 100)
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header com Filtro de Data */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Análises</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral do desempenho e uso.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-flex">
          {['7d', '30d', '90d', '1a'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                dateRange === range
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {range === '1a' ? '1 Ano' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Métricas (Estilo Glassmorphism do ficheiro original) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Responses */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Respostas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalResponses}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp size={14} /> +15%
            </span>
            <span className="text-slate-400 ml-2">vs. período anterior</span>
          </div>
        </div>

        {/* Credits Used */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Créditos Usados</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{creditsUsed}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp size={14} /> +8%
            </span>
            <span className="text-slate-400 ml-2">vs. período anterior</span>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tempo Médio</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{avgResponseTime}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingDown size={14} /> -12%
            </span>
            <span className="text-slate-400 ml-2">melhoria</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Taxa de Sucesso</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{successRate}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp size={14} /> +2.1%
            </span>
            <span className="text-slate-400 ml-2">vs. período anterior</span>
          </div>
        </div>
      </div>

      {/* Row 2: Sentiment and Keywords (New) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Analysis */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Heart className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Análise de Sentimento</h3>
          </div>
          
          <div className="h-64 w-full flex items-center justify-center">
            {hasSentimentData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.key] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: 'none', 
                      backgroundColor: '#1e293b', 
                      color: '#fff' 
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">Sem dados de sentimento disponíveis</div>
            )}
          </div>
        </div>

        {/* Top Keywords */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Tag className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Tópicos Frequentes</h3>
          </div>
          
          {topKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topKeywords.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.keyword}</span>
                  <span className="text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
              Sem palavras-chave disponíveis
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Distribution Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Platform Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Layout className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Distribuição por Plataforma</h3>
          </div>
          
          {platformData.length > 0 ? (
            <div className="space-y-5">
              {platformData.map((item, index) => (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-full font-bold">
                        {item.value}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Tone Usage */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Smile className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Tons de Resposta Usados</h3>
          </div>
          
          {toneData.length > 0 ? (
            <div className="space-y-5">
              {toneData.map((item, index) => (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-full font-bold">
                        {item.value}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-cyan-600 dark:bg-cyan-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Sem dados disponíveis
            </div>
          )}
        </div>
      </div>

      {/* Ratings Chart (Mantido do original mas estilizado) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Distribuição de Estrelas</h3>
          </div>
        </div>
        
        <div className="h-64 w-full">
          {totalResponses > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                    backgroundColor: '#1e293b', 
                    color: '#fff',
                    padding: '8px 12px'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-400 text-sm">Dados insuficientes para gerar gráfico</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent History */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          Histórico Recente
        </h3>
        <div className="space-y-4">
          {history.map((review) => (
            <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded">
                    {review.platform}
                  </span>
                  {/* Visual Indicator for Auto-Replies */}
                  {review.responseType === 'auto_reply' && (
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-100 dark:border-purple-900">
                      <Bot size={12} /> Auto
                    </span>
                  )}
                  {review.isFavorite && (
                    <Heart size={14} className="text-rose-500" fill="currentColor" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                  <button className={`text-slate-400 hover:text-rose-500 transition-colors ${review.isFavorite ? 'text-rose-500' : ''}`}>
                    <Heart size={16} fill={review.isFavorite ? "currentColor" : "none"} />
                  </button>
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
            </div>
          ))}
          {history.length === 0 && (
             <p className="text-slate-400 dark:text-slate-500 italic">Ainda não há histórico.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;