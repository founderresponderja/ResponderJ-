import type { Express } from "express";
import { BillingService } from "../services/billing-service";
import { requireAuth } from "../auth";

export function registerBillingRoutes(app: Express) {
  // Criar subscrição
  app.post("/api/billing/subscription", requireAuth, async (req: any, res) => {
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
  app.get("/api/billing/info", requireAuth, async (req: any, res) => {
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
  app.post("/api/billing/webhook", async (req: any, res) => {
    try {
      const event = req.body;

      switch (event.type) {
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          const subscription = invoice.subscription;
          
          if (subscription) {
            await BillingService.handleSuccessfulPayment(subscription, invoice.id);
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          const failedSubscription = failedInvoice.subscription;
          
          if (failedSubscription) {
            await BillingService.handlePaymentFailure(
              failedSubscription,
              failedInvoice.id,
              { message: "Pagamento falhado" }
            );
          }
          break;

        default:
          console.log(`Evento não tratado: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Erro no webhook:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Listar planos disponíveis
  app.get("/api/billing/plans", async (req: any, res) => {
    try {
      res.json(BillingService.PAYMENT_PLANS);
    } catch (error: any) {
      console.error("Erro ao listar planos:", error);
      res.status(500).json({ error: error.message });
    }
  });
}