// RJ-3.3: que emails de ciclo de vida cada cliente deve receber (sem base de dados nem rede;
// testado em tests/lifecycle-logic.test.ts). O envio está em lifecycle-emails.ts e corre no
// agendamento diário.

import { PLANS, normalizePlan } from "../../shared/plans.js";

export type LifecycleKind = "trial_ending" | "trial_expired" | "low_credits";

export interface LifecycleUser {
  email?: string | null;
  isActive?: boolean | null;
  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;
  isSandbox?: boolean | null;
  subscriptionPlan?: string | null;
  selectedPlan?: string | null;
  credits?: number | null;
  currentPeriodEnd?: Date | string | null;
}

const DAY = 24 * 3600 * 1000;

/** Limite de "poucos créditos": 10% das respostas do plano, no mínimo 5. */
export function lowCreditsThreshold(plan: string): number {
  const monthly = PLANS[normalizePlan(plan)].monthlyResponses;
  if (monthly === -1) return 0;
  return Math.max(5, Math.ceil(monthly * 0.1));
}

/**
 * Emails a enviar hoje. "ref" identifica o período, para cada email sair uma só vez por período
 * (o agendamento corre todos os dias).
 */
export function lifecycleEmailsFor(user: LifecycleUser, now: Date = new Date()): Array<{ kind: LifecycleKind; ref: string }> {
  const email = String(user.email || "");
  if (!email || email.endsWith(".invalid") || user.isActive === false || user.isAdmin || user.isSuperAdmin || user.isSandbox) return [];
  if (!user.currentPeriodEnd) return [];
  const end = new Date(user.currentPeriodEnd);
  if (!Number.isFinite(end.getTime())) return [];
  const ref = end.toISOString().slice(0, 10);
  const plan = normalizePlan(user.subscriptionPlan || user.selectedPlan);
  const left = end.getTime() - now.getTime();
  const out: Array<{ kind: LifecycleKind; ref: string }> = [];

  if (plan === "trial") {
    if (left > 0 && left <= 2 * DAY) out.push({ kind: "trial_ending", ref });
    if (left <= 0 && left > -2 * DAY) out.push({ kind: "trial_expired", ref });
    return out;
  }
  const threshold = lowCreditsThreshold(plan);
  if (left > 0 && threshold > 0 && Number(user.credits ?? 0) <= threshold) out.push({ kind: "low_credits", ref });
  return out;
}

const fmt = (d: Date) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "long" }).format(d);

export function lifecycleEmailContent(kind: LifecycleKind, user: { firstName?: string | null; credits?: number | null; currentPeriodEnd?: Date | string | null }, baseUrl: string) {
  const hi = `Olá${user.firstName ? ` ${user.firstName}` : ""},`;
  const end = user.currentPeriodEnd ? fmt(new Date(user.currentPeriodEnd)) : "";
  switch (kind) {
    case "trial_ending":
      return {
        subject: "O seu período de teste termina em breve",
        text: `${hi}\n\nO seu período de teste da Responder Já termina a ${end}. Para continuar a responder às reviews sem interrupção, escolha um plano em ${baseUrl} → Planos.\n\nEquipa Responder Já`,
      };
    case "trial_expired":
      return {
        subject: "O seu período de teste terminou",
        text: `${hi}\n\nO seu período de teste terminou. As suas reviews, respostas e definições continuam guardadas: basta escolher um plano em ${baseUrl} → Planos para continuar.\n\nEquipa Responder Já`,
      };
    case "low_credits":
      return {
        subject: "Está a ficar sem respostas este mês",
        text: `${hi}\n\nRestam ${Number(user.credits ?? 0)} respostas no seu plano até ${end}. Se precisar de mais, pode mudar de plano em ${baseUrl} → Planos → "Gerir subscrição e pagamento".\n\nEquipa Responder Já`,
      };
  }
}
