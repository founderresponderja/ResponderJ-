// RJ-5.6: reporte de erros.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  easterSunday, portugueseHolidays, isBusinessDay, dueDateFor, lisbonDate, SLA_BUSINESS_DAYS,
  normalizeClassification, validateAttachments, base64Bytes, monthlySuccessRate, ackEmail, verifySvixSignature,
} from "../server/services/incident-logic.ts";

test("Páscoa: datas conhecidas", () => {
  assert.deepEqual(easterSunday(2026), { month: 4, day: 5 });
  assert.deepEqual(easterSunday(2027), { month: 3, day: 28 });
  assert.deepEqual(easterSunday(2025), { month: 4, day: 20 });
});

test("feriados nacionais de 2026, incluindo os móveis", () => {
  const h = portugueseHolidays(2026);
  for (const d of ["2026-01-01", "2026-04-03", "2026-04-05", "2026-04-25", "2026-05-01", "2026-06-04", "2026-06-10", "2026-08-15", "2026-10-05", "2026-11-01", "2026-12-01", "2026-12-08", "2026-12-25"]) {
    assert.ok(h.has(d), d);
  }
  assert.equal(h.size, 13);
});

test("dias úteis: fins de semana e feriados não contam", () => {
  assert.ok(isBusinessDay("2026-11-17")); // terça
  assert.ok(!isBusinessDay("2026-11-21")); // sábado
  assert.ok(!isBusinessDay("2026-12-08")); // feriado (terça)
});

test("prazo: crítica criada numa sexta termina na segunda às 23:59 de Lisboa", () => {
  const due = dueDateFor(new Date("2026-11-20T15:00:00Z"), SLA_BUSINESS_DAYS.critical); // sexta
  assert.equal(lisbonDate(due), "2026-11-23");
  assert.equal(due.toISOString(), "2026-11-23T23:59:59.000Z"); // inverno: UTC+0
});

test("prazo salta feriados: média (5 dias úteis) em dezembro de 2026", () => {
  // Criado sexta 4/12; seguintes: 7 (seg), 8 feriado, 9, 10, 11, 14 -> 5.º dia útil = 14/12
  const due = dueDateFor(new Date("2026-12-04T10:00:00Z"), SLA_BUSINESS_DAYS.medium);
  assert.equal(lisbonDate(due), "2026-12-14");
});

test("prazo no verão usa a hora de Lisboa (UTC+1)", () => {
  const due = dueDateFor(new Date("2026-07-06T09:00:00Z"), 1); // segunda
  assert.equal(due.toISOString(), "2026-07-07T22:59:59.000Z");
});

test("classificação da IA: valores inválidos caem para seguros", () => {
  assert.deepEqual(normalizeClassification({ category: "billing", severity: "high", summary: "x", reason: "y" }), { category: "billing", severity: "high", summary: "x", reason: "y" });
  const bad = normalizeClassification({ category: "hack", severity: "urgentíssimo" });
  assert.equal(bad.category, "other");
  assert.equal(bad.severity, "medium");
});

test("anexos: no máximo 2 imagens de até 1 MB", () => {
  assert.equal(validateAttachments([]), null);
  assert.equal(validateAttachments([{ contentType: "image/png", size: 1000 }, { contentType: "image/jpeg", size: 2000 }]), null);
  assert.ok(validateAttachments([{ contentType: "image/png", size: 1 }, { contentType: "image/png", size: 1 }, { contentType: "image/png", size: 1 }]));
  assert.ok(validateAttachments([{ contentType: "application/pdf", size: 10 }]));
  assert.ok(validateAttachments([{ contentType: "image/png", size: 2 * 1024 * 1024 }]));
});

test("tamanho real de base64", () => {
  assert.equal(base64Bytes(Buffer.from("hello").toString("base64")), 5);
  assert.equal(base64Bytes("data:image/png;base64," + Buffer.from("abcd").toString("base64")), 4);
});

test("taxa de sucesso por mês: resolvidos dentro do prazo / resolvidos", () => {
  const s = monthlySuccessRate([
    { createdAt: "2026-11-02T10:00:00Z", dueAt: "2026-11-03T23:59:59Z", resolvedAt: "2026-11-03T10:00:00Z" },
    { createdAt: "2026-11-05T10:00:00Z", dueAt: "2026-11-06T23:59:59Z", resolvedAt: "2026-11-09T10:00:00Z" },
    { createdAt: "2026-11-10T10:00:00Z", dueAt: "2026-11-11T23:59:59Z", resolvedAt: null },
    { createdAt: "2026-10-01T10:00:00Z", dueAt: "2026-10-02T23:59:59Z", resolvedAt: "2026-10-02T10:00:00Z" },
  ]);
  assert.deepEqual(s.map((r) => [r.month, r.total, r.resolved, r.onTime, r.rate]), [
    ["2026-10", 1, 1, 1, 100],
    ["2026-11", 3, 2, 1, 50],
  ]);
});

test("email de confirmação indica o prazo em dias úteis", () => {
  const e = ackEmail({ id: 7, severity: "high", dueAt: new Date("2026-11-19T23:59:59Z") });
  assert.match(e.subject, /#7/);
  assert.match(e.text, /2 dias úteis/);
  assert.match(e.text, /19 de novembro de 2026/);
});

test("webhook do Resend (Svix): assinatura válida, inválida e expirada", () => {
  const secretBytes = crypto.randomBytes(24);
  const secret = "whsec_" + secretBytes.toString("base64");
  const body = '{"type":"email.received"}';
  const ts = "1794950000";
  const sig = crypto.createHmac("sha256", secretBytes).update(`msg_1.${ts}.${body}`).digest("base64");
  const now = 1794950010;
  assert.ok(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, secret, now));
  assert.ok(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature: `v1,zzz v1,${sig}` }, secret, now));
  assert.ok(!verifySvixSignature(body + " ", { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, secret, now));
  assert.ok(!verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, secret, now + 3600));
});
