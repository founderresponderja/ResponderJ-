import React, { useState, useEffect, useCallback } from 'react';
import { Inbox as InboxIcon, Plus, AlertCircle, CheckCircle, ExternalLink, Send, Sparkles, X, Star } from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { useAuth } from '@clerk/clerk-react';
import { ReviewData, Platform, Tone, Language as LanguageEnum } from '../types';
import ResponseCard from './ResponseCard';
import { useResponseActions } from '../hooks/useResponseActions';
import { buildAuthHeaders } from '../utils/api';
import { useGenerateResponse } from '../services/geminiService';

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

// F18: Platform/Tone/Language mapping from backend strings — add real validation when sync extracts these systematically
function inboxItemToReviewData(
  item: InboxItem,
  anonymousLabel: string,
): ReviewData {
  return {
    id: String(item.id),
    establishmentId: undefined,
    platform: (item.platform as unknown as Platform) ?? Platform.GOOGLE,
    customerName: item.author_name ?? anonymousLabel,
    rating: item.rating ?? 0,
    reviewText: item.review_text ?? '',
    tone: (item.response_tone as unknown as Tone) ?? Tone.PROFESSIONAL,
    language: mapLanguage(item.response_language),
    generatedResponse: item.response_text ?? undefined,
    sentiment: (item.sentiment as 'Positive' | 'Neutral' | 'Negative' | undefined) ?? undefined,
    keywords: [],
    createdAt: new Date(item.created_at),
    responseId: item.response_id ?? undefined,
    approvalStatus: (item.approval_status as 'pending' | 'approved' | 'edited' | 'discarded' | undefined) ?? undefined,
    attemptsCount: 1,
  };
}

