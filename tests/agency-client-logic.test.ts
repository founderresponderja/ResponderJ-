// RJ-5.8: clientes (negócios) da agência.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateClientInput, canAddClient, canRemoveClient } from "../server/services/agency-client-logic.ts";

test("criar: nome obrigatório e limpo; tom por omissão profissional", () => {
  assert.equal(validateClientInput({ name: "  " }).ok, false);
  const r = validateClientInput({ name: "  Café Central " });
  assert.equal(r.ok, true);
  assert.equal(r.values?.name, "Café Central");
  assert.equal(r.values?.brandTone, "professional");
});

test("tons antigos em português são convertidos; tons e tipos desconhecidos recusados", () => {
  assert.equal(validateClientInput({ name: "X", brandTone: "profissional" }).values?.brandTone, "professional");
  assert.equal(validateClientInput({ name: "X", brandTone: "agressivo" }).ok, false);
  assert.equal(validateClientInput({ name: "X", type: "nave-espacial" }).ok, false);
  assert.equal(validateClientInput({ name: "X", type: "hotel" }).values?.type, "hotel");
});

test("editar: só muda o que vem", () => {
  const r = validateClientInput({ responseGuidelines: "  Tratar por tu  " }, true);
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, { responseGuidelines: "Tratar por tu" });
});

test("limites de texto e logótipo https", () => {
  assert.equal(validateClientInput({ name: "a".repeat(121) }).ok, false);
  assert.equal(validateClientInput({ name: "X", responseGuidelines: "a".repeat(2001) }).ok, false);
  assert.equal(validateClientInput({ name: "X", logoUrl: "javascript:alert(1)" }).ok, false);
  assert.equal(validateClientInput({ name: "X", logoUrl: "https://x.pt/l.png" }).ok, true);
});

test("limite de 5 negócios e nunca remover o último", () => {
  assert.equal(canAddClient(4, 5).ok, true);
  assert.equal(canAddClient(5, 5).ok, false);
  assert.equal(canAddClient(50, -1).ok, true);
  assert.equal(canRemoveClient(1).ok, false);
  assert.equal(canRemoveClient(2).ok, true);
});
