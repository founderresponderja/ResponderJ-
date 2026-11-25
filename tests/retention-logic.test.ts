// RJ-7.3: prazos de conservação.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RETENTION_DAYS, cutoff, cutoffs } from "../server/services/retention-logic.ts";

test("data limite = agora menos o prazo", () => {
  const now = new Date("2026-11-24T03:00:00Z");
  assert.equal(cutoff(now, 90).toISOString(), "2026-08-26T03:00:00.000Z");
  assert.equal(cutoffs(now).auditLog.toISOString(), "2024-11-24T03:00:00.000Z");
});

test("prazos curtos para dados técnicos, mais longos para prova e auditoria", () => {
  assert.ok(RETENTION_DAYS.appErrors <= 90);
  assert.ok(RETENTION_DAYS.oauthStates <= 1);
  assert.ok(RETENTION_DAYS.incidents >= 365);
  assert.ok(RETENTION_DAYS.auditLog >= RETENTION_DAYS.incidents);
});

// Contas gratuitas inativas: aviso 30 dias antes, apagamento só depois do aviso.
import { inactiveAccountAction, inactiveDeletionDate, inactivityRef, inactiveWarningContent } from "../server/services/retention-logic.ts";

const DAY = 24 * 3600 * 1000;
const last = new Date("2025-01-10T09:00:00Z");
const at = (days: number) => new Date(last.getTime() + days * DAY);

test("conta ativa há menos de 11 meses: nada", () => {
  assert.equal(inactiveAccountAction({ lastActivity: last }, at(300)), null);
  assert.equal(inactiveAccountAction({ lastActivity: last }, at(334)), null);
});

test("a partir dos 335 dias sem acesso: aviso", () => {
  assert.equal(inactiveAccountAction({ lastActivity: last }, at(335)), "warn");
  assert.equal(inactiveAccountAction({ lastActivity: last }, at(364)), "warn");
});

test("nunca apaga sem aviso, mesmo passados os 12 meses", () => {
  assert.equal(inactiveAccountAction({ lastActivity: last }, at(400)), "warn");
});

test("apaga aos 12 meses só se o aviso saiu há pelo menos 30 dias", () => {
  assert.equal(inactiveAccountAction({ lastActivity: last, warnedAt: at(335) }, at(364)), null);
  assert.equal(inactiveAccountAction({ lastActivity: last, warnedAt: at(335) }, at(365)), "delete");
  // Aviso atrasado (ex.: email em baixo): espera 30 dias a contar do aviso.
  assert.equal(inactiveAccountAction({ lastActivity: last, warnedAt: at(360) }, at(370)), null);
  assert.equal(inactiveAccountAction({ lastActivity: last, warnedAt: at(360) }, at(390)), "delete");
});

test("se a pessoa voltar a entrar, o período recomeça", () => {
  const relogin = at(340);
  assert.notEqual(inactivityRef(relogin), inactivityRef(last));
  assert.equal(inactiveAccountAction({ lastActivity: relogin }, at(360)), null);
});

test("dados em falta ou inválidos: nada", () => {
  assert.equal(inactiveAccountAction({ lastActivity: null }, at(400)), null);
  assert.equal(inactiveAccountAction({ lastActivity: "não é data" }, at(400)), null);
});

test("data de apagamento e email de aviso", () => {
  assert.equal(inactiveDeletionDate(last).toISOString(), "2026-01-10T09:00:00.000Z");
  const mail = inactiveWarningContent({ firstName: "Ana" }, new Date("2026-01-10T09:00:00Z"), "https://www.responderja.pt");
  assert.match(mail.subject, /apagada por inatividade/);
  assert.match(mail.text, /Olá Ana,/);
  assert.match(mail.text, /10 de janeiro de 2026/);
  assert.match(mail.text, /Descarregar os meus dados/);
});