function mapLanguage(lang: string | null): LanguageEnum {
  if (!lang) return LanguageEnum.PT;
  const lower = lang.toLowerCase();
  if (lower.includes('en')) return LanguageEnum.EN;
  if (lower.includes('es')) return LanguageEnum.ES;
  if (lower.includes('fr')) return LanguageEnum.FR;
  return LanguageEnum.PT;
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

  const {
    accept,
    discard,
    regenerate,
    isWorking: isActionWorking,
  } = useResponseActions({ onSuccess: fetchInbox });

  const [isPublishing, setIsPublishing] = useState(false);

  const generate = useGenerateResponse();
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual review drawer state
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualPlatform, setManualPlatform] = useState<string>('');
  const [manualAuthorName, setManualAuthorName] = useState('');
  const [manualRating, setManualRating] = useState<number>(0);
  const [manualReviewText, setManualReviewText] = useState('');
  const [manualReviewDate, setManualReviewDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [manualExternalText, setManualExternalText] = useState('');
  const [manualExternalDate, setManualExternalDate] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const resetManualForm = useCallback(() => {
    setManualPlatform('');
    setManualAuthorName('');
    setManualRating(0);
    setManualReviewText('');
    setManualReviewDate(new Date().toISOString().slice(0, 10));
    setManualExternalText('');
    setManualExternalDate('');
    setManualError(null);
  }, []);

  const closeManualDrawer = useCallback(() => {
    setIsManualOpen(false);
    resetManualForm();
  }, [resetManualForm]);

  const validateManualForm = useCallback((): string | null => {
    const allowed = ['google', 'booking', 'tripadvisor', 'facebook', 'instagram'];
    if (!manualPlatform || !allowed.includes(manualPlatform)) {
      return t.errPlatform;
    }
    if (!manualReviewText.trim()) {
      return t.errReviewText;
    }
    if (manualReviewText.length > 5000) {
      return t.errReviewLong;
    }
    if (!Number.isInteger(manualRating) || manualRating < 1 || manualRating > 5) {
      return t.errRating;
    }
    if (manualExternalText.trim().length > 5000) {
      return t.errExtLong;
    }
    return null;
  }, [manualPlatform, manualReviewText, manualRating, manualExternalText, t]);

  const handleManualSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const err = validateManualForm();
      if (err) {
        setManualError(err);
        return;
      }
      setManualError(null);
      setIsSubmittingManual(true);
      try {
        const headers = await buildAuthHeaders({ getToken });
        const body: Record<string, unknown> = {
          platform: manualPlatform,
          rating: manualRating,
          reviewText: manualReviewText,
          reviewDate: manualReviewDate,
        };
        if (manualAuthorName.trim()) body.authorName = manualAuthorName.trim();
        if (manualExternalText.trim()) {
          body.externalResponseText = manualExternalText.trim();
          if (manualExternalDate) body.externalResponseAt = manualExternalDate;
        }
        const res = await fetch('/api/inbox/manual', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setManualError(json?.message || t.errCreateFail);
          return;
        }
        const created = json?.review;
        closeManualDrawer();
        await fetchInbox();
        if (created?.id) setSelectedReviewId(created.id);
      } catch (err: any) {
        console.error('Manual submit error:', err);
        setManualError(err?.message || t.errUnexpected);
      } finally {
        setIsSubmittingManual(false);
      }
    },
    [
      validateManualForm,
      getToken,
      manualPlatform,
      manualRating,
      manualReviewText,
      manualReviewDate,
      manualAuthorName,
      manualExternalText,
      manualExternalDate,
      closeManualDrawer,
      fetchInbox,
      t,
    ],
  );

  useEffect(() => {
    if (!isManualOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') closeManualDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isManualOpen, closeManualDrawer]);

  const selectedItem = items.find((it) => it.id === selectedReviewId) ?? null;

  const handlePublish = async () => {
    if (!selectedItem || !selectedItem.response_id) return;
    setIsPublishing(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch(`/api/inbox/${selectedItem.id}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ responseId: selectedItem.response_id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || t.publishFailed);
        return;
      }
      await fetchInbox();
    } catch (e) {
      console.error('handlePublish failed:', e);
      alert(t.publishFailed);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGenerateForReview = async () => {
    if (!selectedItem) return;
    setIsGenerating(true);
    try {
      const reviewData = inboxItemToReviewData(selectedItem, t.anonymous);
      await generate(reviewData, undefined, selectedItem.id);
      await fetchInbox();
    } catch (e) {
      console.error('handleGenerateForReview failed:', e);
      const msg = e instanceof Error ? e.message : t.generateFailed;
      alert(msg || t.generateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

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
          onClick={() => setIsManualOpen(true)}
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
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto">
          {!selectedItem ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <InboxIcon size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">{t.selectPrompt}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Cabeçalho do review */}
              <div>
                <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                  <span className="text-amber-500 text-base">{stars(selectedItem.rating)}</span>
                  <span className="font-medium">{platformLabel(selectedItem.platform)}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                  {selectedItem.author_name ?? t.anonymous}
                </h2>
                <p className="text-xs text-slate-400 mb-3">
                  {formatDate(selectedItem.review_date ?? selectedItem.created_at, lang)}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.review_text ?? ''}
                </p>
              </div>

              {/* Separador */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">

                {/* Branch A — Publicada via Responder Já */}
                {selectedItem.is_published && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                      <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                        {t.statusPublished}
                      </span>
                      {selectedItem.published_at && (
                        <span className="text-xs text-green-700 dark:text-green-300 ml-auto">
                          {formatDate(selectedItem.published_at, lang)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap leading-relaxed">
                      {selectedItem.response_text ?? ''}
                    </p>
                  </div>
                )}

                {/* Branch B — Respondida externamente (fora do Responder Já) */}
                {!selectedItem.is_published && selectedItem.external_response_text && (
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t.statusExternal}
                      </span>
                      {selectedItem.external_response_at && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                          {formatDate(selectedItem.external_response_at, lang)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedItem.external_response_text}
                    </p>
                  </div>
                )}

                {/* Branch C — Resposta gerada, ainda não publicada */}
                {!selectedItem.is_published && !selectedItem.external_response_text && selectedItem.response_id !== null && (
                  <div className="space-y-3">
                    <ResponseCard
                      review={inboxItemToReviewData(selectedItem, t.anonymous)}
                      lang={lang}
                      onAccept={async (text) => {
                        if (selectedItem.response_id == null) return;
                        await accept(selectedItem.response_id, text);
                      }}
                      onDiscard={async () => {
                        if (selectedItem.response_id == null) return;
                        await discard(selectedItem.response_id);
                      }}
                      onRegenerate={async () => {
                        if (selectedItem.response_id == null) return;
                        await regenerate(selectedItem.response_id);
                      }}
                      isWorking={isActionWorking}
                    />

                    {/* Botão Publicar — só visível quando aprovada e não publicada */}
                    {(selectedItem.approval_status === 'approved' ||
                      selectedItem.approval_status === 'edited') && (
                      <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Send size={16} />
                        {t.publishToGoogle}
                      </button>
                    )}
                  </div>
                )}

                {/* Branch D — Sem resposta. CTA para gerar com IA. */}
                {!selectedItem.is_published && !selectedItem.external_response_text && selectedItem.response_id === null && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      {t.noResponseYet}
                    </p>
                    <button
                      onClick={handleGenerateForReview}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Sparkles size={16} />
                      {isGenerating ? t.generatingResponse : t.respondWithAI}
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

      </div>

      {/* === Drawer: Nova resposta manual === */}
      {isManualOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-drawer-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label={t.manualClose}
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={closeManualDrawer}
          />

          {/* Drawer panel */}
          <div
            className={[
              'relative z-10 w-full mx-auto bg-white shadow-2xl',
              'max-w-2xl rounded-t-2xl',
              'max-h-[90vh] overflow-y-auto',
              'transform transition-transform duration-300 ease-out',
              'translate-y-0',
            ].join(' ')}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4">
              <h2 id="manual-drawer-title" className="text-lg font-semibold text-slate-900">
                {t.newManual}
              </h2>
              <button
                type="button"
                onClick={closeManualDrawer}
                aria-label={t.manualClose}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleManualSubmit} className="px-6 py-5 space-y-5">
              {/* Plataforma */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.manualPlatform} <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualPlatform}
                  onChange={(e) => setManualPlatform(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                >
                  <option value="">{t.manualPlatformPick}</option>
                  <option value="google">Google</option>
                  <option value="booking">Booking.com</option>
                  <option value="tripadvisor">TripAdvisor</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              {/* Nome cliente */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.manualAuthorName} <span className="text-slate-400 font-normal">{t.manualOptional}</span>
                </label>
                <input
                  type="text"
                  value={manualAuthorName}
                  onChange={(e) => setManualAuthorName(e.target.value)}
                  placeholder={t.anonymous}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  maxLength={200}
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.manualRating} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setManualRating(n)}
                      aria-label={t.manualRatingStars.replace('{n}', String(n))}
                      className="p-1 rounded hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <Star
                        className={[
                          'h-6 w-6',
                          manualRating >= n
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-300',
                        ].join(' ')}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Texto review */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.manualReviewText} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={manualReviewText}
                  onChange={(e) => setManualReviewText(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">{manualReviewText.length} / 5000</p>
              </div>

              {/* Data review */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.manualReviewDate}
                </label>
                <input
                  type="date"
                  value={manualReviewDate}
                  onChange={(e) => setManualReviewDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Separator + bloco resposta externa */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-1">
                  {t.manualExternalTitle}
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  {t.manualExternalHelp}
                </p>

                {/* Texto resposta externa */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.manualExternalText}
                  </label>
                  <textarea
                    value={manualExternalText}
                    onChange={(e) => setManualExternalText(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  {manualExternalText.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{manualExternalText.length} / 5000</p>
                  )}
                </div>

                {/* Data resposta externa */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.manualExternalDate}
                  </label>
                  <input
                    type="date"
                    value={manualExternalDate}
                    onChange={(e) => setManualExternalDate(e.target.value)}
                    disabled={!manualExternalText.trim()}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Erro inline */}
              {manualError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {manualError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeManualDrawer}
                  disabled={isSubmittingManual}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t.manualCancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSubmittingManual ? t.manualSubmitting : t.manualSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
