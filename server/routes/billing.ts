
import type { Express } from "express";
import { BillingService } from "../services/billing-service.js";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
if (!STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY is not configured. Checkout will fail.");
}
const stripe = new Stripe(STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2025-07-30.basil" as any,
});

const getEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
};

export function registerBillingRoutes(app: any) {
  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
  };

  const CHECKOUT_PLANS: Record<string, { label: string; amount: number; description: string; envPriceKeys: string[] }> = {
    starter: {
      label: "Starter",
      amount: 1999,
      description: "50 respostas IA, 1 utilizador",
      envPriceKeys: ["STRIPE_PRICE_ID_STARTER", "STRIPE_STARTER_PRICE_ID"],
    },
    pro: {
      label: "Profissional",
      amount: 4999,
      description: "150 respostas IA, 1 utilizador, suporte prioritario",
      envPriceKeys: ["STRIPE_PRICE_ID_PRO", "STRIPE_PRO_PRICE_ID"],
    },
    agency: {
      label: "Agencia/Enterprise",
      amount: 14999,
      description: "500 respostas IA, 5 utilizadores, suporte prioritario",
      envPriceKeys: ["STRIPE_PRICE_ID_AGENCY", "STRIPE_AGENCY_PRICE_ID"],
    },
  };

  // GET /api/billing/me
  // Single source of truth for the frontend's subscription state.
  // Reads exclusively from the DB; Stripe is updated only via webhooks.
  app.get("/api/billing/me", requireAuth, async (req: any, res: any) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Plan capabilities (imported lazily to avoid circular deps at module load)
      const { PLAN_CAPABILITIES, normalizePlan } = await import("../../shared/planCapabilities.js");
      const planId = normalizePlan(user.subscriptionPlan || user.selectedPlan || "trial");
      const caps = PLAN_CAPABILITIES[planId];

      const creditsTotal = caps.maxResponses === -1 ? -1 : caps.maxResponses;
      const creditsRemaining = Number(user.credits ?? 0);
      const creditsUsedThisPeriod = Number(user.creditsUsedThisPeriod ?? 0);

      // Trial detection: only "trial" plan with a future trialEndsAt counts as trialing
      const trialEndsAt = user.currentPeriodEnd || null;
      const now = new Date();
      const isTrialing =
        planId === "trial" &&
        trialEndsAt instanceof Date
          ? trialEndsAt.getTime() > now.getTime()
          : planId === "trial" && trialEndsAt && new Date(trialEndsAt).getTime() > now.getTime();

      // Status: derive from the plan and Stripe subscription presence
      let status: "active" | "trial" | "expired" | "canceled" = "trial";
      if (user.isAdmin || user.isSuperAdmin) {
        // Administradores têm sempre acesso, sem subscrição Stripe.
        status = "active";
      } else if (planId !== "trial") {
        // Ativo com subscrição Stripe, ou até ao fim do período pago/atribuído
        // (plano dado pelo backoffice, ou subscrição cancelada que ainda não chegou ao fim).
        const periodEnd = user.currentPeriodEnd ? new Date(user.currentPeriodEnd).getTime() : 0;
        status = user.stripeSubscriptionId || periodEnd > now.getTime() ? "active" : "expired";
      } else if (!isTrialing) {
        status = "expired";
      }

      // Count connected social platforms for the current user (direct DB query)
      let platformsConnected = 0;
      try {
        const { db } = await import("../db.js");
        const { socialPlatformConnections } = await import("../../shared/schema.js");
        const { and, eq, sql } = await import("drizzle-orm");
        const result = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(socialPlatformConnections)
          .where(
            and(
              eq(socialPlatformConnections.userId, user.id),
              eq(socialPlatformConnections.status, "connected")
            )
          );
        platformsConnected = result[0]?.count ?? 0;
      } catch (e: any) {
        console.warn("[billing/me] could not count platforms:", e?.message);
      }

      const platformsLimit = caps.maxPlatforms === -1 ? -1 : caps.maxPlatforms;

      const { platformRole } = await import("../middleware/roles.js");
      return res.json({
        role: platformRole(user),
        planId,
        status,
        isTrialing: Boolean(isTrialing),
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        creditsRemaining,
        creditsTotal,
        creditsUsedThisPeriod,
        currentPeriodStart: user.currentPeriodStart ? new Date(user.currentPeriodStart).toISOString() : null,
        currentPeriodEnd: user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toISOString() : null,
        platformsConnected,
        platformsLimit,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        capabilities: {
          hasAnalytics: caps.hasAnalytics,
          hasAdvancedAnalytics: caps.hasAdvancedAnalytics,
          hasAgentTraining: caps.hasAgentTraining,
          hasAutoResponse: caps.hasAutoResponse,
          hasClientManagement: caps.hasClientManagement,
          hasWhiteLabel: caps.hasWhiteLabel,
        },
      });
    } catch (error: any) {
      console.error("[billing/me] error:", error?.message || error);
      return res.status(500).json({ message: "Failed to load subscription state" });
    }
  });

  // Criar subscrição
  app.post("/api/billing/subscription", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { planId, paymentMethodId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const result = await BillingService.createSubscription(userId, planId, paymentMethodId);
      res.json(result);
    } catch (error: any) {
      console.error("Erro ao criar subscrição:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Obter informações de billing
  app.get("/api/billing/info", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const billingInfo = await BillingService.getUserBillingInfo(userId);
      res.json(billingInfo);
    } catch (error: any) {
      console.error("Erro ao obter informações de billing:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook do Stripe para eventos de pagamento
  app.post("/api/billing/webhook", async (req: any, res: any) => {
    try {
      const signature = req.headers["stripe-signature"] as string | undefined;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!signature || !webhookSecret) {
        return res.status(400).json({ error: "Webhook signature/secret em falta." });
      }

      const payload = req.body;
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } catch (error: any) {
        console.error("[webhook] invalid signature:", error?.message);
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      // RJ-3.1: idempotência. Regista o evento; se já foi processado, não volta a processar.
      const { db } = await import("../db.js");
      const { stripeEvents } = await import("../../shared/schema.js");
      const { eq, sql } = await import("drizzle-orm");
      const [claimed] = await db.insert(stripeEvents)
        .values({ id: event.id, type: event.type })
        .onConflictDoNothing()
        .returning({ id: stripeEvents.id });
      if (!claimed) {
        const [prev] = await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id));
        const stuck = prev?.status === "processing" && Date.now() - new Date(prev.receivedAt).getTime() > 5 * 60000;
        if (prev?.status === "processed" || (prev?.status === "processing" && !stuck)) {
          console.log(`[webhook] duplicate ${event.type} ${event.id} (${prev?.status}); skipped`);
          return res.json({ received: true, duplicate: true });
        }
        // Falhou antes (ou ficou preso): o Stripe está a repetir, por isso tenta-se outra vez.
        await db.update(stripeEvents)
          .set({ status: "processing", attempts: sql`${stripeEvents.attempts} + 1`, error: null })
          .where(eq(stripeEvents.id, event.id));
      }

      // Objeto (não "let") para o TypeScript não estreitar o valor a null depois do switch.
      const outcome: { error: string | null } = { error: null };
      const fail = (where: string, error: any) => {
        outcome.error = `${where}: ${error?.message || error}`;
        console.error(`[webhook] ${where} failed:`, error);
      };

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          try {
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              await BillingService.syncSubscriptionToDatabase(subscription, { resetCreditsOnPlanChange: true });
            }
            console.log(`[webhook] checkout completed for customer ${session.customer}`);
          } catch (error: any) {
            fail("checkout.session.completed", error);
          }
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          try {
            await BillingService.syncSubscriptionToDatabase(subscription, { resetCreditsOnPlanChange: true });
          } catch (error: any) {
            fail("customer.subscription.created", error);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          try {
            await BillingService.syncSubscriptionToDatabase(subscription);
          } catch (error: any) {
            fail("customer.subscription.updated", error);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          try {
            await BillingService.handleSubscriptionDeleted(subscription);
          } catch (error: any) {
            fail("customer.subscription.deleted", error);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const failedInvoice = event.data.object as Stripe.Invoice;
          const failedSubscription = (failedInvoice as any).subscription;
          try {
            if (failedSubscription) {
              await BillingService.handlePaymentFailure(
                failedSubscription,
                failedInvoice.id,
                { message: "Pagamento falhado" }
              );
            }
          } catch (error: any) {
            fail("invoice.payment_failed", error);
          }
          break;
        }

        default:
          console.log("[webhook] unhandled event:", event.type);
      }

      // RJ-3.2: se o processamento falhou, devolve 500 para o Stripe voltar a tentar
      // (antes devolvia sempre 200 e o evento perdia-se).
      await db.update(stripeEvents)
        .set(outcome.error
          ? { status: "failed", error: outcome.error.slice(0, 1000) }
          : { status: "processed", processedAt: new Date() })
        .where(eq(stripeEvents.id, event.id));
      if (outcome.error) return res.status(500).json({ received: true, processed: false });
      res.json({ received: true, verified: true });
    } catch (error: any) {
      console.error("[webhook] unexpected error:", error);
      res.status(500).json({ error: "Webhook processing error" });
    }
  });

  // Listar planos disponíveis
  app.get("/api/billing/plans", async (req: any, res: any) => {
    try {
      res.json(BillingService.PAYMENT_PLANS);
    } catch (error: any) {
      console.error("Erro ao listar planos:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/billing/create-checkout-session", requireAuth, async (req: any, res: any) => {
    try {
      if (!STRIPE_SECRET_KEY) {
        console.error("[stripe] checkout error: STRIPE_SECRET_KEY is not configured");
        return res.status(500).json({
          error: "Stripe não está configurado no servidor. Contacta o suporte.",
          code: "stripe_not_configured",
        });
      }

      // Identity comes from the verified session, never from the request body (RJ-1.7).
      const clerkUserId = String(req.clerkUserId || "");
      const email = String(req.user?.email || "");
      const { planId } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório para criar checkout." });
      }
      if (!planId || !CHECKOUT_PLANS[planId]) {
        return res.status(400).json({ error: "Plano inválido para checkout." });
      }

      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const selectedPlan = CHECKOUT_PLANS[planId];
      const priceId = getEnv(...selectedPlan.envPriceKeys);

      console.log("[stripe] creating checkout session", {
        planId,
        priceIdResolved: !!priceId,
        priceIdPreview: priceId ? `${priceId.slice(0, 10)}...` : "inline_price_data_fallback",
        envKeysChecked: selectedPlan.envPriceKeys,
        liveMode: STRIPE_SECRET_KEY.startsWith("sk_live_"),
        testMode: STRIPE_SECRET_KEY.startsWith("sk_test_"),
        baseUrl,
      });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: email,
        metadata: {
          clerkUserId: clerkUserId || "",
          planId: planId || "",
        },
        line_items: priceId
          ? [{ price: priceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: "eur",
                  product_data: {
                    name: `Responder Já ${selectedPlan.label}`,
                    description: selectedPlan.description,
                  },
                  recurring: {
                    interval: "month",
                  },
                  unit_amount: selectedPlan.amount,
                },
                quantity: 1,
              },
            ],
        success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?checkout=cancelled`,
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      // Detailed Stripe error logging (type, code, param and request id are the fields
      // Stripe enriches its errors with; they are invaluable when diagnosing 4xx replies).
      console.error("[stripe] checkout error:", error?.message, error?.type, {
        code: error?.code,
        param: error?.param,
        statusCode: error?.statusCode,
        requestId: error?.requestId,
        raw: error?.raw,
      });
      res.status(500).json({
        error: error?.message || "Não foi possível criar sessão de pagamento.",
        code: error?.code,
        type: error?.type,
      });
    }
  });

  app.get("/api/billing/subscription-status", requireAuth, async (req: any, res: any) => {
    try {
      // Only the caller's own status (RJ-1.7): it used to accept any email or Clerk id
      // in the query string and reveal whether that person was a customer and on which plan.
      const clerkUserId = String(req.clerkUserId || "") || undefined;
      const email = String(req.user?.email || "") || undefined;
      if (!email && !clerkUserId) {
        return res.json({ active: false, status: "trial", planId: "trial" });
      }

      // Quick DB lookup first to avoid slow Stripe round-trips on cold starts.
      const dbUser = email ? await storage.getUserByEmail(email) : undefined;
      const dbPlan = dbUser?.subscriptionPlan || dbUser?.selectedPlan || "trial";

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.json({
          active: dbPlan !== "trial" && dbPlan !== "free",
          status: dbPlan === "free" ? "trial" : dbPlan,
          planId: dbPlan,
          source: "database_fallback_no_stripe",
        });
      }

      const customers = await withTimeout(
        email
          ? stripe.customers.list({ email, limit: 1 })
          : stripe.customers.list({ limit: 20 }),
        2000,
        "stripe.customers.list"
      );

      const candidateCustomer = customers.data.find((customer) => {
        const sameEmail = email ? customer.email === email : true;
        const sameClerkUser = clerkUserId ? customer.metadata?.clerkUserId === clerkUserId : true;
        return sameEmail && sameClerkUser;
      });

      if (!candidateCustomer) {
        if (!dbUser) {
          return res.json({ active: false, status: "trial", planId: "trial" });
        }
        return res.json({
          active: dbPlan !== "trial" && dbPlan !== "free",
          status: dbPlan === "free" ? "trial" : dbPlan,
          planId: dbPlan,
          source: "database_fallback",
        });
      }

      const subscriptions = await withTimeout(
        stripe.subscriptions.list({
          customer: candidateCustomer.id,
          status: "all",
          limit: 10,
        }),
        2000,
        "stripe.subscriptions.list"
      );

      const activeSub = subscriptions.data.find((sub) => sub.status === "active" || sub.status === "trialing");
      if (!activeSub) {
        return res.json({ active: false, status: "trial", planId: "trial" });
      }

      res.json({
        active: true,
        status: activeSub.status,
        subscriptionId: activeSub.id,
      });
    } catch (error: any) {
      console.error("Erro ao validar subscricao:", {
        message: error?.message,
        stack: error?.stack,
        type: error?.type,
        raw: error,
      });
      try {
        const email = req.query?.email as string | undefined;
        const dbUser = email ? await storage.getUserByEmail(email) : undefined;
        const planId = dbUser?.subscriptionPlan || dbUser?.selectedPlan || "trial";
        return res.json({
          active: planId !== "trial" && planId !== "free",
          status: planId === "free" ? "trial" : planId,
          planId,
          source: "error_fallback",
          error: error?.message || "subscription_status_failed",
        });
      } catch {
        return res.json({ active: false, status: "trial", planId: "trial", source: "safe_fallback" });
      }
    }
  });
}