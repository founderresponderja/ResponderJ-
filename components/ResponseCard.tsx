import React, { useState, useEffect, useRef } from 'react';
import { ReviewData } from '../types';
import {
  Copy, Check, MessageSquare, CircleAlert, Heart, SquarePen, Save, X,
  RefreshCw, Smile, Meh, Frown, Sparkles, ThumbsUp, Trash2, ShieldCheck
} from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface ResponseCardProps {
  review: ReviewData;
  lang: Language;
  onToggleFavorite?: () => void;
  onAccept?: (responseText?: string) => Promise<void> | void;
  onDiscard?: () => Promise<void> | void;
  onRegenerate?: () => Promise<void> | void;
  isWorking?: boolean;
}

const ResponseCard: React.FC<ResponseCardProps> = ({
  review,
  lang,
  onToggleFavorite,
  onAccept,
  onDiscard,
  onRegenerate,
  isWorking = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(review.generatedResponse || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = translations[lang].app.card;

  const status = review.approvalStatus || 'pending';
  const isApproved = status === 'approved' || status === 'edited';
  const isDiscarded = status === 'discarded';
  const attempts = review.attemptsCount || 1;
  const canRegenerate = !isApproved && !isDiscarded && attempts < 3;

  useEffect(() => {
    setEditedText(review.generatedResponse || '');
  }, [review.generatedResponse]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editedText]);

  if (!review.generatedResponse) return null;

  const handleCopy = async () => {
    if (!isApproved) return;
    try {
      await navigator.clipboard.writeText(review.generatedResponse || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleAcceptUnedited = async () => {
    if (!onAccept || isWorking) return;
    await onAccept();
  };

  const handleSaveEdit = async () => {
    if (!onAccept || isWorking) return;
    await onAccept(editedText.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(review.generatedResponse || '');
    setIsEditing(false);
  };

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    switch (sentiment) {
      case 'Positive':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <Smile size={14} /> Positivo
          </span>
        );
      case 'Negative':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <Frown size={14} /> Negativo
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Meh size={14} /> Neutro
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-brand-100 dark:border-slate-700 overflow-hidden animate-fade-in transition-colors relative group">
      <div className="bg-gradient-to-r from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 border-b border-brand-100 dark:border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg text-brand-600 dark:text-brand-300">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sugestão da Sofia</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{review.tone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onToggleFavorite && !isEditing && isApproved && (
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-all duration-200 border ${
                review.isFavorite
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border-rose-200 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500'
              }`}
              title="Guardar nos favoritos"
            >
              <Heart size={16} fill={review.isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            onClick={handleCopy}
            disabled={!isApproved || copied || isEditing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              !isApproved
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : copied
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title={!isApproved ? 'Aceita a resposta primeiro para poder copiar' : 'Copiar texto'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? (t.copied || 'Copiado') : (t.copy || 'Copiar')}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {getSentimentBadge(review.sentiment)}
          {review.keywords && review.keywords.length > 0 && review.keywords.map((keyword, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
              <Sparkles size={10} className="text-brand-500" />
              {keyword}
            </span>
          ))}
          {!isApproved && !isDiscarded && (
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              Tentativa {attempts} de 3
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="animate-fade-in">
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-3 rounded-lg border-2 border-brand-200 dark:border-brand-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-brand-500 focus:ring-0 transition-colors resize-none leading-relaxed"
              rows={5}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={handleCancelEdit}
                disabled={isWorking}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isWorking || editedText.trim().length === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Save size={14} /> Aceitar editado
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[100px]">
            {review.generatedResponse}
          </div>
        )}

        {!isEditing && isApproved && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
            <ShieldCheck size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                {status === 'edited' ? 'Resposta editada e aceite' : 'Resposta aceite'}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Foi descontado 1 crédito. Já podes copiar o texto.
              </p>
            </div>
          </div>
        )}

        {!isEditing && isDiscarded && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <Trash2 size={18} className="text-slate-500 flex-shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Resposta descartada. Sem custo.</p>
          </div>
        )}

        {!isEditing && !isApproved && !isDiscarded && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleAcceptUnedited}
              disabled={isWorking}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm disabled:opacity-50 transition-colors"
            >
              <ThumbsUp size={14} /> Aceitar
            </button>
            <button
              onClick={onRegenerate}
              disabled={isWorking || !canRegenerate}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              title={!canRegenerate ? 'Limite de 3 tentativas atingido' : 'Refazer'}
            >
              <RefreshCw size={14} className={isWorking ? 'animate-spin' : ''} /> Refazer ({attempts}/3)
            </button>
            <button
              onClick={() => setIsEditing(true)}
              disabled={isWorking}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <SquarePen size={14} /> Editar
            </button>
            <button
              onClick={onDiscard}
              disabled={isWorking}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} /> Descartar
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <CircleAlert size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>Dica da Sofia:</strong> Os créditos só descontam quando aceitas a resposta. Refazer e editar são grátis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResponseCard;
