import { loadStripe } from '@stripe/stripe-js';
import { PlanId } from '../types.js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export async function createCheckoutSession(payload: { clerkUserId?: string; email?: string; planId: PlanId }) {
  const res = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível criar sessão de pagamento.');
  }

  return res.json();
}

export async function getSubscriptionStatus(clerkUserId?: string, email?: string) {
  const query = new URLSearchParams();
  if (clerkUserId) query.set('clerkUserId', clerkUserId);
  if (email) query.set('email', email);

  const res = await fetch(`/api/billing/subscription-status?${query.toString()}`);
  if (!res.ok) {
    return { active: false };
  }
  return res.json();
}

export async function redirectToCheckout(sessionId: string) {
  const stripe = await stripePromise;
  if (!stripe) throw new Error('Stripe não inicializado. Verifica VITE_STRIPE_PUBLISHABLE_KEY.');
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) throw new Error(error.message);
}
