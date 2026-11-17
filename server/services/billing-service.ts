import Stripe from "stripe";
import { PLANS } from "../../shared/plans.js";
import { storage } from "../storage.js";
import { resolvePaidPlan, computeSubscriptionSync, subscriptionDeletedUpdate, subscriptionAccess } from "./billing-logic.js";
import { sendMail } from "./mailer.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2025-07-30.basil" as any,
});

const getEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
};

export class BillingService {
  // RJ-2.1: derivado de shared/plans.ts (fonte única).
  static PAYMENT_PLANS = Object.fromEntries(
    (["starter", "pro", "agency"] as const).map((key) => {
      const p = PLANS[key];
      return [key, {
        id: key,
        name: p.label,
        priceId: getEnv(...(p.stripePriceEnv as [string, string])) || `price_${key}`,
        price: p.priceEur,
        currency: "eur",
        credits: p.monthlyResponses,
        locations: p.maxEstablishments,
        users: p.users,
        byokSupported: false,
        features: p.marketing.bullets,
      }];
    }),
  ) as Record<"starter" | "pro" | "agency", {
    id: string; name: string; priceId: string; price: number; currency: string; credits: number;
    locations: number; users: number; byokSupported: boolean; features: string[];
  }>;

  static async createSubscription(userId: string, planId: string, paymentMethodId: string) {
    const plan = this.PAYMENT_PLANS[planId as keyof typeof this.PAYMENT_PLANS];
    if (!plan) {
      throw new Error("Plano inválido");
    }

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("Utilizador não encontrado");
    }

