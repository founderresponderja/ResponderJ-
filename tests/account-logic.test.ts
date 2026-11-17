// RJ-7.1: exportação e apagamento de dados pessoais.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripSecrets, deletionBlockedReason, confirmationMatches, isStripeMissing } from "../server/services/account-logic.ts";
import { memberKeepsOwnIdentity } from "../server/middleware/member-rules.ts";

test("a exportação nunca inclui segredos", () => {
  const out = stripSecrets({ id: 1, email: "a@b.pt", password: "x", accessToken: "t", refreshToken: "r", codeHash: "h", name: "Ana" });
  assert.deepEqual(out, { id: 1, email: "a@b.pt", name: "Ana" });
});

test("operadores, super administrador e sandboxes não apagam a conta por aqui", () => {
  assert.ok(deletionBlockedReason({ isSuperAdmin: true }));
  assert.ok(deletionBlockedReason({ isAdmin: true }));
  assert.ok(deletionBlockedReason({ isSandbox: true }));
  assert.equal(deletionBlockedReason({}), null);
});

test("confirmação: escrever o email da conta", () => {
  assert.ok(confirmationMatches("Ana@Exemplo.pt", "  ana@exemplo.pt "));
  assert.ok(!confirmationMatches("ana@exemplo.pt", "outra@exemplo.pt"));
  assert.ok(!confirmationMatches("ana@exemplo.pt", ""));
  assert.ok(!confirmationMatches("", ""));
});

test("Stripe: cliente ou subscrição que já não existe não trava o apagamento", () => {
  assert.ok(isStripeMissing({ code: "resource_missing" }));
  assert.ok(isStripeMissing({ statusCode: 404 }));
  assert.ok(!isStripeMissing({ code: "api_connection_error" }));
});

test("um membro de equipa exporta e apaga os seus próprios dados, não os da agência", () => {
  assert.ok(memberKeepsOwnIdentity("/api/account/export"));
  assert.ok(memberKeepsOwnIdentity("/api/account/delete"));
});
