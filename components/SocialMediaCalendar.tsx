import React, { useMemo, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  FileText,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Video,
  Image as ImageIcon,
  MoreVertical,
  X
} from 'lucide-react';
import { SocialPost, SocialPlatform } from '../types';
import { translations, Language } from '../utils/translations';

interface SocialMediaCalendarProps {
  lang: Language;
}

// Mock Data
const MOCK_POSTS: SocialPost[] = [
  { id: '1', title: 'Lançamento Menu Verão', platform: 'instagram', status: 'published', scheduledDate: new Date(new Date().setDate(new Date().getDate() - 2)), contentType: 'image', engagement: '4.5%' },
  { id: '2', title: 'Dica do Chef', platform: 'facebook', status: 'scheduled', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)), contentType: 'video' },
  { id: '3', title: 'Vaga para Cozinheiro', platform: 'linkedin', status: 'draft', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 3)), contentType: 'text' },
  { id: '4', title: 'Bastidores da Cozinha', platform: 'tiktok', status: 'scheduled', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 5)), contentType: 'video' },
];

const SocialMediaCalendar: React.FC<SocialMediaCalendarProps> = ({ lang }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [posts, setPosts] = useState<SocialPost[]>(MOCK_POSTS);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPost, setNewPost] = useState<Partial<SocialPost>>({
    title: '',
    platform: 'instagram',
    status: 'draft',
    contentType: 'image',
    scheduledDate: new Date()
  });

  const t = translations[lang].app.calendar;

  // Calendar Logic Helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString(lang, { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const getPostsForDay = (day: number) => {
    return posts.filter(p => {
      const d = new Date(p.scheduledDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const getPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
      case 'facebook': return <Facebook size={16} className="text-blue-600" />;
      case 'instagram': return <Instagram size={16} className="text-pink-600" />;
      case 'linkedin': return <Linkedin size={16} className="text-blue-700" />;
      case 'twitter': return <Twitter size={16} className="text-sky-500" />;
      case 'tiktok': return <div className="w-4 h-4 bg-black text-white rounded-full flex items-center justify-center text-[8px] font-bold">Tk</div>;
      default: return <FileText size={16} />;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch(type) {
      case 'video': return <Video size={14} />;
      case 'image': return <ImageIcon size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title) return;

    const post: SocialPost = {
      id: Date.now().toString(),
      title: newPost.title!,
      platform: newPost.platform as SocialPlatform,
      status: newPost.status as any,
      contentType: newPost.contentType as any,
      scheduledDate: new Date(newPost.scheduledDate || selectedDate),
      engagement: '0%'
    };

    setPosts([...posts, post]);
    if (newPost.sourceType === 'review_response' && newPost.responseId && newPost.status === 'scheduled') {
      await fetch('/api/calendar/schedule-review-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: newPost.responseId,
          scheduledFor: new Date(newPost.scheduledDate || selectedDate).toISOString(),
        }),
      });
    }
    setIsModalOpen(false);
    setNewPost({ title: '', platform: 'instagram', status: 'draft', contentType: 'image', scheduledDate: new Date() });
  };

  // Stats
  const stats = {
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    drafts: posts.filter(p => p.status === 'draft').length,
    engagement: '3.8%'
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/calendar/posts');
        if (!res.ok) return;
        const data = await res.json();
        const mapped = (data.posts || []).map((p: any) => ({
          ...p,
          scheduledDate: new Date(p.scheduledDate),
        }));
        setPosts((prev) => [...mapped, ...prev.filter((x) => x.sourceType !== 'review_response')]);
      } catch {}
    };
    load();
  }, []);

  const weekDays = useMemo(() => {
    const base = new Date(selectedDate);
    const dow = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - dow);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setNewPost({...newPost, scheduledDate: selectedDate});
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> {t.newPost}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <Clock size={20} />
            <span className="text-sm font-medium">{t.scheduled}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.scheduled}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">{t.published}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.published}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">{t.engagement}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.engagement}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <FileText size={20} />
            <span className="text-sm font-medium">{t.drafts}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.drafts}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'month' ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>Mensal</button>
        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'week' ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>Semanal</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{monthName}</h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {viewMode === 'month' && (
          <>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 md:h-32" />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const dayPosts = getPostsForDay(day);
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div 
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`
                    h-24 md:h-32 border rounded-lg p-2 cursor-pointer transition-all flex flex-col justify-between
                    ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/50 dark:bg-brand-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-800'}
                    ${isToday ? 'bg-slate-50 dark:bg-slate-800/50' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium ${isToday ? 'bg-brand-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-700 dark:text-slate-300'}`}>
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-500">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-1 overflow-hidden">
                    {dayPosts.slice(0, 3).map((post, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${
                        post.platform === 'instagram' ? 'bg-pink-500' :
                        post.platform === 'facebook' ? 'bg-blue-600' :
                        post.platform === 'linkedin' ? 'bg-blue-800' : 'bg-slate-400'
                      }`} title={post.title} />
                    ))}
                    {dayPosts.length > 3 && <div className="w-2 h-2 rounded-full bg-slate-300 text-[6px] flex items-center justify-center">+</div>}
                  </div>
                </div>
              );
            })}
          </div>
          </>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDays.map((day, idx) => {
                const dayPosts = posts.filter((p) => {
                  const d = new Date(p.scheduledDate);
                  return d.toDateString() === day.toDateString();
                });
                return (
                  <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 min-h-36">
                    <p className="text-xs font-semibold text-slate-500 mb-2">{day.toLocaleDateString(lang, { weekday: 'short', day: '2-digit' })}</p>
                    <div className="space-y-2">
                      {dayPosts.map((p) => (
                        <div key={p.id} className="text-xs p-2 rounded bg-slate-100 dark:bg-slate-800">
                          <p className="font-semibold">{p.title}</p>
                          <p className="text-slate-500">{p.platform} · {p.status}</p>
                        </div>
                      ))}
                      {dayPosts.length === 0 && <p className="text-xs text-slate-400">Sem posts</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Details */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {selectedDate.getDate()} de {selectedDate.toLocaleString(lang, { month: 'long' })}
            </h3>
            <button 
              onClick={() => {
                setNewPost({...newPost, scheduledDate: selectedDate});
                setIsModalOpen(true);
              }}
              className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {getPostsForDay(selectedDate.getDate()).length > 0 ? (
              getPostsForDay(selectedDate.getDate()).map(post => (
                <div key={post.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-800 transition-all bg-slate-50 dark:bg-slate-800/50 group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(post.platform)}
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{post.title}</h4>
                  {post.sourceType === 'review_response' && (
                    <p className="text-[11px] text-brand-600 dark:text-brand-400 mb-1">Post de resposta a review</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      {getContentTypeIcon(post.contentType)} {post.contentType}
                    </span>
                    {post.engagement && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp size={12} /> {post.engagement}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <CalendarIcon size={32} className="mb-2 opacity-50" />
                <p className="text-sm">{t.noPosts}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.createTitle}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.postTitle}</label>
                <input 
                  type="text" 
                  required
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  placeholder="Ex: Promoção de Verão"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.postPlatform}</label>
                  <select 
                    value={newPost.platform}
                    onChange={(e) => setNewPost({...newPost, platform: e.target.value as any})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select 
                    value={newPost.contentType}
                    onChange={(e) => setNewPost({...newPost, contentType: e.target.value as any})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                    <option value="carousel">Carrossel</option>
                    <option value="text">Texto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.postDate}</label>
                  <input 
                    type="date"
                    required
                    value={newPost.scheduledDate ? newPost.scheduledDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewPost({...newPost, scheduledDate: new Date(e.target.value)})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.postStatus}</label>
                  <select 
                    value={newPost.status}
                    onChange={(e) => setNewPost({...newPost, status: e.target.value as any})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="scheduled">Agendado</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaCalendar;