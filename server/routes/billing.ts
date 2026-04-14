
import type { Express } from "express";
import { BillingService } from "../services/billing-service.js";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import Stripe from "stripe";

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

export function registerBillingRoutes(app: any) {
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
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = (invoice as any).subscription;
          
          if (subscription) {
            await BillingService.handleSuccessfulPayment(subscription, invoice.id);
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          const failedSubscription = (failedInvoice as any).subscription;
          
          if (failedSubscription) {
            await BillingService.handlePaymentFailure(
              failedSubscription,
              failedInvoice.id,
              { message: "Pagamento falhado" }
            );
          }
          break;

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log("Checkout concluido:", {
            sessionId: session.id,
            customer: session.customer,
            subscription: session.subscription,
            email: session.customer_details?.email,
          });
          break;
        }

        default:
          console.log(`Evento não tratado: ${event.type}`);
      }

      res.json({ received: true, verified: true });
    } catch (error: any) {
      console.error("Erro no webhook (assinatura inválida ou payload inválido):", error);
      res.status(400).json({ error: error.message || "Invalid webhook signature" });
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

  app.post("/api/billing/create-checkout-session", async (req: any, res: any) => {
    try {
      const { clerkUserId, email, planId } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: "Email e obrigatorio para criar checkout." });
      }
      if (!planId || !CHECKOUT_PLANS[planId]) {
        return res.status(400).json({ error: "Plano invalido para checkout." });
      }

      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const selectedPlan = CHECKOUT_PLANS[planId];
      const priceId = getEnv(...selectedPlan.envPriceKeys);

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
                    name: `Responder Ja ${selectedPlan.label}`,
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
      console.error("Erro ao criar checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/billing/subscription-status", async (req: any, res: any) => {
    try {
      const clerkUserId = req.query?.clerkUserId as string | undefined;
      const email = req.query?.email as string | undefined;
      console.log("[billing/subscription-status] start", {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasEmail: !!email,
        hasClerkUserId: !!clerkUserId,
      });
      if (!email && !clerkUserId) {
        return res.json({ active: false, status: "trial", planId: "trial" });
      }

      const customers = email
        ? await stripe.customers.list({ email, limit: 1 })
        : await stripe.customers.list({ limit: 20 });

      const candidateCustomer = customers.data.find((customer) => {
        const sameEmail = email ? customer.email === email : true;
        const sameClerkUser = clerkUserId ? customer.metadata?.clerkUserId === clerkUserId : true;
        return sameEmail && sameClerkUser;
      });

      if (!candidateCustomer) {
        const dbUser = email ? await storage.getUserByEmail(email) : undefined;
        if (!dbUser) {
          return res.json({ active: false, status: "trial", planId: "trial" });
        }
        const userPlan = dbUser.subscriptionPlan || dbUser.selectedPlan || "trial";
        return res.json({
          active: userPlan !== "trial" && userPlan !== "free",
          status: userPlan === "free" ? "trial" : userPlan,
          planId: userPlan,
          source: "database_fallback",
        });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: candidateCustomer.id,
        status: "all",
        limit: 10,
      });

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