// Recarregar uma vez quando a app aberta é de uma versão anterior.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isStaleVersionError, shouldReloadNow } from "../utils/staleVersion.ts";

test("reconhece o erro de ficheiro de ecrã antigo", () => {
  assert.ok(isStaleVersionError("Uncaught TypeError: Failed to fetch dynamically imported module: https://www.responderja.pt/assets/LoginPage-BEYld4Gy.js"));
  assert.ok(isStaleVersionError(new Error("Importing a module script failed.")));
  assert.ok(!isStaleVersionError("Cannot read properties of undefined"));
});

test("não recarrega em ciclo", () => {
  assert.ok(shouldReloadNow(null, 1000));
  assert.ok(!shouldReloadNow(1000, 30_000));
  assert.ok(shouldReloadNow(1000, 70_000));
});
