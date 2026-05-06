import React, { useState, useEffect, useCallback } from 'react';
import { Inbox as InboxIcon, Plus, AlertCircle } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { useAuth } from '@clerk/clerk-react';

interface InboxProps {
  lang: Language;
}

interface InboxFilters {
  status?: 'pending' | 'responded';
  platform?: string;
  rating?: number;
}

const PAGE_SIZE = 25;

interface InboxItem {
  id: number;
  platform: string;
  external_id: string | null;
  author_name: string | null;
  rating: number | null;
  review_text: string | null;
  language: string | null;
  sentiment: string | null;
  review_date: string | null;
  external_response_text: string | null;
  external_response_at: string | null;
  created_at: string;
  response_id: number | null;
  response_text: string | null;
  is_published: boolean | null;
  published_at: string | null;
  approval_status: string | null;
  response_tone: string | null;
  response_language: string | null;
}

interface InboxResponse {
  items: InboxItem[];
  page: number;
  pageSize: number;
  total: number;
}

function stars(n: number | null): string {
  const k = Math.max(0, Math.min(5, n ?? 0));
  return '★'.repeat(k) + '☆'.repeat(5 - k);
}

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  booking: 'Booking.com',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

function platformLabel(p: string): string {
  return PLATFORM_LABELS[p] ?? p;
}

function formatDate(s: string, lang: Language): string {
  const locale = lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'pt-PT';
  try {
    return new Date(s).toLocaleDateString(locale);
  } catch {
    return s;
  }
}

const Inbox: React.FC<InboxProps> = ({ lang }) => {
  const t = translations[lang].app.inbox;
  const [filters, setFilters] = useState<InboxFilters>({});
  const [page, setPage] = useState(1);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);

  const { getToken } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL('/api/inbox', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      if (filters.status) url.searchParams.set('status', filters.status);
      if (filters.platform) url.searchParams.set('platform', filters.platform);
      if (filters.rating) url.searchParams.set('rating', String(filters.rating));

      const token = await getToken();
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: InboxResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      console.error('fetchInbox failed:', e);
      setError(t.errorLoading);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters.status, filters.platform, filters.rating, getToken, t.errorLoading]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Reset page quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.platform, filters.rating]);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InboxIcon size={24} className="text-brand-600" />
          <h1 className="text-2xl font-bold">{t.title}</h1>
        </div>
        <button
          onClick={() => console.log('TODO: modal manual')}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          {t.newManual}
        </button>
      </div>

      {/* Body: 2-col layout */}
      <div className="flex gap-6 flex-1 min-h-0">

        {/* Left column: filters + skeleton list */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <select
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: (e.target.value as InboxFilters['status']) || undefined,
                }))
              }
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="">{t.filterAllStatuses}</option>
              <option value="pending">{t.filterPending}</option>
              <option value="responded">{t.filterResponded}</option>
            </select>

            <select
              value={filters.platform ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, platform: e.target.value || undefined }))
              }
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="">{t.filterAllPlatforms}</option>
              <option value="google">Google</option>
              <option value="tripadvisor">TripAdvisor</option>
              <option value="booking">Booking.com</option>
            </select>

            <select
              value={filters.rating ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  rating: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="">{t.filterAllRatings}</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {'★'.repeat(r)}{'☆'.repeat(5 - r)}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de reviews */}
          <div className="space-y-3 flex-1 overflow-y-auto">
            {loading && items.length === 0 && (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full w-16" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full w-10" />
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-full mb-1" />
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-2/3" />
                </div>
              ))
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-400 mb-3">{t.errorLoading}</p>
                <button
                  onClick={fetchInbox}
                  className="text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
                >
                  {t.retry}
                </button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <InboxIcon size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t.empty}</p>
              </div>
            )}

            {!error && items.length > 0 && items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedReviewId(item.id)}
                className={`w-full text-left bg-white dark:bg-slate-900 border rounded-xl p-4 transition-colors ${
                  selectedReviewId === item.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
                  <span className="text-amber-500">{stars(item.rating)}</span>
                  <span className="font-medium">{platformLabel(item.platform)}</span>
                </div>
                <div className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate mb-1">
                  {item.author_name ?? t.anonymous}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                  {item.review_text ?? ''}
                </p>
                <div className="text-xs text-slate-400">
                  {formatDate(item.review_date ?? item.created_at, lang)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: detail */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400">
          {selectedReviewId === null ? (
            <div className="text-center">
              <InboxIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">{t.selectPrompt}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                Review #{selectedReviewId}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Inbox;
