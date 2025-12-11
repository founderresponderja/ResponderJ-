import React, { useState } from 'react';
import { ReviewData } from '../types';
import { Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface ResponseCardProps {
  review: ReviewData;
  lang: Language;
}

const ResponseCard: React.FC<ResponseCardProps> = ({ review, lang }) => {
  const [copied, setCopied] = useState(false);
  const t = translations[lang].app.card;

  if (!review.generatedResponse) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(review.generatedResponse || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-brand-100 dark:border-slate-800 overflow-hidden animate-fade-in transition-colors">
      <div className="bg-gradient-to-r from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 border-b border-brand-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t.suggested}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{review.tone}</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t.copied : t.copy}
        </button>
      </div>
      
      <div className="p-6">
        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
          {review.generatedResponse}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>{t.aiTip}:</strong> {t.aiTipDesc}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResponseCard;