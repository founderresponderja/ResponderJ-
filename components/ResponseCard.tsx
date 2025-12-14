import React, { useState, useEffect, useRef } from 'react';
import { ReviewData } from '../types';
import { Copy, Check, MessageSquare, CircleAlert, Heart, SquarePen, Save, X, RefreshCw, Smile, Meh, Frown, Sparkles } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface ResponseCardProps {
  review: ReviewData;
  lang: Language;
  onToggleFavorite?: () => void;
  onUpdate?: (id: string, newResponse: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const ResponseCard: React.FC<ResponseCardProps> = ({ 
  review, 
  lang, 
  onToggleFavorite, 
  onUpdate,
  onRegenerate,
  isRegenerating = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(review.generatedResponse || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = translations[lang].app.card;

  // Update local text if review changes externally
  useEffect(() => {
    setEditedText(review.generatedResponse || '');
  }, [review.generatedResponse]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editedText]);

  if (!review.generatedResponse) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedText : review.generatedResponse || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(review.id, editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(review.generatedResponse || '');
    setIsEditing(false);
  };

  // Helper for Sentiment Icon/Color
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
      case 'Neutral':
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
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 border-b border-brand-100 dark:border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg text-brand-600 dark:text-brand-300">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t.suggested}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{review.tone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Action Buttons */}
          {onRegenerate && !isEditing && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={t.regenerate}
            >
              <RefreshCw size={16} className={isRegenerating ? "animate-spin" : ""} />
            </button>
          )}

          {onToggleFavorite && !isEditing && (
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-all duration-200 border ${
                review.isFavorite 
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border-rose-200 dark:border-rose-800' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700'
              }`}
              title="Guardar nos favoritos"
            >
              <Heart size={16} fill={review.isFavorite ? "currentColor" : "none"} />
            </button>
          )}
          
          {!isEditing && (
             <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-brand-200 dark:hover:border-slate-700"
              title={t.edit}
            >
              <SquarePen size={16} />
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={copied || isEditing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              copied 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 scale-105 border border-transparent' 
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95'
            }`}
          >
            {copied ? <Check size={16} className="animate-bounce" /> : <Copy size={16} />}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Analysis Badge Area */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {getSentimentBadge(review.sentiment)}
          {review.keywords && review.keywords.length > 0 && review.keywords.map((keyword, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
              <Sparkles size={10} className="text-brand-500" />
              {keyword}
            </span>
          ))}
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
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={14} /> {t.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Save size={14} /> {t.save}
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[100px]">
            {review.generatedResponse}
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <CircleAlert size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>{t.aiTip}:</strong> {t.aiTipDesc}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResponseCard;