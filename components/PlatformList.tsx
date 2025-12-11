import React from 'react';
import { Platform } from '../types';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface PlatformListProps {
  lang: Language;
}

const PlatformList: React.FC<PlatformListProps> = ({ lang }) => {
  const t = translations[lang].app;

  // Ideally descriptions should be in translations too, but for brevity keeping some static here
  const platformInfo = [
    {
      name: Platform.GOOGLE,
      description: "Essencial para SEO local e visibilidade.",
      url: "https://www.google.com/business/",
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
    },
    {
      name: Platform.THE_FORK,
      description: "Crucial para restaurantes na Europa.",
      url: "https://www.theforkmanager.com/",
      color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
    },
    {
      name: Platform.BOOKING,
      description: "Líder em hospitalidade e reviews detalhados.",
      url: "https://admin.booking.com/",
      color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
    },
    {
      name: Platform.TRIPADVISOR,
      description: "Forte impacto na reputação turística global.",
      url: "https://www.tripadvisor.com/Owners",
      color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900"
    },
    {
        name: Platform.AIRBNB,
        description: "Focado na experiência pessoal do hóspede.",
        url: "https://www.airbnb.com/hosting",
        color: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-brand-900 dark:bg-slate-800 rounded-xl p-8 text-white text-center shadow-lg">
        <h2 className="text-3xl font-bold mb-4">{t.platformsTitle}</h2>
        <p className="text-brand-100 dark:text-slate-300 max-w-2xl mx-auto text-lg">
          {t.platformsDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformInfo.map((p) => (
          <div key={p.name} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full">
            <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border mb-4 ${p.color}`}>
              {t.supported}
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{p.name}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 flex-grow text-sm leading-relaxed">
              {p.description}
            </p>
            <div className="mt-auto">
              <a 
                href={p.url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-800 dark:hover:text-brand-300 transition-colors"
              >
                {t.manageOn} {p.name.split(' ')[0]} <ExternalLink size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 mt-8 flex items-start gap-4">
         <CheckCircle className="text-brand-600 dark:text-brand-400 flex-shrink-0" size={24} />
         <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-lg">{t.whyCentralize}</h4>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t.whyCentralizeDesc}
            </p>
         </div>
      </div>
    </div>
  );
};

export default PlatformList;