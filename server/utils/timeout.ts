// RJ-8.3: limitar o tempo de chamadas externas. A função da Vercel morre aos 30 s (vercel.json)
// e, se morrer, a pessoa recebe um erro 504 sem mensagem. Com um limite próprio, respondemos
// antes disso com uma mensagem clara (ou tentamos o modelo de reserva a tempo).
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label}: sem resposta em ${Math.round(ms / 1000)} s`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label = "operação"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** Tempo que ainda resta até um prazo, com uma margem de segurança (nunca negativo). */
export function remainingMs(deadline: number, now = Date.now(), marginMs = 1500): number {
  return Math.max(0, deadline - now - marginMs);
}

/** Repete uma operação que falha à primeira (ex.: base de dados Neon a "acordar"). */
export async function retryOnce<T>(fn: () => Promise<T>, waitMs = 800): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, waitMs));
    return fn();
  }
}
