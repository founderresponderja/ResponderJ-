import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PlanId } from '../types';
import { PLANS, PLAN_KEYS, formatPriceEur } from '../shared/plans';

interface PricingPageProps {
  isLoading?: boolean;
  onSelectPlan: (planId: PlanId) => void;
  error?: string | null;
}

// RJ-2.1: textos e preços vêm de shared/plans.ts (a mesma tabela que o servidor usa).
const plans = PLAN_KEYS.map((key) => ({
  id: key as PlanId,
  title: PLANS[key].label,
  priceLabel: formatPriceEur(PLANS[key].priceEur),
  subtitle: PLANS[key].marketing.subtitle,
  features: PLANS[key].marketing.bullets,
  highlight: PLANS[key].marketing.highlight ?? false,
}));

const PricingPage: React.FC<PricingPageProps> = ({ isLoading, onSelectPlan, error }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">Escolhe o teu plano</h1>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-10">
          Subscrição mensal via Stripe. O Trial entra sem cartão.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border bg-white dark:bg-slate-900 shadow-sm ${
                plan.highlight ? 'border-brand-500 shadow-lg' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <h3 className="text-lg font-bold mb-2">{plan.title}</h3>
              <p className="text-2xl font-extrabold mb-1">{plan.priceLabel}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{plan.subtitle}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-brand-600" /> {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onSelectPlan(plan.id)}
                disabled={isLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> A processar...</> : 'Selecionar Plano'}
              </button>
            </div>
          ))}
        </div>

        {error ? (
          <p className="text-red-600 dark:text-red-400 text-sm mt-4 text-center">{error}</p>
        ) : null}
      </div>
    </div>
  );
};

export default PricingPage;
