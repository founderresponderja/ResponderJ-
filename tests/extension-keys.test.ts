// RJ-13.3: chaves da extensão de Chrome.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extensionKeyFromHeader, hashExtensionKey, newExtensionKey } from "../server/services/extension-key-logic.ts";
import { randomBytes } from "node:crypto";

test("chave nova tem prefixo, 32 caracteres e é aceite no cabeçalho", () => {
  const key = newExtensionKey((n) => randomBytes(n));
  assert.match(key, /^rjx_[A-Za-z0-9]{32}$/);
  assert.equal(extensionKeyFromHeader(`Bearer ${key}`), key);
});

test("só se guarda a impressão, sempre igual para a mesma chave", () => {
  const key = "rjx_" + "A".repeat(32);
  assert.equal(hashExtensionKey(key), hashExtensionKey(key));
  assert.notEqual(hashExtensionKey(key), key);
  assert.equal(hashExtensionKey(key).length, 64);
});

test("recusa cabeçalhos sem o formato da extensão (ex.: tokens do Clerk)", () => {
  assert.equal(extensionKeyFromHeader("Bearer eyJhbGciOi.xxx.yyy"), null);
  assert.equal(extensionKeyFromHeader("rjx_" + "A".repeat(32)), null);
  assert.equal(extensionKeyFromHeader(undefined), null);
  assert.equal(extensionKeyFromHeader("Bearer rjx_curta"), null);
});
