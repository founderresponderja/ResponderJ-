import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { buildAuthHeaders } from '../utils/api';

interface UseResponseActionsOptions {
  onSuccess?: () => void | Promise<void>;
}

interface UseResponseActionsResult {
  accept: (responseId: number, responseText?: string) => Promise<Record<string, unknown> | null>;
  discard: (responseId: number) => Promise<Record<string, unknown> | null>;
  regenerate: (responseId: number) => Promise<Record<string, unknown> | null>;
  isWorking: boolean;
}

export function useResponseActions(
  options: UseResponseActionsOptions = {}
): UseResponseActionsResult {
  const { getToken } = useAuth();
  const [isWorking, setIsWorking] = useState(false);

  async function call(
    responseId: number,
    action: 'accept' | 'discard' | 'regenerate',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const labels: Record<typeof action, string> = {
      accept: 'aceitar resposta',
      discard: 'descartar resposta',
      regenerate: 'refazer resposta',
    };
    setIsWorking(true);
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch(`/api/responses/${responseId}/${action}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || `Falha ao ${labels[action]}`);
        return null;
      }
      const data = await res.json();
      if (options.onSuccess) await options.onSuccess();
      return data;
    } catch (e) {
      console.error(`[useResponseActions.${action}] error:`, e);
      alert(`Erro de rede ao ${labels[action]}`);
      return null;
    } finally {
      setIsWorking(false);
    }
  }

  return {
    accept: (id, text) =>
      call(id, 'accept', text ? { responseText: text } : undefined),
    discard: (id) => call(id, 'discard'),
    regenerate: (id) => call(id, 'regenerate'),
    isWorking,
  };
}
