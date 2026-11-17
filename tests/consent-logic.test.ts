// RJ-7.2: registo de consentimentos com versão do documento.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingDocuments, acceptedRecords, hashIp, cookieChoices } from "../server/services/consent-logic.ts";

const v = { terms: "2026-04-10", privacy: "2026-04-10", cookies: "2026-04-10" };

test("sem registos, termos e privacidade ficam por aceitar", () => {
  assert.deepEqual(pendingDocuments([], v), ["terms", "privacy"]);
});

test("aceitar a versão em vigor resolve; versão antiga obriga a aceitar de novo", () => {
  const rows = [
    { kind: "terms", version: "2026-04-10", granted: true, createdAt: "2026-11-01" },
    { kind: "privacy", version: "2026-01-01", granted: true, createdAt: "2026-11-01" },
  ];
  assert.deepEqual(pendingDocuments(rows, v), ["privacy"]);
});

test("conta o registo mais recente (retirar depois de aceitar volta a pedir)", () => {
  const rows = [
    { kind: "terms", version: "2026-04-10", granted: true, createdAt: "2026-11-01" },
    { kind: "terms", version: "2026-04-10", granted: false, createdAt: "2026-11-05" },
    { kind: "privacy", version: "2026-04-10", granted: true, createdAt: "2026-11-01" },
  ];
  assert.deepEqual(pendingDocuments(rows, v), ["terms"]);
});

test("só documentos conhecidos, sem repetidos, com a versão do servidor", () => {
  const r = acceptedRecords(["terms", "terms", "hack", "privacy"]);
  assert.deepEqual(r.map((x) => x.kind), ["terms", "privacy"]);
  assert.ok(r.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.version)));
  assert.deepEqual(acceptedRecords("terms"), []);
});

test("IP guardado como impressão, não em claro", () => {
  const h = hashIp("1.2.3.4, 10.0.0.1", "s");
  assert.equal(h, hashIp("1.2.3.4", "s"));
  assert.ok(!String(h).includes("1.2.3.4"));
  assert.equal(hashIp(""), null);
});

test("cookies: essenciais sempre ligados, resto só se pedido", () => {
  assert.deepEqual(cookieChoices({ analytics: 1 }), { essential: true, functional: false, analytics: true, marketing: false });
});
