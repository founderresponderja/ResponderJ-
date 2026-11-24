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
