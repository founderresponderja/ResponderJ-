// "Olá, Customer!": sem nome, a IA não pode usar marcadores.
import { test } from "node:test";
import assert from "node:assert/strict";
import { customerNameInstruction } from "../server/services/customer-name.ts";

test("com nome: usa o primeiro nome", () => {
  const t = customerNameInstruction("Ana Silva");
  assert.match(t, /Customer Name: Ana Silva/);
  assert.match(t, /first name/);
});

test("sem nome ou com nome genérico: proíbe marcadores", () => {
  for (const n of [undefined, "", "  ", "Customer", "Cliente", "Anónimo", "A Google User"]) {
    const t = customerNameInstruction(n as any);
    assert.match(t, /unknown/);
    assert.match(t, /Do NOT invent/);
  }
});
