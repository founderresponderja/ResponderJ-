// RJ-8.2: agrupar erros iguais (sem base de dados; testado em tests/error-tracking-logic.test.ts).
import crypto from "node:crypto";

/** Tira de uma mensagem/caminho o que muda de ocorrência para ocorrência (ids, números, emails, tokens). */
export function normalizeForGrouping(text: string): string {
  return String(text || "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":uuid")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ":email")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, ":token")
    .replace(/\d+/g, ":n")
    .slice(0, 300);
}

export function errorFingerprint(input: { source: string; kind: string; message: string; path?: string | null }): string {
  const key = [input.source, input.kind, normalizeForGrouping(input.message), normalizeForGrouping(input.path || "")].join("|");
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 32);
}

/** Corta e limpa o que vem do navegador (não confiamos no tamanho nem no conteúdo). */
export function sanitizeClientError(body: any) {
  const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  return {
    kind: ["error", "unhandledrejection", "react"].includes(body?.kind) ? String(body.kind) : "error",
    message: clip(body?.message, 500) || "(sem mensagem)",
    stack: clip(body?.stack, 4000),
    path: clip(body?.path, 300),
    userAgent: clip(body?.userAgent, 300),
  };
}

/** Só caminhos da API entram no registo de respostas 500 (as páginas são servidas pela Vercel). */
export function shouldRecordStatus(status: number, path: string): boolean {
  return status >= 500 && path.startsWith("/api/") && !path.startsWith("/api/client-errors");
}
