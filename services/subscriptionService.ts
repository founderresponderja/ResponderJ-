import { loadStripe } from '@stripe/stripe-js';
import { PlanId } from '../types.js';
import { getCsrfToken } from '../utils/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export async function createCheckoutSession(payload: { clerkUserId?: string; email?: string; planId: PlanId }) {
  const csrfToken = await getCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const res = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível criar sessão de pagamento.');
  }

  return res.json();
}

export async function redirectToCheckout(url: string) {
  if (!url) throw new Error('URL de checkout em falta.');
  window.location.href = url;
}