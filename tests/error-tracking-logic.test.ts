// RJ-8.2: observabilidade.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeForGrouping, errorFingerprint, sanitizeClientError, shouldRecordStatus } from "../server/services/error-tracking-logic.ts";

test("ids, números e emails não separam erros iguais", () => {
  assert.equal(normalizeForGrouping("/api/responses/123/accept"), "/api/responses/:n/accept");
  assert.equal(normalizeForGrouping("user ana@x.pt not found"), "user :email not found");
  const a = errorFingerprint({ source: "server", kind: "http_500", message: "Falha", path: "/api/inbox/12/publish" });
  const b = errorFingerprint({ source: "server", kind: "http_500", message: "Falha", path: "/api/inbox/99/publish" });
  assert.equal(a, b);
  const c = errorFingerprint({ source: "client", kind: "http_500", message: "Falha", path: "/api/inbox/99/publish" });
  assert.notEqual(a, c);
});

test("erros do navegador são cortados e o tipo é validado", () => {
  const s = sanitizeClientError({ kind: "hack", message: "x".repeat(2000), stack: 1 });
  assert.equal(s.kind, "error");
  assert.equal(s.message.length, 500);
  assert.equal(s.stack, "1");
  assert.equal(sanitizeClientError({}).message, "(sem mensagem)");
});

test("só respostas 5xx da API são registadas", () => {
  assert.ok(shouldRecordStatus(500, "/api/generate-response"));
  assert.ok(!shouldRecordStatus(404, "/api/x"));
  assert.ok(!shouldRecordStatus(500, "/login"));
  assert.ok(!shouldRecordStatus(500, "/api/client-errors"));
});
