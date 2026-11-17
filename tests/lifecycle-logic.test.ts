// RJ-3.3: emails de ciclo de vida.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifecycleEmailsFor, lowCreditsThreshold, lifecycleEmailContent } from "../server/services/lifecycle-logic.ts";

const now = new Date("2026-11-17T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

test("teste a acabar (nas próximas 48 h) e teste acabado (nas últimas 48 h)", () => {
  assert.deepEqual(lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "trial", currentPeriodEnd: inHours(30) }, now).map((e) => e.kind), ["trial_ending"]);
  assert.deepEqual(lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "trial", currentPeriodEnd: inHours(-5) }, now).map((e) => e.kind), ["trial_expired"]);
  assert.deepEqual(lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "trial", currentPeriodEnd: inHours(100) }, now), []);
  assert.deepEqual(lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "trial", currentPeriodEnd: inHours(-100) }, now), []);
});

test("poucos créditos: 10% do plano, no mínimo 5", () => {
  assert.equal(lowCreditsThreshold("starter"), 5);
  assert.equal(lowCreditsThreshold("pro"), 15);
  assert.equal(lowCreditsThreshold("agency"), 50);
  assert.deepEqual(lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "pro", credits: 10, currentPeriodEnd: inHours(200) }, now).map((e) => e.kind), ["low_credits"]);
  assert.deepEqual(lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "pro", credits: 80, currentPeriodEnd: inHours(200) }, now), []);
});

test("a referência é o fim do período (um email por período)", () => {
  const [e] = lifecycleEmailsFor({ email: "a@b.pt", subscriptionPlan: "pro", credits: 0, currentPeriodEnd: "2026-12-01T00:00:00Z" }, now);
  assert.equal(e.ref, "2026-12-01");
});

test("nunca para operadores, sandboxes, contas inativas ou emails .invalid", () => {
  const base = { subscriptionPlan: "trial", currentPeriodEnd: inHours(10) };
  assert.deepEqual(lifecycleEmailsFor({ ...base, email: "a@b.pt", isAdmin: true }, now), []);
  assert.deepEqual(lifecycleEmailsFor({ ...base, email: "a@b.pt", isSandbox: true }, now), []);
  assert.deepEqual(lifecycleEmailsFor({ ...base, email: "a@b.pt", isActive: false }, now), []);
  assert.deepEqual(lifecycleEmailsFor({ ...base, email: "x@sandbox.responderja.invalid" }, now), []);
});

test("conteúdo do email indica o caminho na app", () => {
  const c = lifecycleEmailContent("low_credits", { firstName: "Ana", credits: 3, currentPeriodEnd: "2026-12-01T00:00:00Z" }, "https://www.responderja.pt");
  assert.match(c.text, /Restam 3 respostas/);
  assert.match(c.text, /Olá Ana/);
});
