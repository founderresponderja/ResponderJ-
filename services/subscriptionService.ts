import { loadStripe } from '@stripe/stripe-js';
import { PlanId } from '../types.js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Obtém um token CSRF fresco antes de qualquer POST protegido. Mantemos
// esta implementação local (não partilhada com geminiService.ts) para
// evitar importações cruzadas entre services.
async function getCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/csrf-token');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.csrfToken || null;
  } catch (e) {
    console.warn('[checkout] could not fetch CSRF token', e);
    return null;
  }
}

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

export async function redirectToCheckout(url: string) {
  if (!url) throw new Error('URL de checkout em falta.');
  window.location.href = url;
}