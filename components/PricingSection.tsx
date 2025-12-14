import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Plan, PlanId } from '../types';
import { translations, Language } from '../utils/translations';

interface PricingSectionProps {
  lang: Language;
  onSelectPlan?: (planId: PlanId) => void;
  currentPlanId?: PlanId;
  isProcessing?: boolean;
}

const plans: Plan[] = [
  { id: 'trial', price: 0, credits: 10, users: 1, nameKey: 'trial' },
  { id: 'regular', price: 19.99, credits: 50, users: 1, nameKey: 'regular', highlight: true },
  { id: 'pro', price: 49.99, credits: 150, users: 1, nameKey: 'pro' },
  { id: 'agency', price: 149.99, credits: 500, users: 5, nameKey: 'agency' },
];

const PricingSection: React.FC<PricingSectionProps> = ({ lang, onSelectPlan, currentPlanId, isProcessing }) => {
  const t = translations[lang].pricing;

  return (
    <section id="pricing" className="py-12 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {translations[lang].landing.pricingTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {translations[lang].landing.pricingDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col h-full transition-all duration-300 ${
                plan.highlight 
                  ? 'bg-white dark:bg-slate-900 border-2 border-brand-500 shadow-xl scale-105 z-10' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {(t[plan.nameKey as keyof typeof t] as string) || plan.id}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {plan.price === 0 ? 'Grátis' : `€${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-slate-500 dark:text-slate-400 text-sm">{t.month}</span>
                  )}
                </div>
              </div>

              <div className="flex-grow space-y-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check size={16} className="text-brand-500 flex-shrink-0" />
                  <span>
                    <strong>{plan.credits}</strong> {t.features.responses}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check size={16} className="text-brand-500 flex-shrink-0" />
                  <span>
                    <strong>{plan.users}</strong> {t.features.users}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check size={16} className="text-brand-500 flex-shrink-0" />
                  <span>{t.features.dashboard}</span>
                </div>
                {plan.price > 20 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="text-brand-500 flex-shrink-0" />
                    <span>{t.features.support}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                disabled={currentPlanId === plan.id || isProcessing}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  currentPlanId === plan.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                    : plan.highlight
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
                }`}
              >
                {isProcessing && currentPlanId !== plan.id ? ( // Show loader only if processing this specific card actions ideally, but for now global is ok or simplistic
                   <Loader2 className="animate-spin" size={16} />
                ) : null}
                
                {currentPlanId === plan.id 
                  ? t.cta.current 
                  : t.cta.choose}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;