// RJ-13.3: chaves pessoais da extensão de Chrome (regras puras, testáveis).
// A chave só é mostrada uma vez; na base de dados fica apenas a impressão SHA-256.

import { createHash } from "node:crypto";

export const EXTENSION_KEY_PREFIX = "rjx_";
export const MAX_ACTIVE_KEYS = 5;

export function newExtensionKey(randomBytes: (n: number) => Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return EXTENSION_KEY_PREFIX + Array.from(randomBytes(32), (b) => alphabet[b % alphabet.length]).join("");
}

export function hashExtensionKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Lê "Authorization: Bearer rjx_..." e devolve a chave, ou null se não tiver o formato. */
export function extensionKeyFromHeader(header: unknown): string | null {
  const m = String(header || "").match(/^Bearer\s+(rjx_[A-Za-z0-9]{32})$/);
  return m ? m[1] : null;
}
