import { useAuth } from '@clerk/expo';
import { useCallback } from 'react';

// O servidor é o mesmo do site. Pode ser trocado em .env (EXPO_PUBLIC_API_URL) para testes.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.responderja.pt/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Pedidos à API com o token do Clerk em `Authorization: Bearer …`,
 * que o `requireAuth` do servidor já aceita (server/auth.ts).
 */
export function useApi() {
  const { getToken } = useAuth();

  return useCallback(
    async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
      const text = await res.text();
      const data = text ? safeJson(text) : null;
      if (!res.ok) {
        const message = (data as { message?: string } | null)?.message || `Erro ${res.status}`;
        throw new ApiError(res.status, message);
      }
      return data as T;
    },
    [getToken],
  );
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
