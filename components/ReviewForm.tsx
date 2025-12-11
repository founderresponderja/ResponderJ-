import React, { useState } from 'react';
import { Platform, Tone, Language as AppLanguage, ReviewData } from '../types';
import { Star, Send, Loader2, RefreshCw, Briefcase, Smile, Heart, HeartHandshake, Sparkles } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface ReviewFormProps {
  onGenerate: (data: Omit<ReviewData, 'id' | 'createdAt'>) => void;
  isLoading: boolean;
  lang: Language;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onGenerate, isLoading, lang }) => {
  const [customerName, setCustomerName] = useState('');
  const [platform, setPlatform] = useState<Platform>(Platform.GOOGLE);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [tone, setTone] = useState<Tone>(Tone.PROFESSIONAL);
  const [language, setLanguage] = useState<AppLanguage>(AppLanguage.PT);

  const t = translations[lang].app.form;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      platform,
      customerName: customerName || 'Cliente',
      rating,
      reviewText,
      tone,
      language
    });
  };

  const fillExample = () => {
    setCustomerName('Joana Silva');
    setPlatform(Platform.THE_FORK);
    setRating(4);
    setReviewText('A comida estava ótima, especialmente o risoto! O serviço demorou um pouco, mas os empregados foram simpáticos.');
    setTone(Tone.PROFESSIONAL);
  };

  // Helper para obter o ícone do tom
  const getToneIcon = (t: Tone) => {
    switch (t) {
      case Tone.PROFESSIONAL: return <Briefcase size={16} />;
      case Tone.FRIENDLY: return <Smile size={16} />;
      case Tone.GRATEFUL: return <Heart size={16} />;
      case Tone.APOLOGETIC: return <HeartHandshake size={16} />;
      case Tone.WITTY: return <Sparkles size={16} />;
      default: return <Briefcase size={16} />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {t.newResponse}
        </h2>
        <button 
          type="button" 
          onClick={fillExample}
          className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1"
        >
          <RefreshCw size={14} /> {t.example}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Platform & Language Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.platform}</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 border p-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
            >
              {Object.values(Platform).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.resLanguage}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppLanguage)}
              className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 border p-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
            >
              {Object.values(AppLanguage).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Name & Rating Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.customerName}</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.customerPlaceholder}
              className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 border p-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.rating}</label>
            <div className="flex gap-2 items-center h-[42px]">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`transition-colors duration-200 ${star <= rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                >
                  <Star size={28} fill={star <= rating ? "currentColor" : "none"} />
                </button>
              ))}
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 font-medium">{rating} {t.stars}</span>
            </div>
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.reviewText}</label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            placeholder={t.reviewPlaceholder}
            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 border p-3 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition resize-none"
            required
          />
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.tone}</label>
          <div className="flex flex-wrap gap-3">
            {Object.values(Tone).map((toneOption) => (
              <button
                key={toneOption}
                type="button"
                onClick={() => setTone(toneOption)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border shadow-sm ${
                  tone === toneOption
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700 ring-1 ring-brand-200 dark:ring-brand-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300'
                }`}
              >
                {getToneIcon(toneOption)}
                {toneOption}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !reviewText}
          className={`w-full py-3 px-4 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all ${
            isLoading || !reviewText
              ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
              : 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {t.generating}
            </>
          ) : (
            <>
              <Send size={20} />
              {t.submitButton}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;