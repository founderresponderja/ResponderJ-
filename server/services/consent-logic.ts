// RJ-7.2: regras do registo de consentimentos (sem base de dados; testado em tests/consent-logic.test.ts).
import crypto from "node:crypto";
import { LEGAL_VERSIONS, REQUIRED_DOCUMENTS, type LegalDocument } from "../../shared/legal-versions.js";

export interface ConsentRow { kind: string; version: string; granted: boolean; createdAt: string | Date }

/** Documentos obrigatórios que a pessoa ainda não aceitou na versão em vigor. */
export function pendingDocuments(rows: ConsentRow[], versions: Record<string, string> = LEGAL_VERSIONS): LegalDocument[] {
  return REQUIRED_DOCUMENTS.filter((doc) => {
    const latest = rows
      .filter((r) => r.kind === doc)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return !latest || !latest.granted || latest.version !== versions[doc];
  });
}

/** Só aceita documentos conhecidos e regista sempre a versão em vigor (nunca a que vem do navegador). */
export function acceptedRecords(kinds: unknown): { kind: LegalDocument; version: string }[] {
  const list = Array.isArray(kinds) ? kinds : [];
  const known = Object.keys(LEGAL_VERSIONS) as LegalDocument[];
  return [...new Set(list.map(String))]
    .filter((k): k is LegalDocument => (known as string[]).includes(k))
    .map((kind) => ({ kind, version: LEGAL_VERSIONS[kind] }));
}

/** O IP não fica guardado em claro: só uma impressão (prova sem expor o endereço). */
export function hashIp(ip: string, salt = process.env.CONSENT_IP_SALT || "responder-ja"): string | null {
  const clean = String(ip || "").split(",")[0].trim();
  if (!clean) return null;
  return crypto.createHash("sha256").update(`${salt}|${clean}`).digest("hex").slice(0, 32);
}

/** Escolhas de cookies normalizadas (os essenciais estão sempre ligados). */
export function cookieChoices(body: any) {
  return {
    essential: true,
    functional: Boolean(body?.functional),
    analytics: Boolean(body?.analytics),
    marketing: Boolean(body?.marketing),
  };
}
