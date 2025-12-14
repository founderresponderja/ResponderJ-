import Stripe from 'stripe';
import { storage } from "../storage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-07-30.basil' as any,
});

export const BillingService = {
  PAYMENT_PLANS: {
    trial: { id: 'trial', name: 'Trial', price: 0, credits: 10 },
    starter: { id: 'starter', name: 'Starter', price: 19.99, credits: 100 },
    pro: { id: 'pro', name: 'Professional', price: 49.99, credits: 500 },
    agency: { id: 'agency', name: 'Agency', price: 149.99, credits: 2000 }
  },

  async createSubscription(userId: string, planId: string, paymentMethodId: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user) throw new Error("User not found");

      let customerId = (user as any).stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          payment_method: paymentMethodId,
          invoice_settings: { default_payment_method: paymentMethodId }
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
      } else {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId }
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: this.getPriceId(planId) }],
        expand: ['latest_invoice.payment_intent']
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any).payment_intent?.client_secret,
        status: subscription.status
      };
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      throw new Error(error.message);
    }
  },

  async getUserBillingInfo(userId: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user) throw new Error("User not found");

      const subscription = await storage.getUserSubscription(userId);
      const invoices = await this.getUserInvoices(userId);

      return {
        subscription,
        invoices,
        credits: user.credits,
        plan: user.selectedPlan
      };
    } catch (error: any) {
      console.error("Error getting billing info:", error);
      throw new Error(error.message);
    }
  },

  async handleSuccessfulPayment(subscriptionId: string, invoiceId: string) {
    // Update subscription status
    // Add credits to user
    console.log(`Payment successful for subscription ${subscriptionId}, invoice ${invoiceId}`);
  },

  async handlePaymentFailure(subscriptionId: string, invoiceId: string, error: any) {
    console.error(`Payment failed for subscription ${subscriptionId}:`, error);
    // Update subscription status to past_due or canceled
  },

  async getUserInvoices(userId: string) {
    // Mock invoices for now
    return [];
  },

  getPriceId(planId: string) {
    // In production, map planIds to real Stripe Price IDs
    const priceMap: Record<string, string> = {
      'starter': process.env.STRIPE_PRICE_STARTER || 'price_starter_mock',
      'pro': process.env.STRIPE_PRICE_PRO || 'price_pro_mock',
      'agency': process.env.STRIPE_PRICE_AGENCY || 'price_agency_mock'
    };
    return priceMap[planId] || 'price_mock';
  }
};