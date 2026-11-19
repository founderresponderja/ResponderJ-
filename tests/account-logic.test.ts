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

import { renderExportHtml, escapeHtml } from "../server/services/account-logic.ts";

test("exportação: campos técnicos internos não saem", () => {
  const out = stripSecrets({ email: "a@b.pt", emailVerificationToken: null, passwordResetToken: "x", passwordResetExpires: null, clerkUserId: "user_1" } as any);
  assert.deepEqual(Object.keys(out), ["email"]);
});

test("versão legível: português, secções, datas e texto escapado", () => {
  const html = renderExportHtml({
    about: { exportedAt: "2026-11-18T16:43:23.744Z", legalBasis: "RGPD" },
    account: { email: "ana@x.pt", firstName: "Ana", isActive: true, isAdmin: false },
    reviews: [{ authorName: "<script>alert(1)</script>", rating: 5 }],
    consents: [{ kind: "terms", version: "2026-04-10", granted: true, created_at: "2026-11-18 16:41:48.789971+00" }],
    responses: [],
  });
  assert.match(html, /<html lang="pt-PT">/);
  assert.match(html, /A sua conta/);
  assert.match(html, /Termos e Condições/);
  assert.match(html, /18\/11\/2026/);
  assert.match(html, /Sem dados\./);
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("Is Admin"));
  assert.ok(!html.includes(">user<"));
  assert.equal(escapeHtml(`<a href="x">'`), "&lt;a href=&quot;x&quot;&gt;&#39;");
});