    // Criar customer no Stripe se não existir
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      customerId = customer.id;
      await storage.updateUserStripeCustomerId(userId, customerId);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user subscription info
    await storage.updateUserStripeInfo(userId, { customerId, subscriptionId: subscription.id });
    await storage.updateUser(userId, { subscriptionPlan: planId });

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status
    };
  }

  static async getUserBillingInfo(userId: string) {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("Utilizador não encontrado");
    }

    let subscriptionData = null;
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const subscriptionAny = subscription as any;
        subscriptionData = {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscriptionAny.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan: this.PAYMENT_PLANS[user.subscriptionPlan as keyof typeof this.PAYMENT_PLANS]
        };
      } catch (error) {
        console.error("Erro ao obter subscrição do Stripe:", error);
      }
    }

    // Obter invoices recentes
    let invoices = [];
    if (user.stripeCustomerId) {
      try {
        const invoiceList = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 10
        });
        invoices = invoiceList.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000),
          invoiceUrl: invoice.hosted_invoice_url
        }));
      } catch (error) {
        console.error("Erro ao obter invoices:", error);
      }
    }

    return {
      subscription: subscriptionData,
      invoices,
      availablePlans: this.PAYMENT_PLANS,
      currentPlan: user.subscriptionPlan || null,
      credits: user.credits || 0
    };
  }

  /**
   * Encontra o utilizador de uma subscrição: primeiro pelo cliente Stripe já ligado; senão pelo
   * userId que o checkout escreve nos metadados da subscrição (RJ-6.3). Sem isto, o primeiro
   * pagamento nunca chegava ao utilizador: o checkout cria um cliente Stripe novo, que ainda não
   * estava guardado em nenhum utilizador, e o plano ficava por aplicar.
   */
  static async findUserForSubscription(customerId: string, metadata?: Record<string, string> | null) {
    const byCustomer = await storage.getUserByStripeCustomerId(customerId);
    if (byCustomer) return byCustomer;
    const metaUserId = Number(metadata?.userId);
    if (Number.isInteger(metaUserId) && metaUserId > 0) {
      const byId = await storage.getUser(metaUserId);
      if (byId && (!byId.stripeCustomerId || byId.stripeCustomerId === customerId)) return byId;
    }
    return undefined;
  }

  /**
   * Aplica uma subscrição do Stripe ao utilizador.
   * Erros de base de dados e preços desconhecidos são lançados (RJ-6.3): o webhook marca o evento
   * como falhado e devolve 500, e o Stripe volta a tentar. Antes eram engolidos e o evento ficava
   * "processado" sem o cliente receber o plano.
   */
  static async syncSubscriptionToDatabase(
    subscription: Stripe.Subscription,
    options?: { resetCreditsOnPlanChange?: boolean }
  ): Promise<{ updated: boolean; userId?: number; planId?: string; reason?: string }> {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as any)?.id;
    if (!customerId) {
      console.warn("[billing.sync] missing subscription.customer");
      return { updated: false, reason: "no_customer" };
    }

    const metadata = ((subscription as any).metadata || {}) as Record<string, string>;
    const user = await this.findUserForSubscription(customerId, metadata);
    if (!user) {
      // Não é erro do nosso lado: pode ser um cliente criado fora da app. Fica registado.
      console.warn("[billing.sync] user not found for customer:", customerId);
      return { updated: false, reason: "user_not_found" };
    }

    const priceId = subscription.items?.data?.[0]?.price?.id;
    const { planId, via } = resolvePaidPlan({ priceId, metadataPlanId: metadata.planId, env: process.env });
    if (!planId) {
      throw new Error(
        `Preço desconhecido ${priceId} na subscrição ${subscription.id} (utilizador ${user.id}). ` +
        `Configure o price ID em STRIPE_PRICE_ID_*.`,
      );
    }
    if (via === "metadata") {
      console.warn(`[billing.sync] plan ${planId} resolved from checkout metadata (price ${priceId} not configured)`);
    }

    // RJ-3.2: estado da subscrição. Cancelada / não paga -> perde o plano (se for a atual);
    // primeiro pagamento por confirmar -> ainda não dá o plano.
    const access = subscriptionAccess(subscription.status);
    const statusFields = {
      subscriptionStatus: subscription.status,
      cancelAtPeriodEnd: Boolean((subscription as any).cancel_at_period_end),
    };
    if (access === "revoke") {
      if (!user.stripeSubscriptionId || user.stripeSubscriptionId === subscription.id) {
        await storage.updateUser(user.id, { ...subscriptionDeletedUpdate(), ...statusFields } as any);
        return { updated: true, userId: user.id, reason: `revoked_${subscription.status}` };
      }
      return { updated: false, userId: user.id, reason: "old_subscription" };
    }
    if (access === "pending") {
      await storage.updateUser(user.id, { stripeCustomerId: user.stripeCustomerId || customerId, ...statusFields } as any);
      return { updated: false, userId: user.id, reason: "payment_pending" };
    }

    const subAny = subscription as any;
    const result = computeSubscriptionSync(
      user,
      {
        id: subscription.id,
        customerId,
        currentPeriodStart: subAny.current_period_start ?? subAny.items?.data?.[0]?.current_period_start ?? null,
        currentPeriodEnd: subAny.current_period_end ?? subAny.items?.data?.[0]?.current_period_end ?? null,
      },
      planId,
      options,
    );
    if (result.skip) {
      // Mesmo plano e período, mas o estado pode ter mudado (ex.: cancelamento agendado, pagamento em atraso).
      if ((user as any).subscriptionStatus !== statusFields.subscriptionStatus || Boolean((user as any).cancelAtPeriodEnd) !== statusFields.cancelAtPeriodEnd) {
        await storage.updateUser(user.id, statusFields as any);
        return { updated: true, userId: user.id, planId, reason: "status_changed" };
      }
      return { updated: false, userId: user.id, planId, reason: "unchanged" };
    }

    if (result.planChanged) {
      console.log(`[billing.sync] plan changed for user ${user.id}: ${user.subscriptionPlan} -> ${planId}`);
    }
    await storage.updateUser(user.id, { ...result.update, ...statusFields } as any);
    return { updated: true, userId: user.id, planId };
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as any)?.id;
    if (!customerId) {
      console.warn("[billing.subscription_deleted] missing subscription.customer");
      return;
    }
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.warn("[billing.subscription_deleted] user not found for customer:", customerId);
      return;
    }
    // Só desliga se for a subscrição atual do utilizador (uma antiga cancelada não lhe tira o plano).
    if (user.stripeSubscriptionId && user.stripeSubscriptionId !== subscription.id) {
      console.log(`[billing.subscription_deleted] ignoring old subscription ${subscription.id} for user ${user.id}`);
      return;
    }
    // RJ-6.3: erros de base de dados são lançados para o Stripe repetir (antes eram engolidos).
    await storage.updateUser(user.id, { ...subscriptionDeletedUpdate(), subscriptionStatus: "canceled", cancelAtPeriodEnd: false } as any);
    console.log(`[billing.subscription_deleted] user ${user.id} reverted to trial`);
  }

  /**
   * RJ-3.2: pagamento de renovação falhou. Antes só escrevia no registo e engolia erros.
   * Agora: guarda o estado (past_due) e avisa o cliente por email, com o caminho para
   * atualizar o cartão. O plano mantém-se enquanto o Stripe volta a tentar (período de graça);
   * se as tentativas acabarem, chega customer.subscription.updated/deleted e o plano sai.
   * Erros de base de dados são lançados para o Stripe repetir o aviso.
   */
  static async handlePaymentFailure(subscriptionId: string | any, invoiceId: string, _error: any) {
    const subId = typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;
    const subscription = await stripe.subscriptions.retrieve(subId);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : (subscription.customer as any)?.id;
    const user = customerId ? await storage.getUserByStripeCustomerId(customerId) : undefined;
    if (!user) {
      console.warn("[billing.payment_failed] user not found for customer:", customerId);
      return;
    }
    await storage.updateUser(user.id, { subscriptionStatus: subscription.status } as any);
    if (user.email) {
      const base = process.env.APP_BASE_URL || "https://www.responderja.pt";
      const sent = await sendMail({
        to: user.email,
        subject: "O pagamento da sua subscrição falhou",
        text:
          `Olá${user.firstName ? ` ${user.firstName}` : ""},\n\n` +
          `Não conseguimos cobrar a renovação da sua subscrição da Responder Já (fatura ${invoiceId}).\n\n` +
          `O seu plano continua ativo enquanto voltamos a tentar nos próximos dias. Para evitar a interrupção, ` +
          `atualize o cartão em ${base} → Planos → "Gerir subscrição e pagamento".\n\nEquipa Responder Já`,
      });
      if (!sent.ok) console.warn("[billing.payment_failed] email failed:", sent.error);
    }
  }

  static async cancelSubscription(userId: string) {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      throw new Error("Nenhuma subscrição activa encontrada");
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return {
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
    };
  }

  static async reactivateSubscription(userId: string) {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      throw new Error("Nenhuma subscrição encontrada");
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return {
      success: true,
      status: subscription.status
    };
  }
}
