// RJ-8.3: limites de tempo para caber nos limites da Vercel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withTimeout, TimeoutError, remainingMs, retryOnce } from "../server/utils/timeout.ts";

test("devolve o resultado quando chega a tempo", async () => {
  assert.equal(await withTimeout(Promise.resolve(7), 50, "x"), 7);
});

test("falha com TimeoutError quando passa do limite", async () => {
  const slow = new Promise((r) => setTimeout(() => r(1), 200));
  await assert.rejects(withTimeout(slow, 20, "Gemini"), (e: any) => e instanceof TimeoutError && /Gemini/.test(e.message));
});

test("erros da operação passam tal e qual", async () => {
  await assert.rejects(withTimeout(Promise.reject(new Error("boom")), 50), /boom/);
});

test("tempo restante com margem e nunca negativo", () => {
  assert.equal(remainingMs(10000, 5000, 1000), 4000);
  assert.equal(remainingMs(1000, 5000), 0);
});

test("repete uma vez e depois desiste", async () => {
  let n = 0;
  assert.equal(await retryOnce(async () => { n++; if (n === 1) throw new Error("acordar"); return "ok"; }, 1), "ok");
  let m = 0;
  await assert.rejects(retryOnce(async () => { m++; throw new Error("sempre"); }, 1), /sempre/);
  assert.equal(m, 2);
});
